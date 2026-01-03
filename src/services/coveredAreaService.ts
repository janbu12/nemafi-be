import { Prisma } from '@prisma/client';
import { prismaClient } from '../application/prisma.js';
import { checkCoveredAreaValidation, createCoveredAreaValidation } from '../validation/coveredAreaValidation.js';

const DEFAULT_RADIUS_M = 10000; // 10 km default

// --- Fitur untuk Pengguna Publik ---

async function checkAvailability(data: any) {
  const validatedData = checkCoveredAreaValidation.parse(data);
  const radiusToUse = DEFAULT_RADIUS_M;

  const [area] = await prismaClient.$queryRaw<
    Array<{
      id: number;
      province: string;
      city: string;
      district: string;
      village: string;
      radius_m: number | null;
      distance_m: number;
    }>
  >`
    SELECT
      ca.id,
      ca.province,
      ca.city,
      ca.district,
      ca.village,
      ca.radius_m,
      ST_Distance(
        ca.center,
        ST_SetSRID(ST_MakePoint(${validatedData.longitude}, ${validatedData.latitude}), 4326)
      ) AS distance_m
    FROM "CoveredArea" ca
    WHERE ca.center IS NOT NULL
      AND ST_DWithin(
        ca.center,
        ST_SetSRID(ST_MakePoint(${validatedData.longitude}, ${validatedData.latitude}), 4326),
        COALESCE(ca.radius_m, ${radiusToUse})
      )
    ORDER BY distance_m ASC
    LIMIT 1;
  `;

  const isCovered = !!area;
  let distanceKm = area ? area.distance_m / 1000 : undefined;

  if (!isCovered) {
    const [nearest] = await prismaClient.$queryRaw<
      Array<{ distance_m: number; }>
    >`
      SELECT
        ST_Distance(
          ca.center,
          ST_SetSRID(ST_MakePoint(${validatedData.longitude}, ${validatedData.latitude}), 4326)
        ) AS distance_m
      FROM "CoveredArea" ca
      WHERE ca.center IS NOT NULL
      ORDER BY distance_m ASC
      LIMIT 1;
    `;
    distanceKm = nearest ? nearest.distance_m / 1000 : undefined;
  }

  prismaClient.$executeRaw`
    INSERT INTO "CoverageCheckHistory"
      ("fullAddress","province","city","district","village","userLocation","isCovered","checkedAt")
    VALUES
      (${validatedData.fullAddress},
       ${validatedData.province},
       ${validatedData.city},
       ${validatedData.district},
       ${validatedData.village},
       ST_SetSRID(ST_MakePoint(${validatedData.longitude}, ${validatedData.latitude}), 4326),
       ${isCovered},
       NOW()
      )
  `.catch(err => console.error("Failed to save coverage history:", err));

  if (isCovered) {
    return { isAvailable: true, message: 'Bagus! Area Anda tercakup dalam layanan kami.', distanceKm };
  } else {
    return { isAvailable: false, message: 'Maaf, area Anda belum tercakup. Kami telah mencatat permintaan Anda untuk perluasan di masa mendatang.', distanceKm };
  }
}

async function checkAvailabilityNoHistory(data: any) {
  const validatedData = checkCoveredAreaValidation.parse(data);
  const radiusToUse = DEFAULT_RADIUS_M;

  const [area] = await prismaClient.$queryRaw<
    Array<{
      id: number;
      province: string;
      city: string;
      district: string;
      village: string;
      radius_m: number | null;
      distance_m: number;
    }>
  >`
    SELECT
      ca.id,
      ca.province,
      ca.city,
      ca.district,
      ca.village,
      ca.radius_m,
      ST_Distance(
        ca.center,
        ST_SetSRID(ST_MakePoint(${validatedData.longitude}, ${validatedData.latitude}), 4326)
      ) AS distance_m
    FROM "CoveredArea" ca
    WHERE ca.center IS NOT NULL
      AND ST_DWithin(
        ca.center,
        ST_SetSRID(ST_MakePoint(${validatedData.longitude}, ${validatedData.latitude}), 4326),
        COALESCE(ca.radius_m, ${radiusToUse})
      )
    ORDER BY distance_m ASC
    LIMIT 1;
  `;

  const isCovered = !!area;
  let distanceKm = area ? area.distance_m / 1000 : undefined;

  if (!isCovered) {
    const [nearest] = await prismaClient.$queryRaw<
      Array<{ distance_m: number; }>
    >`
      SELECT
        ST_Distance(
          ca.center,
          ST_SetSRID(ST_MakePoint(${validatedData.longitude}, ${validatedData.latitude}), 4326)
        ) AS distance_m
      FROM "CoveredArea" ca
      WHERE ca.center IS NOT NULL
      ORDER BY distance_m ASC
      LIMIT 1;
    `;
    distanceKm = nearest ? nearest.distance_m / 1000 : undefined;
  }

  if (isCovered) {
    return { isAvailable: true, message: 'Bagus! Area pelanggan tercakup.', distanceKm };
  }
  return { isAvailable: false, message: 'Area pelanggan belum tercakup.', distanceKm };
}

// --- Fitur untuk Admin ---

async function addCoveredArea(data: any) {
  const validatedData = createCoveredAreaValidation.parse(data);
  const radius_m = validatedData.radius_m ?? DEFAULT_RADIUS_M;
  try {
    const newArea = await prismaClient.$transaction(async (tx) => {
      const area = await tx.coveredArea.create({
        data: {
          province: validatedData.province,
          city: validatedData.city,
          district: validatedData.district,
          village: validatedData.village,
          fullAddress: validatedData.fullAddress,
          radius_m,
        },
      });

      await tx.$executeRaw`
        UPDATE "CoveredArea"
        SET center = ST_SetSRID(ST_MakePoint(${validatedData.longitude}, ${validatedData.latitude}), 4326)
        WHERE id = ${area.id}
      `;

      return { ...area, radius_m };
    });
    return newArea;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      throw { status: 409, message: 'Area cakupan ini sudah ada di dalam database.' };
    }
    throw e;
  }
}

async function updateCoveredArea(id: number, data: any) {
  const validatedData = createCoveredAreaValidation.parse(data);
  const radius_m = validatedData.radius_m ?? DEFAULT_RADIUS_M;

  const exists = await prismaClient.coveredArea.findUnique({ where: { id } });
  if (!exists) {
    throw { status: 404, message: 'Covered area not found' };
  }

  const updated = await prismaClient.$transaction(async (tx) => {
    const area = await tx.coveredArea.update({
      where: { id },
      data: {
        province: validatedData.province,
        city: validatedData.city,
        district: validatedData.district,
        village: validatedData.village,
        fullAddress: validatedData.fullAddress,
        radius_m,
      },
    });

    await tx.$executeRaw`
      UPDATE "CoveredArea"
      SET center = ST_SetSRID(ST_MakePoint(${validatedData.longitude}, ${validatedData.latitude}), 4326)
      WHERE id = ${area.id}
    `;

    return { ...area, radius_m };
  });

  return updated;
}

async function getAllCoveredAreas() {
  return prismaClient.$queryRaw<
    Array<{
      id: number;
      province: string;
      city: string;
      district: string;
      village: string;
      fullAddress: string | null;
      radius_m: number | null;
      latitude: number | null;
      longitude: number | null;
      createdAt: Date;
    }>
  >`
    SELECT
      id,
      province,
      city,
      district,
      village,
      "fullAddress",
      radius_m,
      "createdAt",
      ST_Y(center::geometry) AS latitude,
      ST_X(center::geometry) AS longitude
    FROM "CoveredArea"
    ORDER BY "createdAt" DESC
  `;
}

async function deleteCoveredArea(id: number) {
  return prismaClient.coveredArea.delete({ where: { id } });
}

async function getCheckHistory() {
    const history = await prismaClient.$queryRaw<
      Array<{
        id: number;
        fullAddress: string;
        province: string;
        city: string;
        district: string;
        village: string;
        isCovered: boolean;
        checkedAt: Date;
        latitude: number | null;
        longitude: number | null;
      }>
    >`
      SELECT
        id,
        "fullAddress",
        province,
        city,
        district,
        village,
        "isCovered",
        "checkedAt",
        ST_Y("userLocation"::geometry) AS latitude,
        ST_X("userLocation"::geometry) AS longitude
      FROM "CoverageCheckHistory"
      ORDER BY "checkedAt" DESC
    `;

    const totalCovered = history.filter(h => h.isCovered).length;
    const totalUncovered = history.length - totalCovered;

    const byCity: Record<string, { covered: number; uncovered: number }> = {};
    const byDistrict: Record<string, { city: string; covered: number; uncovered: number }> = {};

    history.forEach(h => {
      if (!byCity[h.city]) byCity[h.city] = { covered: 0, uncovered: 0 };
      h.isCovered ? byCity[h.city].covered++ : byCity[h.city].uncovered++;

      const districtKey = `${h.city}::${h.district}`;
      if (!byDistrict[districtKey]) byDistrict[districtKey] = { city: h.city, covered: 0, uncovered: 0 };
      h.isCovered ? byDistrict[districtKey].covered++ : byDistrict[districtKey].uncovered++;
    });

    return {
      history,
      stats: {
        totalCovered,
        totalUncovered,
        byCity: Object.entries(byCity).map(([city, v]) => ({ city, covered: v.covered, uncovered: v.uncovered })),
        byDistrict: Object.entries(byDistrict).map(([key, v]) => {
          const [, district] = key.split("::");
          return { city: v.city, district, covered: v.covered, uncovered: v.uncovered };
        }),
      },
    };
}

export default {
  checkAvailability,
  checkAvailabilityNoHistory,
  addCoveredArea,
  updateCoveredArea,
  getAllCoveredAreas,
  deleteCoveredArea,
  getCheckHistory
};

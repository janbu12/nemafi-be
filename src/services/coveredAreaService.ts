import { Prisma } from '@prisma/client';
import { prismaClient } from '../application/prisma.js';
import { checkCoveredAreaValidation, createCoveredAreaValidation } from '../validation/coveredAreaValidation.js';

// --- Fitur untuk Pengguna Publik ---

async function checkAvailability(data: any) {
  const validatedData = checkCoveredAreaValidation.parse(data);

  const area = await prismaClient.coveredArea.findFirst({
    where: {
      province: { equals: validatedData.province, mode: 'insensitive' },
      city: { equals: validatedData.city, mode: 'insensitive' },
      district: { equals: validatedData.district, mode: 'insensitive' },
      village: { equals: validatedData.village, mode: 'insensitive' },
    },
  });

  const isCovered = !!area;

  prismaClient.coverageCheckHistory.create({
    data: {
      ...validatedData,
      isCovered: isCovered,
    },
  }).catch(err => console.error("Failed to save coverage history:", err));

  if (isCovered) {
    return { isAvailable: true, message: 'Great! Your area is covered by our service.' };
  } else {
    return { isAvailable: false, message: 'Sorry, your area is not yet covered. We have noted your request for future expansion.' };
  }
}

// --- Fitur untuk Admin ---

async function addCoveredArea(data: any) {
  const validatedData = createCoveredAreaValidation.parse(data);
  try {
    const newArea = await prismaClient.coveredArea.create({ data: validatedData });
    return newArea;
  } catch (e) {
    // error duplikat data inputan
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      throw { status: 409, message: 'Area cakupan ini sudah ada di dalam database.' };
    }
    throw e;
  }
}

async function getAllCoveredAreas() {
  return prismaClient.coveredArea.findMany({
    orderBy: { createdAt: 'desc' },
  });
}

async function deleteCoveredArea(id: number) {
  return prismaClient.coveredArea.delete({ where: { id } });
}

async function getCheckHistory() {
    return prismaClient.coverageCheckHistory.findMany({
        orderBy: { checkedAt: 'desc' },
    });
}

export default {
  checkAvailability,
  addCoveredArea,
  getAllCoveredAreas,
  deleteCoveredArea,
  getCheckHistory
};
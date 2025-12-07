import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Clean up existing data
  await prisma.coverageCheckHistory.deleteMany({});
  await prisma.coveredArea.deleteMany({});
  await prisma.package.deleteMany({});
  await prisma.categoryPackage.deleteMany({});
  await prisma.user.deleteMany({});

  // Seed Users
  await prisma.user.createMany({
    data: [
      { email: 'admin@example.com', fullname: 'Admin', password: bcrypt.hashSync('password123', 10), role: "TECH_ADMIN"},
      { email: 'tech@example.com', fullname: 'Tech', password: bcrypt.hashSync('password123', 10), role: "TECHNICIAN"},
      { email: 'user@example.com', fullname: 'User', password: bcrypt.hashSync('password123', 10), role: "CUSTOMER"},
    ],
    skipDuplicates: true,
  });

  // Seed Categories
  const residential = await prisma.categoryPackage.create({
    data: { name: 'Residential' },
  });

  const business = await prisma.categoryPackage.create({
    data: { name: 'Business' },
  });

  const soho = await prisma.categoryPackage.create({
    data: { name: 'SOHO' },
  });

  // Seed Packages
  const packages = [
    // Residential Packages
    {
      name: 'Home Basic',
      price: 250000,
      description: 'Paket internet cepat untuk kebutuhan rumah tangga.',
      categoryId: residential.id,
      metadata: { download_speed: 50, upload_speed: 10, unlimited_quota: true },
    },
    {
      name: 'Home Premium',
      price: 400000,
      description: 'Internet super cepat untuk streaming dan gaming.',
      categoryId: residential.id,
      metadata: { download_speed: 100, upload_speed: 20, unlimited_quota: true, free_iptv: true },
    },
    // Business Packages
    {
      name: 'Business Starter',
      price: 600000,
      description: 'Koneksi internet stabil untuk bisnis Anda.',
      categoryId: business.id,
      metadata: { download_speed: 150, upload_speed: 50, dedicated_support: true, static_ip: true },
    },
    // SOHO Packages
    {
      name: 'SOHO Power',
      price: 500000,
      description: 'Solusi internet untuk Small Office Home Office.',
      categoryId: soho.id,
      metadata: { download_speed: 100, upload_speed: 25, unlimited_quota: true },
    },
  ];

  for (const pkg of packages) {
    await prisma.package.create({ data: pkg });
  }

  // --- Seed Covered Areas ---
  const coveredAreas = [
    {
      province: 'DKI Jakarta',
      city: 'Jakarta Selatan',
      district: 'Kebayoran Baru',
      village: 'Senayan',
      latitude: -6.2250,
      longitude: 106.8020,
      radius_m: 10000,
    },
    {
      province: 'DKI Jakarta',
      city: 'Jakarta Selatan',
      district: 'Kebayoran Baru',
      village: 'Selong',
      latitude: -6.2444,
      longitude: 106.8054,
      radius_m: 10000,
    },
    {
      province: 'Jawa Barat',
      city: 'Kota Bandung',
      district: 'Sukajadi',
      village: 'Pasteur',
      latitude: -6.8893,
      longitude: 107.5952,
      radius_m: 10000,
    },
     {
      province: 'Jawa Barat',
      city: 'Kota Bandung',
      district: 'Coblong',
      village: 'Dago',
      latitude: -6.8896,
      longitude: 107.6191,
      radius_m: 10000,
    }
  ];

  for (const area of coveredAreas) {
    const created = await prisma.coveredArea.upsert({
      where: {
        unique_area_constraint: {
          province: area.province,
          city: area.city,
          district: area.district,
          village: area.village,
        }
      },
      create: {
        province: area.province,
        city: area.city,
        district: area.district,
        village: area.village,
        radius_m: area.radius_m,
      },
      update: {
        radius_m: area.radius_m,
      },
    });

    await prisma.$executeRawUnsafe(`
      UPDATE "CoveredArea"
      SET center = ST_SetSRID(ST_MakePoint(${area.longitude}, ${area.latitude}), 4326)
      WHERE id = ${created.id};
    `);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('✅ Seeding selesai!');
  })
  .catch(async (e) => {
    console.error('❌ Seeding error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });

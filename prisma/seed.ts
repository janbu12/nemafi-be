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
    },
    {
      province: 'DKI Jakarta',
      city: 'Jakarta Selatan',
      district: 'Kebayoran Baru',
      village: 'Selong',
    },
    {
      province: 'Jawa Barat',
      city: 'Kota Bandung',
      district: 'Sukajadi',
      village: 'Pasteur',
    },
     {
      province: 'Jawa Barat',
      city: 'Kota Bandung',
      district: 'Coblong',
      village: 'Dago',
    }
  ];

  await prisma.coveredArea.createMany({
    data: coveredAreas,
    skipDuplicates: true,
  });
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
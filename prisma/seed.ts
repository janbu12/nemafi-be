import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Clean up existing data
  await prisma.ticketHistory.deleteMany({});
  await prisma.ticket.deleteMany({});
  await prisma.ticketCategory.deleteMany({});
  await prisma.inventoryItem.deleteMany({});
  await prisma.inventoryCategory.deleteMany({});
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
      { email: 'tech2@example.com', fullname: 'Tech Member 1', password: bcrypt.hashSync('password123', 10), role: "TECHNICIAN"},
      { email: 'tech3@example.com', fullname: 'Tech Member 2', password: bcrypt.hashSync('password123', 10), role: "TECHNICIAN"},
      { email: 'user@example.com', fullname: 'User', password: bcrypt.hashSync('password123', 10), role: "CUSTOMER"},
    ],
    skipDuplicates: true,
  });

  // Seed Ticket Categories
  await prisma.ticketCategory.createMany({
    data: [
      { name: 'registrasi', isExpirable: true, expireHours: 24, requiresTechnician: false },
      { name: 'survey', requiresTechnician: false },
      { name: 'instalasi', requiresTechnician: true },
      { name: 'customer', requiresTechnician: false },
      { name: 'technician', requiresTechnician: true },
      { name: 'termination', requiresTechnician: false },
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
      downloadSpeed: 20.0,
      uploadSpeed: 5.0,
      isPopular: true,
      metadata: { unlimited_quota: true },
    },
    {
      name: 'Home Premium',
      price: 400000,
      description: 'Internet super cepat untuk streaming dan gaming.',
      categoryId: residential.id,
      downloadSpeed: 100.0,
      uploadSpeed: 20.0,
      isPopular: true,
      metadata: { unlimited_quota: true, free_iptv: true },
    },
    // Business Packages
    {
      name: 'Business Starter',
      price: 600000,
      description: 'Koneksi internet stabil untuk bisnis Anda.',
      categoryId: business.id,
      downloadSpeed: 150.0,
      uploadSpeed: 50.0,
      isPopular: true,
      metadata: { dedicated_support: true, static_ip: true },
    },
    // SOHO Packages
    {
      name: 'SOHO Power',
      price: 500000,
      description: 'Solusi internet untuk Small Office Home Office.',
      categoryId: soho.id,
      downloadSpeed: 100,
      uploadSpeed: 25,
      isPopular: true,
      metadata: { unlimited_quota: true },
    },
  ];

  for (const pkg of packages) {
    await prisma.package.create({ data: pkg });
  }

  // Seed Inventory Categories
  const inventoryCategories = await prisma.inventoryCategory.createMany({
    data: [
      { name: 'Tiang' },
      { name: 'Kabel' },
      { name: 'Router' },
      { name: 'Konektor' },
      { name: 'Splitter' },
      { name: 'ODP/ONT/ONU' },
      { name: 'Aksesoris' },
    ],
    skipDuplicates: true,
  });

  const categoryMap = await prisma.inventoryCategory.findMany();
  const findCategoryId = (name: string) => categoryMap.find((c) => c.name === name)?.id as number;

  // Seed Inventory Items
  const inventoryItems = [
    { name: 'Tiang Besi 7m', stock: 50, unit: 'buah', categoryId: findCategoryId('Tiang') },
    { name: 'Kabel Fiber Optik 12 Core', stock: 2500, unit: 'meter', categoryId: findCategoryId('Kabel') },
    { name: 'Router WiFi Dual Band', stock: 120, unit: 'buah', categoryId: findCategoryId('Router') },
    { name: 'Konektor SC/UPC', stock: 500, unit: 'buah', categoryId: findCategoryId('Konektor') },
    { name: 'Splitter PLC 1:8', stock: 80, unit: 'buah', categoryId: findCategoryId('Splitter') },
    { name: 'ODP 8 Port', stock: 30, unit: 'buah', categoryId: findCategoryId('ODP/ONT/ONU') },
    { name: 'Clamp Tiang Fiber', stock: 200, unit: 'buah', categoryId: findCategoryId('Aksesoris') },
    { name: 'Kabel Drop Core', stock: 1500, unit: 'meter', categoryId: findCategoryId('Kabel') },
    { name: 'ONT Modem', stock: 95, unit: 'buah', categoryId: findCategoryId('ODP/ONT/ONU') },
  ];

  for (const item of inventoryItems) {
    if (!item.categoryId) continue;
    await prisma.inventoryItem.create({ data: item });
  }

  // --- Seed Covered Areas ---
  const coveredAreas = [
    {
      province: 'DKI Jakarta',
      city: 'Jakarta Selatan',
      district: 'Kebayoran Baru',
      village: 'Senayan',
      fullAddress: 'Senayan, Kebayoran Baru, Jakarta Selatan, DKI Jakarta',
      latitude: -6.2250,
      longitude: 106.8020,
      radius_m: 10000,
    },
    {
      province: 'DKI Jakarta',
      city: 'Jakarta Selatan',
      district: 'Kebayoran Baru',
      village: 'Selong',
      fullAddress: 'Selong, Kebayoran Baru, Jakarta Selatan, DKI Jakarta',
      latitude: -6.2444,
      longitude: 106.8054,
      radius_m: 10000,
    },
    {
      province: 'Jawa Barat',
      city: 'Kota Bandung',
      district: 'Sukajadi',
      village: 'Pasteur',
      fullAddress: 'Pasteur, Sukajadi, Kota Bandung, Jawa Barat',
      latitude: -6.8893,
      longitude: 107.5952,
      radius_m: 10000,
    },
     {
      province: 'Jawa Barat',
      city: 'Kota Bandung',
      district: 'Coblong',
      village: 'Dago',
      fullAddress: 'Dago, Coblong, Kota Bandung, Jawa Barat',
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
        fullAddress: area.fullAddress,
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

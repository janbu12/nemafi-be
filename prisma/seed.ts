import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Clean up existing data
  await prisma.ticketHistory.deleteMany({});
  await prisma.ticketMember.deleteMany({});
  await prisma.ticketSurvey.deleteMany({});
  await prisma.ticket.deleteMany({});
  await prisma.billingInvoice.deleteMany({});
  await prisma.billingSetting.deleteMany({});
  await prisma.appSetting.deleteMany({});
  await prisma.suspensionHistory.deleteMany({});
  await prisma.packageHistory.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.profile.deleteMany({});
  await prisma.ticketCategory.deleteMany({});
  await prisma.inventoryItem.deleteMany({});
  await prisma.inventoryCategory.deleteMany({});
  await prisma.coverageCheckHistory.deleteMany({});
  await prisma.coveredArea.deleteMany({});
  await prisma.router.deleteMany({});
  await prisma.package.deleteMany({});
  await prisma.categoryPackage.deleteMany({});
  await prisma.user.deleteMany({});

  await prisma.billingSetting.create({
    data: {
      automationEnabled: process.env.ENABLE_BILLING_AUTOMATION === 'true',
      suspendCron: process.env.BILLING_SUSPEND_CRON || '0 * * * *',
      renewCron: process.env.BILLING_RENEW_CRON || '10 0 1 * *',
      graceDays: 3,
      dueDays: 7,
      periodDays: 30,
    },
  });

  await prisma.appSetting.createMany({
    data: [
      { key: 'MIDTRANS_SERVER_KEY', value: process.env.MIDTRANS_SERVER_KEY || '', group: 'midtrans', type: 'secret', isSecret: true },
      { key: 'GEMINI_API_KEY', value: process.env.GEMINI_API_KEY || '', group: 'gemini', type: 'secret', isSecret: true },
      { key: 'GEMINI_MODEL', value: process.env.GEMINI_MODEL || 'gemini-2.5-flash', group: 'gemini', type: 'text', isSecret: false },
      { key: 'MIKROTIK_SIMULATION', value: process.env.MIKROTIK_SIMULATION || 'true', group: 'mikrotik', type: 'boolean', isSecret: false },
      { key: 'R2_ACCOUNT_ID', value: process.env.R2_ACCOUNT_ID || '', group: 'r2', type: 'text', isSecret: false },
      { key: 'R2_ACCESS_KEY_ID', value: process.env.R2_ACCESS_KEY_ID || '', group: 'r2', type: 'secret', isSecret: true },
      { key: 'R2_SECRET_ACCESS_KEY', value: process.env.R2_SECRET_ACCESS_KEY || '', group: 'r2', type: 'secret', isSecret: true },
      { key: 'R2_BUCKET', value: process.env.R2_BUCKET || '', group: 'r2', type: 'text', isSecret: false },
      { key: 'R2_PUBLIC_BASE_URL', value: process.env.R2_PUBLIC_BASE_URL || '', group: 'r2', type: 'text', isSecret: false },
    ],
    skipDuplicates: true,
  });

  // Seed Users
  await prisma.user.createMany({
    data: [
      { email: 'superadmin@example.com', fullname: 'Super Admin', password: bcrypt.hashSync('password123', 10), role: "SUPER_ADMIN"},
      { email: 'admin@example.com', fullname: 'Admin', password: bcrypt.hashSync('password123', 10), role: "TECH_ADMIN"},
      { email: 'tech@example.com', fullname: 'Tech', password: bcrypt.hashSync('password123', 10), role: "TECHNICIAN"},
      { email: 'tech2@example.com', fullname: 'Tech Member 1', password: bcrypt.hashSync('password123', 10), role: "TECHNICIAN"},
      { email: 'tech3@example.com', fullname: 'Tech Member 2', password: bcrypt.hashSync('password123', 10), role: "TECHNICIAN"},
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
    },
    {
      province: 'Jawa Barat',
      city: 'Kota Bandung',
      district: 'Cidadap',
      village: 'Ciumbuleuit',
      fullAddress: 'Ciumbuleuit, Cidadap, Kota Bandung, Jawa Barat',
      latitude: -6.8722,
      longitude: 107.6048,
      radius_m: 10000,
    },
    {
      province: 'Jawa Barat',
      city: 'Kota Bandung',
      district: 'Arcamanik',
      village: 'Cisaranten Kulon',
      fullAddress: 'Cisaranten Kulon, Arcamanik, Kota Bandung, Jawa Barat',
      latitude: -6.9141,
      longitude: 107.6717,
      radius_m: 10000,
    },
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

  const adminUser = await prisma.user.findUnique({ where: { email: 'admin@example.com' } });
  const techLeader = await prisma.user.findUnique({ where: { email: 'tech@example.com' } });
  const ticketCategories = await prisma.ticketCategory.findMany();
  const categoryByName = (name: string) => ticketCategories.find((cat) => cat.name === name)?.id as number;
  const packageList = await prisma.package.findMany();
  const packageByName = (name: string) => packageList.find((pkg) => pkg.name === name) as (typeof packageList)[number];
  const inventoryList = await prisma.inventoryItem.findMany();
  const inventoryByName = (name: string) => inventoryList.find((item) => item.name === name);

  const router = await prisma.router.create({
    data: {
      name: 'Mikrotik Simulator',
      host: 'SIMULATION',
      user: 'simulator',
      password: 'simulator',
      portApi: 8728,
      portSsh: 22,
    },
  });

  const now = new Date('2026-01-15T08:00:00.000Z');
  const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  const customers = [
    {
      fullname: 'Mizan Nur',
      email: 'mizan@example.com',
      phone: '081234567801',
      address: 'Jl. Cisaranten Endah No. 25',
      province: 'Jawa Barat',
      city: 'Kota Bandung',
      district: 'Arcamanik',
      subdistrict: 'Cisaranten Kulon',
      latitude: -6.9152,
      longitude: 107.6761,
      packageName: 'Home Premium',
      active: false,
      overdue: true,
    },
    {
      fullname: 'Rina Putri',
      email: 'rina@example.com',
      phone: '081234567802',
      address: 'Jl. Sukajadi No. 88',
      province: 'Jawa Barat',
      city: 'Kota Bandung',
      district: 'Sukajadi',
      subdistrict: 'Pasteur',
      latitude: -6.8899,
      longitude: 107.5982,
      packageName: 'Home Basic',
      active: false,
      overdue: true,
    },
    {
      fullname: 'Agus Santoso',
      email: 'agus@example.com',
      phone: '081234567803',
      address: 'Jl. Ciumbuleuit No. 102',
      province: 'Jawa Barat',
      city: 'Kota Bandung',
      district: 'Cidadap',
      subdistrict: 'Ciumbuleuit',
      latitude: -6.8727,
      longitude: 107.6071,
      packageName: 'SOHO Power',
      active: true,
      overdue: false,
    },
    {
      fullname: 'Dewi Lestari',
      email: 'dewi@example.com',
      phone: '081234567804',
      address: 'Jl. Dago Atas No. 14',
      province: 'Jawa Barat',
      city: 'Kota Bandung',
      district: 'Coblong',
      subdistrict: 'Dago',
      latitude: -6.8894,
      longitude: 107.6178,
      packageName: 'Business Starter',
      active: true,
      overdue: false,
    },
    {
      fullname: 'Yoga Pratama',
      email: 'yoga@example.com',
      phone: '081234567805',
      address: 'Jl. Terusan Sulaksana No. 9',
      province: 'Jawa Barat',
      city: 'Kota Bandung',
      district: 'Arcamanik',
      subdistrict: 'Cisaranten Kulon',
      latitude: -6.9181,
      longitude: 107.6704,
      packageName: 'Home Basic',
      active: false,
      overdue: true,
    },
  ];

  for (const [index, customer] of customers.entries()) {
    const pkg = packageByName(customer.packageName);
    const password = bcrypt.hashSync('password123', 10);
    const user = await prisma.user.create({
      data: {
        email: customer.email,
        fullname: customer.fullname,
        password,
        role: 'CUSTOMER',
      },
    });

    const pppUsername = `ppp-${user.id}`;
    const pppPassword = `ppp-${user.id}-pass`;

    await prisma.profile.create({
      data: {
        user_id: user.id,
        phone_number: customer.phone,
        full_address: customer.address,
        province: customer.province,
        city: customer.city,
        district: customer.district,
        subdistrict: customer.subdistrict,
        latitude: customer.latitude,
        longitude: customer.longitude,
        routerId: router.id,
        pppUsername,
        pppPassword,
        pppProfile: pkg?.name || customer.packageName,
        isPppActive: customer.active,
        image_url: index % 2 === 0 ? 'https://i.pravatar.cc/150?img=47' : undefined,
      },
    });

    const order = await prisma.order.create({
      data: {
        userId: user.id,
        total: pkg.price,
        status: 'COMPLETED',
        reviewedBy: adminUser?.id ?? null,
        reviewedAt: daysAgo(25),
        items: { create: { packageId: pkg.id } },
      },
    });

    await prisma.packageHistory.create({
      data: {
        userId: user.id,
        packageId: pkg.id,
        startedAt: daysAgo(60),
        reason: 'Langganan awal',
      },
    });

    const invoiceBaseDate = new Date('2026-01-01T00:00:00.000Z');
    const invoices = [
      {
        userId: user.id,
        amount: pkg.price,
        periodStart: new Date('2025-11-01T00:00:00.000Z'),
        periodEnd: new Date('2025-11-30T23:59:59.000Z'),
        dueAt: new Date('2025-12-05T23:59:59.000Z'),
        status: 'PAID',
        paidAt: new Date('2025-12-01T10:00:00.000Z'),
      },
      {
        userId: user.id,
        amount: pkg.price,
        periodStart: new Date('2025-12-01T00:00:00.000Z'),
        periodEnd: new Date('2025-12-31T23:59:59.000Z'),
        dueAt: new Date('2026-01-05T23:59:59.000Z'),
        status: customer.overdue ? 'UNPAID' : 'PAID',
        paidAt: customer.overdue ? null : new Date('2026-01-02T12:00:00.000Z'),
      },
      {
        userId: user.id,
        amount: pkg.price,
        periodStart: invoiceBaseDate,
        periodEnd: new Date('2026-01-31T23:59:59.000Z'),
        dueAt: new Date('2026-02-05T23:59:59.000Z'),
        status: customer.overdue ? 'OVERDUE' : 'UNPAID',
        paidAt: null,
      },
    ];

    await prisma.billingInvoice.createMany({ data: invoices });

    if (!customer.active) {
      await prisma.suspensionHistory.create({
        data: {
          userId: user.id,
          reason: 'Tagihan menunggak lebih dari 7 hari',
          suspendedAt: daysAgo(5),
        },
      });
    }

    const registrasiTicket = await prisma.ticket.create({
      data: {
        orderId: order.id,
        title: 'Tiket registrasi',
        description: 'Registrasi pelanggan baru',
        categoryId: categoryByName('registrasi'),
        status: 'CLOSED',
        paymentStatus: 'PAID',
        paidAt: daysAgo(40),
      },
    });

    const surveyTicket = await prisma.ticket.create({
      data: {
        orderId: order.id,
        title: 'Tiket survey instalasi',
        description: 'Survey kebutuhan instalasi',
        categoryId: categoryByName('survey'),
        status: 'CLOSED',
        paymentStatus: 'PAID',
        paidAt: daysAgo(39),
      },
    });

    const installationTicket = await prisma.ticket.create({
      data: {
        orderId: order.id,
        title: 'Tiket instalasi',
        description: 'Instalasi perangkat dan aktivasi PPPoE',
        categoryId: categoryByName('instalasi'),
        status: 'RESOLVED',
        paymentStatus: 'PAID',
        paidAt: daysAgo(39),
        technicianId: techLeader?.id ?? null,
        scheduledAt: daysAgo(35),
      },
    });

    const plannedItems = [
      inventoryByName('Kabel Fiber Optik 12 Core'),
      inventoryByName('Router WiFi Dual Band'),
      inventoryByName('ONT Modem'),
    ]
      .filter(Boolean)
      .map((item, idx) => ({
        inventoryItemId: item?.id,
        name: item?.name,
        unit: item?.unit,
        quantity: idx === 0 ? 120 : 1,
      }));

    const actualItems = [
      inventoryByName('Kabel Drop Core'),
      inventoryByName('Router WiFi Dual Band'),
    ]
      .filter(Boolean)
      .map((item, idx) => ({
        inventoryItemId: item?.id,
        name: item?.name,
        unit: item?.unit,
        quantity: idx === 0 ? 90 : 1,
      }));

    await prisma.ticketSurvey.create({
      data: {
        surveyTicketId: surveyTicket.id,
        installationTicketId: installationTicket.id,
        plannedItems,
        actualItems,
        notes: 'Survey dan instalasi berjalan lancar.',
      },
    });

    await prisma.ticketHistory.createMany({
      data: [
        {
          ticketId: registrasiTicket.id,
          action: 'Ticket created',
          description: 'Tiket registrasi dibuat saat pendaftaran.',
          actorType: 'CUSTOMER',
          actorId: user.id,
          createdAt: daysAgo(40),
        },
        {
          ticketId: registrasiTicket.id,
          action: 'Payment completed',
          description: 'Pembayaran berhasil, registrasi dikonfirmasi.',
          actorType: 'SYSTEM',
          createdAt: daysAgo(39),
        },
        {
          ticketId: registrasiTicket.id,
          action: 'Status changed to CLOSED',
          description: 'Registrasi selesai.',
          actorType: 'SYSTEM',
          createdAt: daysAgo(38),
        },
        {
          ticketId: registrasiTicket.id,
          action: 'Survey ticket created',
          description: `Tiket survey #${surveyTicket.id} dibuat.`,
          actorType: 'SYSTEM',
          createdAt: daysAgo(38),
        },
        {
          ticketId: surveyTicket.id,
          action: 'Ticket created',
          description: 'Tiket survey dibuat setelah pembayaran.',
          actorType: 'SYSTEM',
          createdAt: daysAgo(38),
        },
        {
          ticketId: surveyTicket.id,
          action: 'Survey completed',
          description: 'Survey instalasi selesai.',
          actorType: 'ADMIN',
          actorId: adminUser?.id ?? null,
          createdAt: daysAgo(37),
        },
        {
          ticketId: installationTicket.id,
          action: 'Ticket created',
          description: 'Tiket instalasi dibuat setelah survey.',
          actorType: 'SYSTEM',
          createdAt: daysAgo(37),
        },
        {
          ticketId: installationTicket.id,
          action: 'Technician assigned',
          description: `Technician: ${techLeader?.fullname ?? 'Teknisi'}`,
          actorType: 'ADMIN',
          actorId: adminUser?.id ?? null,
          createdAt: daysAgo(36),
        },
        {
          ticketId: installationTicket.id,
          action: 'Schedule updated',
          description: `Dijadwalkan pada ${daysAgo(35).toISOString()}`,
          actorType: 'ADMIN',
          actorId: adminUser?.id ?? null,
          createdAt: daysAgo(36),
        },
        {
          ticketId: installationTicket.id,
          action: 'Status changed to RESOLVED',
          description: 'Instalasi selesai, layanan aktif.',
          actorType: 'TECHNICIAN',
          actorId: techLeader?.id ?? null,
          createdAt: daysAgo(34),
        },
      ],
    });

    const supportTicket = await prisma.ticket.create({
      data: {
        orderId: order.id,
        title: 'Tiket dukungan',
        description: 'Gangguan ringan pada WiFi setelah hujan deras.',
        categoryId: categoryByName('customer'),
        status: 'OPEN',
        paymentStatus: 'PAID',
      },
    });

    await prisma.ticketHistory.create({
      data: {
        ticketId: supportTicket.id,
        action: 'Ticket created',
        description: 'Permintaan dukungan dibuat pelanggan.',
        actorType: 'CUSTOMER',
        actorId: user.id,
        createdAt: daysAgo(5),
      },
    });
  }

  // --- Cron Simulation Users (relative to current time) ---
  const realNow = new Date();
  const daysFromNow = (days: number) => new Date(realNow.getTime() + days * 24 * 60 * 60 * 1000);

  const cronPackage = packageByName('Home Premium');

  // Auto renew test: last invoice PAID and period already ended
  const renewUser = await prisma.user.create({
    data: {
      email: 'cron-renew@example.com',
      fullname: 'Cron Renew Test',
      password: bcrypt.hashSync('password123', 10),
      role: 'CUSTOMER',
    },
  });

  await prisma.profile.create({
    data: {
      user_id: renewUser.id,
      phone_number: '081234567899',
      full_address: 'Jl. Simulasi Cron Renew No. 1',
      province: 'Jawa Barat',
      city: 'Kota Bandung',
      district: 'Coblong',
      subdistrict: 'Dago',
      latitude: -6.8894,
      longitude: 107.6178,
      routerId: router.id,
      pppUsername: `ppp-${renewUser.id}`,
      pppPassword: `ppp-${renewUser.id}-pass`,
      pppProfile: cronPackage?.name || 'Home Premium',
      isPppActive: true,
    },
  });

  const renewOrder = await prisma.order.create({
    data: {
      userId: renewUser.id,
      total: cronPackage.price,
      status: 'COMPLETED',
      reviewedBy: adminUser?.id ?? null,
      reviewedAt: daysFromNow(-10),
      items: { create: { packageId: cronPackage.id } },
    },
  });

  await prisma.packageHistory.create({
    data: {
      userId: renewUser.id,
      packageId: cronPackage.id,
      startedAt: daysFromNow(-40),
      reason: 'Langganan awal',
    },
  });

  await prisma.billingInvoice.create({
    data: {
      userId: renewUser.id,
      amount: cronPackage.price,
      periodStart: daysFromNow(-35),
      periodEnd: daysFromNow(-5),
      dueAt: daysFromNow(-28),
      status: 'PAID',
      paidAt: daysFromNow(-27),
    },
  });

  // Auto suspend test: unpaid invoice overdue beyond grace days
  const suspendUser = await prisma.user.create({
    data: {
      email: 'cron-suspend@example.com',
      fullname: 'Cron Suspend Test',
      password: bcrypt.hashSync('password123', 10),
      role: 'CUSTOMER',
    },
  });

  await prisma.profile.create({
    data: {
      user_id: suspendUser.id,
      phone_number: '081234567898',
      full_address: 'Jl. Simulasi Cron Suspend No. 2',
      province: 'Jawa Barat',
      city: 'Kota Bandung',
      district: 'Arcamanik',
      subdistrict: 'Cisaranten Kulon',
      latitude: -6.9141,
      longitude: 107.6717,
      routerId: router.id,
      pppUsername: `ppp-${suspendUser.id}`,
      pppPassword: `ppp-${suspendUser.id}-pass`,
      pppProfile: cronPackage?.name || 'Home Premium',
      isPppActive: true,
    },
  });

  const suspendOrder = await prisma.order.create({
    data: {
      userId: suspendUser.id,
      total: cronPackage.price,
      status: 'COMPLETED',
      reviewedBy: adminUser?.id ?? null,
      reviewedAt: daysFromNow(-15),
      items: { create: { packageId: cronPackage.id } },
    },
  });

  await prisma.packageHistory.create({
    data: {
      userId: suspendUser.id,
      packageId: cronPackage.id,
      startedAt: daysFromNow(-50),
      reason: 'Langganan awal',
    },
  });

  await prisma.billingInvoice.create({
    data: {
      userId: suspendUser.id,
      amount: cronPackage.price,
      periodStart: daysFromNow(-20),
      periodEnd: daysFromNow(10),
      dueAt: daysFromNow(-12),
      status: 'UNPAID',
    },
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

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.user.createMany({
    data: [
      { email: 'admin@example.com', name: 'Admin' },
      { email: 'user@example.com', name: 'User' },
    ],
    skipDuplicates: true, // biar ga error kalau dijalankan berulang
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
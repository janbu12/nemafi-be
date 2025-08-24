import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  await prisma.user.createMany({
    data: [
      { email: 'admin@example.com', name: 'Admin', password: bcrypt.hashSync('password123', 10), role: "TECH_ADMIN"},
      { email: 'tech@example.com', name: 'Tech', password: bcrypt.hashSync('password123', 10), role: "TECHNICIAN"},
      { email: 'user@example.com', name: 'User', password: bcrypt.hashSync('password123', 10), role: "CUSTOMER"},
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
import { prismaClient } from '../application/prisma.js';
import { createPackageValidation, updatePackageValidation } from '../validation/packageValidation.js';
import { Prisma } from '@prisma/client';
import mikrotikService from './mikrotikService.js';

async function createPackage(data: {
  name: string;
  price: number;
  downloadSpeed: number;
  uploadSpeed: number;
  isPopular?: boolean;
  description: string;
  categoryId: number;
  metadata?: Prisma.JsonObject;
}) {
  const validatedData = createPackageValidation.parse(data);
  const pkg = await prismaClient.package.create({ data: validatedData });
  await mikrotikService.syncPackageToAllRouters(pkg);
  return pkg;
}

async function getAllPackages() {
  return prismaClient.package.findMany({ include: { category: true } });
}

async function getPackageById(id: number) {
  return prismaClient.package.findUnique({ where: { id }, include: { category: true } });
}

async function updatePackage(
  id: number,
  data: {
    name?: string;
    price?: number;
    downloadSpeed?: number;
    uploadSpeed?: number;
    isPopular?: boolean;
    description?: string;
    categoryId?: number;
    metadata?: Prisma.JsonObject;
  }
) {
  const validatedData = updatePackageValidation.parse(data);
  const pkg = await prismaClient.package.update({
    where: { id },
    data: validatedData,
  });
  await mikrotikService.syncPackageToAllRouters(pkg);
  return pkg;
}

async function deletePackage(id: number) {
  const pkg = await prismaClient.package.findUnique({ where: { id } });
  if (!pkg) {
    throw { status: 404, message: 'Paket tidak ditemukan.' };
  }

  // Check if there are active customers using this package's profile
  const activeUser = await prismaClient.profile.findFirst({
    where: { pppProfile: pkg.name },
  });
  if (activeUser) {
    throw {
      status: 400,
      message: 'Tidak dapat menghapus paket karena masih ada pelanggan aktif yang menggunakan paket ini.',
    };
  }

  // Check if there are active subscriptions in packageHistory
  const activeSub = await prismaClient.packageHistory.findFirst({
    where: { packageId: id, endedAt: null },
  });
  if (activeSub) {
    throw {
      status: 400,
      message: 'Tidak dapat menghapus paket karena masih ada pelanggan aktif yang menggunakan paket ini.',
    };
  }

  const result = await prismaClient.package.delete({ where: { id } });
  await mikrotikService.deletePackageFromAllRouters(pkg.name);
  return result;
}

export default {
  createPackage,
  getAllPackages,
  getPackageById,
  updatePackage,
  deletePackage,
};

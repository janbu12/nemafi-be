import { prismaClient } from '../application/prisma.js';
import { createPackageValidation, updatePackageValidation } from '../validation/package-validation.js';
import { Prisma } from '@prisma/client';

async function createPackage(data: {
  name: string;
  price: number;
  description: string;
  categoryId: number;
  metadata: Prisma.JsonObject;
}) {
  const validatedData = createPackageValidation.parse(data);
  return prismaClient.package.create({ data: validatedData });
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
    description?: string;
    categoryId?: number;
    metadata?: Prisma.JsonObject;
  }
) {
  const validatedData = updatePackageValidation.parse(data);
  return prismaClient.package.update({
    where: { id },
    data: validatedData,
  });
}

async function deletePackage(id: number) {
  return prismaClient.package.delete({ where: { id } });
}

export default {
  createPackage,
  getAllPackages,
  getPackageById,
  updatePackage,
  deletePackage,
};

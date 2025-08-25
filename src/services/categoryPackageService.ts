import { prismaClient } from '../application/prisma.js';
import { createCategoryPackageValidation, updateCategoryPackageValidation } from '../validation/category-package-validation.js';

async function createCategory(data: { name: string }) {
  const validatedData = createCategoryPackageValidation.parse(data);
  return prismaClient.categoryPackage.create({ data: validatedData });
}

async function getAllCategories() {
  return prismaClient.categoryPackage.findMany();
}

async function getCategoryById(id: number) {
  return prismaClient.categoryPackage.findUnique({ where: { id } });
}

async function updateCategory(id: number, data: { name?: string }) {
  const validatedData = updateCategoryPackageValidation.parse(data);
  return prismaClient.categoryPackage.update({
    where: { id },
    data: validatedData,
  });
}

async function deleteCategory(id: number) {
  return prismaClient.categoryPackage.delete({ where: { id } });
}

export default {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
};

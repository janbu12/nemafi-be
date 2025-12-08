import { prismaClient } from '../application/prisma.js';
import {
  createInventoryCategoryValidation,
  updateInventoryCategoryValidation,
} from '../validation/inventoryValidation.js';

async function createCategory(data: { name: string }) {
  const validated = createInventoryCategoryValidation.parse(data);
  return prismaClient.inventoryCategory.create({ data: validated });
}

async function getAllCategories() {
  return prismaClient.inventoryCategory.findMany({ orderBy: { name: 'asc' } });
}

async function getCategoryById(id: number) {
  return prismaClient.inventoryCategory.findUnique({ where: { id } });
}

async function updateCategory(id: number, data: { name?: string }) {
  const validated = updateInventoryCategoryValidation.parse(data);
  return prismaClient.inventoryCategory.update({
    where: { id },
    data: validated,
  });
}

async function deleteCategory(id: number) {
  return prismaClient.inventoryCategory.delete({ where: { id } });
}

export default {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
};

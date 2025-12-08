import { prismaClient } from '../application/prisma.js';
import {
  createInventoryItemValidation,
  updateInventoryItemValidation,
} from '../validation/inventoryValidation.js';

async function createItem(data: { name: string; stock: number; unit: string; categoryId: number }) {
  const validated = createInventoryItemValidation.parse(data);
  return prismaClient.inventoryItem.create({
    data: validated,
  });
}

async function getAllItems() {
  return prismaClient.inventoryItem.findMany({
    include: { category: true },
    orderBy: [{ name: 'asc' }],
  });
}

async function getItemById(id: number) {
  return prismaClient.inventoryItem.findUnique({
    where: { id },
    include: { category: true },
  });
}

async function updateItem(
  id: number,
  data: { name?: string; stock?: number; unit?: string; categoryId?: number }
) {
  const validated = updateInventoryItemValidation.parse(data);
  return prismaClient.inventoryItem.update({
    where: { id },
    data: validated,
  });
}

async function deleteItem(id: number) {
  return prismaClient.inventoryItem.delete({ where: { id } });
}

export default {
  createItem,
  getAllItems,
  getItemById,
  updateItem,
  deleteItem,
};

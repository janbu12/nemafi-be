import { prismaClient } from '../application/prisma.js';
import { ticketCategoryValidation } from '../validation/ticketValidation.js';

async function list() {
  return prismaClient.ticketCategory.findMany({ orderBy: { id: 'asc' } });
}

async function create(data: any) {
  const { name, isExpirable, expireHours, requiresTechnician, sopTemplate } = ticketCategoryValidation.parse(data);
  return prismaClient.ticketCategory.create({
    data: {
      name: name.trim().toLowerCase(),
      isExpirable: Boolean(isExpirable),
      expireHours: isExpirable ? expireHours : null,
      requiresTechnician: Boolean(requiresTechnician),
      sopTemplate: sopTemplate && sopTemplate.length > 0 ? (sopTemplate as any) : null,
    },
  });
}

async function update(id: number, data: any) {
  const { name, isExpirable, expireHours, requiresTechnician, sopTemplate } = ticketCategoryValidation.parse(data);
  return prismaClient.ticketCategory.update({
    where: { id },
    data: {
      name: name.trim().toLowerCase(),
      isExpirable: Boolean(isExpirable),
      expireHours: isExpirable ? expireHours : null,
      requiresTechnician: Boolean(requiresTechnician),
      sopTemplate: sopTemplate && sopTemplate.length > 0 ? (sopTemplate as any) : null,
    },
  });
}

async function remove(id: number) {
  return prismaClient.ticketCategory.delete({ where: { id } });
}

export default { list, create, update, remove };

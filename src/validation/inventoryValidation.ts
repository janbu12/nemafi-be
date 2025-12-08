import { z } from 'zod';

export const createInventoryCategoryValidation = z.object({
  name: z.string().min(2),
});

export const updateInventoryCategoryValidation = z.object({
  name: z.string().min(2).optional(),
});

export const createInventoryItemValidation = z.object({
  name: z.string().min(2),
  stock: z.number().int().nonnegative().default(0),
  unit: z.string().min(1),
  categoryId: z.number().int().positive(),
});

export const updateInventoryItemValidation = z.object({
  name: z.string().min(2).optional(),
  stock: z.number().int().nonnegative().optional(),
  unit: z.string().min(1).optional(),
  categoryId: z.number().int().positive().optional(),
});

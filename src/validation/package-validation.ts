import { z } from 'zod';

export const createPackageValidation = z.object({
  name: z.string().min(3),
  price: z.number().positive(),
  description: z.string(),
  categoryId: z.number().int().positive(),
  metadata: z.record(z.any(), z.any()),
});

export const updatePackageValidation = z.object({
  name: z.string().min(3).optional(),
  price: z.number().positive().optional(),
  description: z.string().optional(),
  categoryId: z.number().int().positive().optional(),
  metadata: z.record(z.any(), z.any()).optional(),
});

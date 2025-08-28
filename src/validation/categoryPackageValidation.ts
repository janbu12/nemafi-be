import { z } from 'zod';

export const createCategoryPackageValidation = z.object({
  name: z.string().min(3),
});

export const updateCategoryPackageValidation = z.object({
  name: z.string().min(3).optional(),
});

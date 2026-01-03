import { z } from 'zod';

const coerceBoolean = (value: unknown) => {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return value;
};

const packageFeatureSchema = z.object({
  key: z.string().min(1),
  value: z.preprocess(coerceBoolean, z.union([z.string().min(1), z.boolean()])),
});

const metadataSchema = z
  .object({
    features: z.array(packageFeatureSchema).optional(),
  })
  .optional();

export const createPackageValidation = z.object({
  name: z.string().min(3),
  price: z.number().nonnegative(),
  downloadSpeed: z.number().nonnegative(),
  uploadSpeed: z.number().nonnegative(),
  isPopular: z.boolean().default(false),
  description: z.string(),
  categoryId: z.number().int().positive(),
  metadata: metadataSchema,
});

export const updatePackageValidation = z.object({
  name: z.string().min(3).optional(),
  price: z.number().nonnegative().optional(),
  downloadSpeed: z.number().nonnegative().optional(),
  uploadSpeed: z.number().nonnegative().optional(),
  isPopular: z.boolean().optional(),
  description: z.string().optional(),
  categoryId: z.number().int().positive().optional(),
  metadata: metadataSchema,
});

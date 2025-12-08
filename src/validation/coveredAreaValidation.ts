import { z } from 'zod';

// Diubah dari createCoveredAreaValidation
export const createCoveredAreaValidation = z.object({
  province: z.string().min(3),
  city: z.string().min(3),
  district: z.string().min(3),
  village: z.string().min(3),
  fullAddress: z.string().min(5),
  latitude: z.coerce.number(),
  longitude: z.coerce.number(),
  radius_m: z.coerce.number().positive().optional(),
});

// Diubah dari checkCoverageValidation
export const checkCoveredAreaValidation = z.object({
  fullAddress: z.string().min(10),
  province: z.string().min(3),
  city: z.string().min(3),
  district: z.string().min(3),
  village: z.string().min(3),
  latitude: z.coerce.number(),
  longitude: z.coerce.number(),
});

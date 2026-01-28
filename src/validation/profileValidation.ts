import { z } from 'zod';

export const updateProfileValidation = z.object({
  fullname: z.string().min(3).optional(),
  phone_number: z.string().min(10).optional(),
  image_url: z.string().url().optional(),
  full_address: z.string().min(10).optional(),
  province: z.string().min(3).optional(),
  city: z.string().min(3).optional(),
  district: z.string().min(3).optional(),
  subdistrict: z.string().min(3).optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
});

export const updateEmailValidation = z.object({
  email: z.string().email(),
});

export const updatePasswordValidation = z.object({
  oldPassword: z.string().min(6),
  newPassword: z.string().min(6),
});

export const changePackageValidation = z.object({
  packageId: z.coerce.number().int().positive(),
});

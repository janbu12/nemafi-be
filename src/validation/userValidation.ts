import { z } from 'zod';

const createUserValidation = z.object({
    email: z.string().email('Format email tidak valid'),
    fullname: z.string().min(1, 'Nama lengkap wajib diisi').optional(),
    name: z.string().min(1).optional(),
    password: z.string().min(6, 'Password minimal 6 karakter'),
    role: z.enum(['CUSTOMER', 'TECHNICIAN', 'TECH_ADMIN', 'SUPER_ADMIN']).optional(),
    phone_number: z
        .string()
        .regex(/^[0-9+\s()-]+$/, 'Nomor telepon harus berupa angka')
        .optional()
        .nullable(),
    full_address: z.string().optional().nullable(),
    province: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    district: z.string().optional().nullable(),
    subdistrict: z.string().optional().nullable(),
});

const updateUserValidation = z.object({
    email: z.string().email('Format email tidak valid').optional(),
    fullname: z.string().min(1, 'Nama lengkap wajib diisi').optional(),
    name: z.string().min(1).nullable().optional(),
    role: z.enum(['CUSTOMER', 'TECHNICIAN', 'TECH_ADMIN', 'SUPER_ADMIN']).optional(),
    password: z.string().min(6, 'Password minimal 6 karakter').optional(),
    phone_number: z
        .string()
        .regex(/^[0-9+\s()-]+$/, 'Nomor telepon harus berupa angka')
        .optional()
        .nullable(),
    full_address: z.string().optional().nullable(),
    province: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    district: z.string().optional().nullable(),
    subdistrict: z.string().optional().nullable(),
    latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
    longitude: z.coerce.number().min(-180).max(180).optional().nullable(),
    routerId: z.coerce.number().optional().nullable(),
    pppUsername: z.string().optional().nullable(),
    pppProfile: z.string().optional().nullable(),
    isPppActive: z.boolean().optional().nullable(),
});

const resetPasswordValidation = z.object({
    password: z.string().min(6, 'Password minimal 6 karakter'),
});

const adminCreateCustomerValidation = z.object({
    email: z.string().email('Format email tidak valid'),
    password: z.string().min(6, 'Kata sandi minimal 6 karakter'),
    fullname: z.string().min(3, 'Nama lengkap minimal 3 karakter'),
    phone_number: z
        .string()
        .min(10, 'Nomor telepon minimal 10 digit')
        .regex(/^[0-9+\s()-]+$/, 'Nomor telepon harus berupa angka'),
    full_address: z.string().min(10, 'Alamat minimal 10 karakter'),
    province: z.string().min(3, 'Provinsi minimal 3 karakter'),
    city: z.string().min(3, 'Kota/Kabupaten minimal 3 karakter'),
    district: z.string().min(3, 'Kecamatan minimal 3 karakter'),
    subdistrict: z.string().min(3, 'Kelurahan/Desa minimal 3 karakter'),
    latitude: z.coerce.number().min(-90).max(90),
    longitude: z.coerce.number().min(-180).max(180),
    packageId: z.number().int().positive(),
});

export {
    createUserValidation,
    updateUserValidation,
    resetPasswordValidation,
    adminCreateCustomerValidation,
};

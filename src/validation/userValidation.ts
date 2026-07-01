import { z } from 'zod';

const createUserValidation = z.object({
    email: z.string().email(),
    name: z.string().min(1).optional(),
    password: z.string().min(6),
    role: z.enum(['CUSTOMER', 'TECHNICIAN', 'TECH_ADMIN']).optional(),
});

const updateUserValidation = z.object({
    email: z.string().email().optional(),
    name: z.string().min(1).nullable().optional(),
});

const resetPasswordValidation = z.object({
    password: z.string().min(6),
});

const adminCreateCustomerValidation = z.object({
    email: z.string().email(),
    password: z.string().min(6, 'Kata sandi minimal 6 karakter'),
    fullname: z.string().min(3, 'Nama lengkap minimal 3 karakter'),
    phone_number: z.string().min(10, 'Nomor telepon minimal 10 digit'),
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

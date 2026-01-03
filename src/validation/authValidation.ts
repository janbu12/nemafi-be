import z from "zod";
import { createUserValidation } from "./userValidation";

const registerValidation = z.object({
    // Data untuk User
    email: z.string().email(),
    password: z.string().min(6, 'Kata sandi minimal 6 karakter'),
    confirm_password: z.string().min(6, 'Konfirmasi kata sandi minimal 6 karakter'),
    fullname: z.string().min(3, 'Nama lengkap minimal 3 karakter'),

    // Data untuk Profile (semua wajib)
    phone_number: z.string().min(10, 'Nomor telepon minimal 10 digit'),
    full_address: z.string().min(10, 'Alamat minimal 10 karakter'),
    province: z.string().min(3, 'Provinsi minimal 3 karakter'),
    city: z.string().min(3, 'Kota/Kabupaten minimal 3 karakter'),
    district: z.string().min(3, 'Kecamatan minimal 3 karakter'),
    subdistrict: z.string().min(3, 'Kelurahan/Desa minimal 3 karakter'),
    image_url: z.string().url().optional(), // image_url bisa tetap opsional

    // Data untuk Order (wajib ada)
    packageId: z.number().int().positive(),

    // Data untuk Ticket (opsional)
    ticketCategoryId: z.number().int().positive().optional(),
}).refine((data) => data.password === data.confirm_password, {
    message: 'Confirm password does not match',
    path: ['confirm_password'],
});

const loginValidation = z.object({
    email: z.string().email(),
    password: z.string().min(6),
});

export { registerValidation, loginValidation };

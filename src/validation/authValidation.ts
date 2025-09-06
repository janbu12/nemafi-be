import z from "zod";
import { createUserValidation } from "./userValidation";

const registerValidation = z.object({
    // Data untuk User
    email: z.string().email(),
    password: z.string().min(6),
    fullname: z.string().min(3),

    // Data untuk Profile (semua wajib)
    phone_number: z.string().min(10),
    full_address: z.string().min(10),
    province: z.string().min(3),
    city: z.string().min(3),
    district: z.string().min(3),
    subdistrict: z.string().min(3),
    image_url: z.string().url().optional(), // image_url bisa tetap opsional

    // Data untuk Order (wajib ada)
    packageId: z.number().int().positive(),
});

const loginValidation = z.object({
    email: z.string().email(),
    password: z.string().min(6),
});

export { registerValidation, loginValidation };
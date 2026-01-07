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

export {
    createUserValidation,
    updateUserValidation,
    resetPasswordValidation,
};

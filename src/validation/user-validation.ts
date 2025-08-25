import { z } from 'zod';

const createUserValidation = z.object({
    email: z.string().email(),
    name: z.string().min(1).optional(),
    password: z.string().min(6),
});

const updateUserValidation = z.object({
    email: z.string().email().optional(),
    name: z.string().min(1).nullable().optional(),
});

export {
    createUserValidation,
    updateUserValidation,
};
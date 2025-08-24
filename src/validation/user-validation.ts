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

const registerValidation = createUserValidation;
const loginValidation = z.object({
    email: z.string().email(),
    password: z.string().min(6),
});

export {
    createUserValidation,
    updateUserValidation,
    registerValidation,
    loginValidation,
};
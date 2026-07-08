import 'dotenv/config';
import { z } from 'zod';


const envSchema = z.object({
    PORT: z.coerce.number().default(3000),
    SOCKET_PORT: z.coerce.number().optional(),
    DATABASE_URL: z.string().url(),
    JWT_SECRET: z.string().min(16),
    GEMINI_API_KEY: z.string().optional().default(''),
    GEMINI_MODEL: z.string().optional().default(''),
    VAPID_PUBLIC_KEY: z.string().optional().default(''),
    VAPID_PRIVATE_KEY: z.string().optional().default(''),
    VAPID_SUBJECT: z.string().optional().default('mailto:admin@nemafi.local'),
});


export const env = envSchema.parse(process.env);

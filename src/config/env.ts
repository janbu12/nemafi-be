import 'dotenv/config';
import { z } from 'zod';


const envSchema = z.object({
    PORT: z.coerce.number().default(3000),
    DATABASE_URL: z.string().url(),
    DATABASE_MAIN_URL: z.string().url().optional(),
    DATABASE_SLAVE_URL: z.string().url().optional(),
    JWT_SECRET: z.string().min(16),
    GEMINI_API_KEY: z.string().min(1),
});


export const env = envSchema.parse(process.env);
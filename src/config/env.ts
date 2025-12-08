import 'dotenv/config';
import { z } from 'zod';


const envSchema = z.object({
    PORT: z.coerce.number().default(3000),
    SOCKET_PORT: z.coerce.number().optional(),
    DATABASE_URL: z.string().url(),
    JWT_SECRET: z.string().min(16),
    GEMINI_API_KEY: z.string().min(1),
    GEMINI_MODEL: z.string().min(1),
});


export const env = envSchema.parse(process.env);

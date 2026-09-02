import { z } from 'zod';

export const createRouterValidation = z.object({
  name: z.string().min(3),
  host: z.string().min(1), // Bisa IP atau domain
  user: z.string().min(1),
  password: z.string().min(1),
  port: z.number().int().positive().optional(), // deprecated
  portApi: z.number().int().positive().default(8728),
  portSsh: z.number().int().positive().default(22),
  capacity: z.coerce.number().int().positive().default(40),
  pppLocalAddress: z.string().nullish(),
  pppRemoteAddress: z.string().nullish(),
});

export const updateRouterValidation = z.object({
  name: z.string().min(3).optional(),
  host: z.string().min(1).optional(),
  user: z.string().min(1).optional(),
  password: z.string().min(1).optional(),
  port: z.number().int().positive().optional(), // deprecated
  portApi: z.number().int().positive().optional(),
  portSsh: z.number().int().positive().optional(),
  capacity: z.coerce.number().int().positive().optional(),
  pppLocalAddress: z.string().nullish(),
  pppRemoteAddress: z.string().nullish(),
});

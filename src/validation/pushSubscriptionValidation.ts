import { z } from 'zod';

const subscriptionKeysSchema = z.object({
  p256dh: z.string().min(1),
  auth: z.string().min(1),
});

export const pushSubscriptionValidation = z.object({
  endpoint: z.string().url(),
  expirationTime: z.number().nullable().optional(),
  keys: subscriptionKeysSchema,
  userAgent: z.string().max(500).optional(),
});

export const unsubscribePushValidation = z.object({
  endpoint: z.string().url(),
});

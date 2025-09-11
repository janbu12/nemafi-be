import { z } from 'zod';

export const packageRecommendationValidation = z.object({
  usageDescription: z.string().min(10).max(500),
});
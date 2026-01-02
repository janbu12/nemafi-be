import { z } from 'zod';
import { TicketStatus } from '@prisma/client';

export const createTicketValidation = z.object({
  orderId: z.number().int().positive(),
  title: z.string().min(5),
  description: z.string().optional(),
  categoryId: z.number().int().positive().optional(),
});

export const assignTicketValidation = z.object({
  technicianId: z.number().int().positive(),
});

export const updateTicketStatusValidation = z.object({
  status: z.nativeEnum(TicketStatus),
});

export const ticketCategoryValidation = z.object({
  name: z.string().min(3).max(50),
  isExpirable: z.boolean().optional(),
  expireHours: z.number().int().positive().optional(),
}).refine((data) => {
  if (!data.isExpirable) return true;
  return typeof data.expireHours === 'number' && data.expireHours > 0;
}, {
  message: 'expireHours is required when isExpirable is true',
  path: ['expireHours'],
}).refine((data) => {
  if (!data.isExpirable || typeof data.expireHours !== 'number') return true;
  return data.expireHours % 24 === 0;
}, {
  message: 'expireHours must be a multiple of 24',
  path: ['expireHours'],
});

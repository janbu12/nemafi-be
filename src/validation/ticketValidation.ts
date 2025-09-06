import { z } from 'zod';
import { TicketStatus } from '@prisma/client';

export const createTicketValidation = z.object({
  orderId: z.number().int().positive(),
  title: z.string().min(5),
  description: z.string().optional(),
});

export const assignTicketValidation = z.object({
  technicianId: z.number().int().positive(),
});

export const updateTicketStatusValidation = z.object({
  status: z.nativeEnum(TicketStatus),
});
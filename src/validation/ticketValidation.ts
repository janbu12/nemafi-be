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

export const scheduleTicketValidation = z.object({
  technicianId: z.number().int().positive().optional(),
  scheduledAt: z.string().datetime(),
});

export const updateTicketStatusValidation = z.object({
  status: z.nativeEnum(TicketStatus),
});

export const ticketCategoryValidation = z.object({
  name: z.string().min(3).max(50),
  isExpirable: z.boolean().optional(),
  expireHours: z.number().int().positive().optional(),
  requiresTechnician: z.boolean().optional(),
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

const surveyItemSchema = z.object({
  inventoryItemId: z.number().int().positive(),
  quantity: z.number().positive(),
});

export const completeSurveyValidation = z.object({
  items: z.array(surveyItemSchema).min(1),
  notes: z.string().optional(),
  technicianId: z.number().int().positive().optional(),
});

export const surveyActualValidation = z.object({
  items: z.array(surveyItemSchema).min(1),
  notes: z.string().optional(),
});

export const updateSurveyValidation = z.object({
  items: z.array(surveyItemSchema).min(1),
  notes: z.string().optional(),
});

export const updateTicketMembersValidation = z
  .object({
    addIds: z.array(z.number().int().positive()).optional(),
    removeIds: z.array(z.number().int().positive()).optional(),
  })
  .refine((data) => (data.addIds && data.addIds.length > 0) || (data.removeIds && data.removeIds.length > 0), {
    message: 'addIds or removeIds must be provided',
  });

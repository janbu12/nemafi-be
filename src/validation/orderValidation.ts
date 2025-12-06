import { z } from 'zod';

export const createOrderValidation = z.object({
    packageId: z.number().int().positive('Package ID must be a positive number')
});

export const approveOrderValidation = z.object({
    notes: z.string().optional()
});

export const rejectOrderValidation = z.object({
    notes: z.string().min(1, 'Rejection notes are required')
});

export const updateOrderStatusValidation = z.object({
    status: z.enum([
        'PENDING_REVIEW',
        'REVIEW_APPROVED', 
        'REVIEW_REJECTED',
        'SURVEY_SCHEDULED',
        'SURVEY_COMPLETED',
        'WAITING_FOR_ASSIGNMENT',
        'TECHNICIAN_ASSIGNED',
        'INSTALLATION_IN_PROGRESS',
        'COMPLETED',
        'CANCELLED'
    ])
});

export const initiatePaymentValidation = z.object({
    orderId: z.number().int().positive('Order ID must be a positive number')
});

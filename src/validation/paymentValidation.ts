import { z } from 'zod';

export const createPaymentValidation = z.object({
    orderId: z.number().int().positive('Order ID must be a positive number'),
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Valid email is required'),
    phone: z.string().min(10, 'Valid phone number is required')
});

export const paymentNotificationValidation = z.object({
    order_id: z.string(),
    transaction_id: z.string(),
    transaction_status: z.enum(['capture', 'settlement', 'pending', 'deny', 'cancel', 'expire', 'refund', 'partial_refund']),
    gross_amount: z.string(),
    payment_type: z.string(),
    signature_key: z.string()
});

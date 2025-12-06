import { Request, Response } from 'express';
import paymentService from '../services/paymentService.js';
import { createPaymentValidation, paymentNotificationValidation } from '../validation/paymentValidation.js';
import * as responseHandler from '../utils/responseHandler.js';

// Create payment token for Midtrans redirect
export async function createPaymentToken(req: Request, res: Response) {
    try {
        const userId = (req as any).user.id;
        const data = createPaymentValidation.parse(req.body);

        // Verify order belongs to user
        const { default: userService } = await import('../services/userService.js');
        const user = await userService.getUser(userId);
        if (!user) {
            return responseHandler.error(res, 'User not found', 404);
        }

        const result = await paymentService.createPaymentToken(
            data.orderId,
            data.name,
            data.email,
            data.phone
        );

        return responseHandler.success(res, result, 'Payment token created successfully');
    } catch (error: any) {
        if (error.status && error.message) {
            return responseHandler.error(res, error.message, error.status);
        }
        if (error.name === 'ZodError') {
            return responseHandler.error(res, 'Validation error', 400, error.errors);
        }
        return responseHandler.error(res, 'Internal server error', 500);
    }
}

// Midtrans callback notification
export async function handlePaymentNotification(req: Request, res: Response) {
    try {
        const result = await paymentService.verifyPaymentNotification(req.body);
        
        // Always return 200 OK to Midtrans to acknowledge receipt
        return res.status(200).json({
            status: 'success',
            message: 'Notification received'
        });
    } catch (error: any) {
        console.error('Payment notification error:', error);
        // Still return 200 to acknowledge Midtrans
        return res.status(200).json({
            status: 'error',
            message: error.message || 'Error processing notification'
        });
    }
}

// Get payment status
export async function getPaymentStatus(req: Request, res: Response) {
    try {
        const { orderId } = req.params;
        const userId = (req as any).user.id;

        const id = parseInt(orderId);
        if (isNaN(id)) {
            return responseHandler.error(res, 'Invalid order ID', 400);
        }

        const result = await paymentService.getPaymentStatus(id);
        
        // Check if user owns this order
        const { default: orderService } = await import('../services/orderService.js');
        const order = await orderService.getOrderById(id);
        if (order.userId !== userId) {
            return responseHandler.error(res, 'Unauthorized', 403);
        }

        return responseHandler.success(res, result, 'Payment status retrieved');
    } catch (error: any) {
        if (error.status && error.message) {
            return responseHandler.error(res, error.message, error.status);
        }
        return responseHandler.error(res, 'Internal server error', 500);
    }
}

// Finish callback (user completed payment)
export async function paymentFinish(req: Request, res: Response) {
    try {
        const { orderId } = req.params;
        // Redirect to success page or return success response
        return res.json({
            status: 'success',
            message: 'Please wait while we verify your payment...',
            orderId
        });
    } catch (error: any) {
        return responseHandler.error(res, 'Error processing payment', 500);
    }
}

// Unfinish callback (user hasn't completed payment yet)
export async function paymentUnfinish(req: Request, res: Response) {
    try {
        const { orderId } = req.params;
        return res.json({
            status: 'pending',
            message: 'Payment process not completed',
            orderId
        });
    } catch (error: any) {
        return responseHandler.error(res, 'Error processing payment', 500);
    }
}

// Error callback (payment failed)
export async function paymentError(req: Request, res: Response) {
    try {
        const { orderId } = req.params;
        return res.json({
            status: 'error',
            message: 'Payment failed',
            orderId
        });
    } catch (error: any) {
        return responseHandler.error(res, 'Error processing payment', 500);
    }
}

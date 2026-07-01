import { Router } from 'express';
import { 
    createPaymentToken, 
    createInvoicePaymentToken,
    handlePaymentNotification,
    getPaymentStatus,
    paymentFinish,
    paymentUnfinish,
    paymentError
} from '../controllers/paymentController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { roleMiddleware } from '../middlewares/roleMiddleware.js';

export const paymentRoutes = Router();

// Create payment token (customer initiates payment - first time order)
paymentRoutes.post('/create-token', authMiddleware, roleMiddleware(['CUSTOMER']), createPaymentToken);

// Create payment token for billing invoice (monthly renewal)
paymentRoutes.post('/create-invoice-token', authMiddleware, roleMiddleware(['CUSTOMER']), createInvoicePaymentToken);

// Midtrans notification callback (no auth needed, called from Midtrans server)
paymentRoutes.post('/notification', handlePaymentNotification);

// Get payment status
paymentRoutes.get('/:orderId/status', authMiddleware, getPaymentStatus);

// Payment callbacks (user redirected from Midtrans)
paymentRoutes.get('/finish/:orderId', paymentFinish);
paymentRoutes.get('/unfinish/:orderId', paymentUnfinish);
paymentRoutes.get('/error/:orderId', paymentError);

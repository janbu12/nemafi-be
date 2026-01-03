import crypto from 'crypto';
import { prismaClient } from '../application/prisma.js';
import orderService, { type OrderWithDetails } from './orderService.js';
import ticketService from './ticketService.js';

// Simplified Midtrans integration (without SDK for flexibility)
// You'll need to install midtrans-client: npm install midtrans-client

const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || '';
const MIDTRANS_BASE_URL = process.env.NODE_ENV === 'production' 
    ? 'https://app.midtrans.com/snap/v1/transactions'
    : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

// Create Snap Token for payment (redirect to Midtrans)
async function createPaymentToken(orderId: number, customerName: string, customerEmail: string, customerPhone: string) {
    try {
        const order: OrderWithDetails = await orderService.getOrderById(orderId);

        if (order.status !== 'REVIEW_APPROVED') {
            throw { status: 400, message: 'Order must be in REVIEW_APPROVED status to process payment' };
        }

        // Create Midtrans order ID
        const midtransOrderId = `ORDER-${orderId}-${Date.now()}`;

        // Prepare transaction parameter
        const transactionData = {
            transaction_details: {
                order_id: midtransOrderId,
                gross_amount: Math.ceil(order.total)
            },
            customer_details: {
                first_name: customerName,
                email: customerEmail,
                phone: customerPhone
            },
            item_details: order.items.map(item => ({
                id: item.package.id.toString(),
                price: Math.ceil(item.package.price),
                quantity: 1,
                name: item.package.name
            })),
            callbacks: {
                finish: `${process.env.APP_URL || 'http://localhost:3000'}/payment/finish/${orderId}`,
                unfinish: `${process.env.APP_URL || 'http://localhost:3000'}/payment/unfinish/${orderId}`,
                error: `${process.env.APP_URL || 'http://localhost:3000'}/payment/error/${orderId}`
            }
        };

        // Create Basic Auth header
        const auth = Buffer.from(`${MIDTRANS_SERVER_KEY}:`).toString('base64');

        // Call Midtrans Snap API
        const response = await fetch(MIDTRANS_BASE_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(transactionData)
        });

        if (!response.ok) {
            const errorBody = await response.text().catch(() => '');
            console.error('Midtrans error response:', errorBody);
            throw { status: 502, message: `Midtrans error: ${errorBody || 'Failed to create token'}` };
        }

        const result = await response.json() as any;

        console.log('Midtrans response:', result);

        // Save Midtrans transaction ID and redirect URL
        await orderService.saveMidtransTransaction(
            orderId,
            result.token || '',
            midtransOrderId,
            result.redirect_url || ''
        );

        return {
            snapToken: result.token,
            redirectUrl: result.redirect_url
        };
    } catch (error: any) {
        if (error.status && error.message) {
            throw error;
        }
        throw { status: 500, message: 'Failed to create payment token', error: error.message };
    }
}

// Verify payment notification (callback from Midtrans)
async function verifyPaymentNotification(notificationBody: any) {
    try {
        const {
            order_id,
            transaction_id,
            transaction_status,
            gross_amount,
            signature_key
        } = notificationBody;

        const status_code = 200
        // Verify signature
        const dataToSign = `${order_id}${status_code}${gross_amount}${MIDTRANS_SERVER_KEY}`;
        const calculatedSignature = crypto.createHash('sha512').update(dataToSign).digest('hex');

        if (calculatedSignature !== signature_key) {
            throw { status: 401, message: 'Invalid signature' };
        }

        // Extract order ID from Midtrans order ID (format: ORDER-{orderId}-{timestamp})
        const orderId = parseInt(order_id.split('-')[1]);
        if (isNaN(orderId)) {
            throw { status: 400, message: 'Invalid order ID in notification' };
        }

        const order = await prismaClient.order.findUnique({
            where: { id: orderId }
        });

        if (!order) {
            throw { status: 404, message: 'Order not found' };
        }

        // Handle transaction status
        if (transaction_status === 'settlement' || transaction_status === 'capture') {
            // Payment success - move to next status
            await orderService.updateOrderStatus(orderId, 'SURVEY_SCHEDULED');
            await ticketService.markTicketPaid(orderId);
            return { status: 'success', message: 'Payment verified', orderId };
        } else if (transaction_status === 'pending') {
            return { status: 'pending', message: 'Payment pending', orderId };
        } else if (transaction_status === 'deny' || transaction_status === 'cancel' || transaction_status === 'expire') {
            // Payment failed - keep order in REVIEW_APPROVED
            return { status: 'failed', message: 'Payment failed or cancelled', orderId };
        }

        return { status: 'unknown', message: 'Unknown transaction status', orderId };
    } catch (error: any) {
        if (error.status && error.message) {
            throw error;
        }
        throw { status: 500, message: 'Error verifying payment notification', error: error.message };
    }
}

// Get payment status
async function getPaymentStatus(orderId: number) {
    try {
        const order = await orderService.getOrderById(orderId);
        return {
            orderId: order.id,
            status: order.status,
            snapToken: (order as any).midtransTransactionId,
            redirectUrl: (order as any).redirectUrl
        };
    } catch (error: any) {
        if (error.status && error.message) {
            throw error;
        }
        throw { status: 500, message: 'Error getting payment status' };
    }
}

export default {
    createPaymentToken,
    verifyPaymentNotification,
    getPaymentStatus
};

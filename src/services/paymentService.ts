import crypto from 'crypto';
import { prismaClient } from '../application/prisma.js';
import orderService, { type OrderWithDetails } from './orderService.js';
import ticketService from './ticketService.js';
import billingService from './billingService.js';
import appSettingService from './appSettingService.js';

// Simplified Midtrans integration (without SDK for flexibility)
// You'll need to install midtrans-client: npm install midtrans-client

async function getMidtransConfig() {
    const settings = await appSettingService.getSettingValues([
        'MIDTRANS_SERVER_KEY',
    ]);
    const serverKey = settings.MIDTRANS_SERVER_KEY || process.env.MIDTRANS_SERVER_KEY || '';
    const snapUrl =
        process.env.MIDTRANS_SNAP_URL ||
        (process.env.NODE_ENV === 'production'
            ? 'https://app.midtrans.com/snap/snap.js'
            : 'https://app.sandbox.midtrans.com/snap/snap.js');
    const baseUrl = snapUrl.includes('sandbox')
        ? 'https://app.sandbox.midtrans.com/snap/v1/transactions'
        : 'https://app.midtrans.com/snap/v1/transactions';
    return { serverKey, baseUrl };
}

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
        // Prepare transaction parameter
        const notificationUrl = process.env.BACKEND_PUBLIC_URL
            ? `${process.env.BACKEND_PUBLIC_URL}/api/payment/notification`
            : 'https://nemafi-be.mzn.my.id/api/payment/notification';
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
        const { serverKey, baseUrl } = await getMidtransConfig();
        if (!serverKey) {
            throw { status: 400, message: 'Konfigurasi Midtrans belum lengkap.' };
        }
        const auth = Buffer.from(`${serverKey}:`).toString('base64');

        // Call Midtrans Snap API
        const response = await fetch(baseUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json',
                'X-Override-Notification': notificationUrl
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

// Create Snap Token for billing invoice payment (monthly renewal)
async function createInvoicePaymentToken(userId: number, customerName: string, customerEmail: string, customerPhone: string) {
    try {
        const invoice = await prismaClient.billingInvoice.findFirst({
            where: { userId, status: { in: ['UNPAID', 'OVERDUE'] } },
            orderBy: { dueAt: 'desc' },
        });

        if (!invoice) {
            throw { status: 404, message: 'Tidak ada tagihan yang perlu dibayar.' };
        }

        const midtransOrderId = `INVOICE-${invoice.id}-${Date.now()}`;

        const notificationUrlInvoice = process.env.BACKEND_PUBLIC_URL
            ? `${process.env.BACKEND_PUBLIC_URL}/api/payment/notification`
            : 'https://nemafi-be.mzn.my.id/api/payment/notification';
        const transactionData = {
            transaction_details: {
                order_id: midtransOrderId,
                gross_amount: Math.ceil(invoice.amount)
            },
            customer_details: {
                first_name: customerName,
                email: customerEmail,
                phone: customerPhone
            },
            item_details: [{
                id: `invoice-${invoice.id}`,
                price: Math.ceil(invoice.amount),
                quantity: 1,
                name: `Tagihan Internet Bulan ${new Date(invoice.periodStart).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`
            }]
        };

        const { serverKey, baseUrl } = await getMidtransConfig();
        if (!serverKey) {
            throw { status: 400, message: 'Konfigurasi Midtrans belum lengkap.' };
        }
        const auth = Buffer.from(`${serverKey}:`).toString('base64');

        const response = await fetch(baseUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json',
                'X-Override-Notification': notificationUrlInvoice
            },
            body: JSON.stringify(transactionData)
        });

        if (!response.ok) {
            const errorBody = await response.text().catch(() => '');
            console.error('Midtrans invoice token error:', errorBody);
            throw { status: 502, message: `Midtrans error: ${errorBody || 'Failed to create token'}` };
        }

        const result = await response.json() as any;
        console.log('Midtrans invoice token response:', result);

        return {
            snapToken: result.token,
            redirectUrl: result.redirect_url,
            invoiceId: invoice.id
        };
    } catch (error: any) {
        if (error.status && error.message) throw error;
        throw { status: 500, message: 'Failed to create invoice payment token', error: error.message };
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
            signature_key,
            status_code
        } = notificationBody;

        // Verify signature
        const { serverKey } = await getMidtransConfig();
        if (!serverKey) {
            throw { status: 400, message: 'Konfigurasi Midtrans belum lengkap.' };
        }
        const dataToSign = `${order_id}${status_code}${gross_amount}${serverKey}`;
        const calculatedSignature = crypto.createHash('sha512').update(dataToSign).digest('hex');

        if (calculatedSignature !== signature_key) {
            throw { status: 401, message: 'Invalid signature' };
        }

        // Determine type: INVOICE-{invoiceId}-{ts} or ORDER-{orderId}-{ts}
        const isInvoicePayment = order_id.startsWith('INVOICE-');
        const entityId = parseInt(order_id.split('-')[1]);
        if (isNaN(entityId)) {
            throw { status: 400, message: 'Invalid ID in notification' };
        }

        // Handle transaction status
        if (transaction_status === 'settlement' || transaction_status === 'capture') {
            if (isInvoicePayment) {
                // Monthly billing invoice payment
                const invoice = await prismaClient.billingInvoice.findUnique({ where: { id: entityId } });
                if (!invoice) throw { status: 404, message: 'Invoice not found' };
                await billingService.markLatestInvoicePaid(invoice.userId);
                return { status: 'success', message: 'Invoice payment verified', invoiceId: entityId };
            } else {
                // First-time order payment (registration)
                const order = await prismaClient.order.findUnique({ where: { id: entityId } });
                if (!order) throw { status: 404, message: 'Order not found' };
                await orderService.updateOrderStatus(entityId, 'SURVEY_SCHEDULED');
                await ticketService.markTicketPaid(entityId);
                await billingService.markLatestInvoicePaid(order.userId);
                const orderWithItems = await prismaClient.order.findUnique({
                    where: { id: entityId },
                    include: { items: { include: { package: true } } },
                });
                if (orderWithItems && orderWithItems.items.length > 0) {
                    const paidPackage = orderWithItems.items[0].package;
                    const activeHistory = await prismaClient.packageHistory.findFirst({
                        where: { userId: order.userId, endedAt: null },
                        orderBy: { startedAt: 'desc' },
                    });
                    if (!activeHistory) {
                        await prismaClient.packageHistory.create({
                            data: {
                                userId: order.userId,
                                packageId: paidPackage.id,
                                startedAt: new Date(),
                                reason: 'Aktivasi paket setelah pembayaran',
                            },
                        });
                    } else if (activeHistory.packageId !== paidPackage.id) {
                        await prismaClient.packageHistory.update({
                            where: { id: activeHistory.id },
                            data: { endedAt: new Date(), reason: 'Perubahan paket' },
                        });
                        await prismaClient.packageHistory.create({
                            data: {
                                userId: order.userId,
                                packageId: paidPackage.id,
                                startedAt: new Date(),
                                reason: 'Aktivasi paket setelah pembayaran',
                            },
                        });
                    }
                }
                return { status: 'success', message: 'Payment verified', orderId: entityId };
            }
        } else if (transaction_status === 'pending') {
            return { status: 'pending', message: 'Payment pending', entityId };
        } else if (transaction_status === 'deny' || transaction_status === 'cancel' || transaction_status === 'expire') {
            return { status: 'failed', message: 'Payment failed or cancelled', entityId };
        }

        return { status: 'unknown', message: 'Unknown transaction status', entityId };
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
    createInvoicePaymentToken,
    verifyPaymentNotification,
    getPaymentStatus
};

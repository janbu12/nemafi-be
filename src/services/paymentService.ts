import crypto from 'crypto';
import { prismaClient } from '../application/prisma.js';
import orderService, { type OrderWithDetails } from './orderService.js';
import ticketService from './ticketService.js';
import billingService from './billingService.js';
import appSettingService from './appSettingService.js';
import { calculateProratedAmount } from '../utils/billingUtils.js';

function getActiveGateway() {
    return process.env.ACTIVE_PAYMENT_GATEWAY === 'midtrans' ? 'midtrans' : 'xendit';
}

async function getMidtransConfig() {
    const settings = await appSettingService.getSettingValues(['MIDTRANS_SERVER_KEY']);
    const serverKey = settings.MIDTRANS_SERVER_KEY || process.env.MIDTRANS_SERVER_KEY || '';
    const snapUrl = process.env.MIDTRANS_SNAP_URL || (process.env.NODE_ENV === 'production' ? 'https://app.midtrans.com/snap/snap.js' : 'https://app.sandbox.midtrans.com/snap/snap.js');
    const baseUrl = snapUrl.includes('sandbox') ? 'https://app.sandbox.midtrans.com/snap/v1/transactions' : 'https://app.midtrans.com/snap/v1/transactions';
    return { serverKey, baseUrl };
}

async function getXenditConfig() {
    const settings = await appSettingService.getSettingValues(['XENDIT_SECRET_KEY']);
    const secretKey = settings.XENDIT_SECRET_KEY || process.env.XENDIT_SECRET_KEY || '';
    const webhookToken = process.env.XENDIT_WEBHOOK_TOKEN || '';
    const baseUrl = 'https://api.xendit.co/v2/invoices';
    return { secretKey, webhookToken, baseUrl };
}

// Create Invoice for payment (redirect to Gateway)
async function createPaymentToken(orderId: number, customerName: string, customerEmail: string, customerPhone: string) {
    const gateway = getActiveGateway();
    if (gateway === 'midtrans') {
        return await createMidtransPaymentToken(orderId, customerName, customerEmail, customerPhone);
    } else {
        return await createXenditPaymentToken(orderId, customerName, customerEmail, customerPhone);
    }
}

async function createMidtransPaymentToken(orderId: number, customerName: string, customerEmail: string, customerPhone: string) {
    try {
        const order: OrderWithDetails = await orderService.getOrderById(orderId);
        if (order.status !== 'REVIEW_APPROVED') throw { status: 400, message: 'Order must be in REVIEW_APPROVED status to process payment' };

        const midtransOrderId = `ORDER-${orderId}-${Date.now()}`;
        const notificationUrl = process.env.BACKEND_PUBLIC_URL ? `${process.env.BACKEND_PUBLIC_URL}/api/payment/notification` : 'https://nemafi-be.mzn.my.id/api/payment/notification';
        const finishUrl = `${process.env.APP_URL || 'http://localhost:3000'}/payment/finish/${orderId}`;
        const unfinishUrl = `${process.env.APP_URL || 'http://localhost:3000'}/payment/unfinish/${orderId}`;
        const errorUrl = `${process.env.APP_URL || 'http://localhost:3000'}/payment/error/${orderId}`;

        if (process.env.PAYMENT_SIMULATOR === 'true') {
            console.log(`[SIMULATOR] Simulating payment for order ${orderId} via Midtrans`);
            setTimeout(async () => {
                try {
                    await verifyPaymentNotification({ order_id: midtransOrderId, transaction_status: 'settlement', is_simulator: true });
                } catch (e) {
                    console.error('[SIMULATOR] Error processing fake webhook:', e);
                }
            }, 3000);
            await orderService.saveMidtransTransaction(orderId, 'SIMULATOR-TOKEN', midtransOrderId, finishUrl);
            return { invoiceUrl: finishUrl, snapToken: 'SIMULATOR-TOKEN', externalId: midtransOrderId, gateway: 'midtrans' };
        }

        const transactionData = {
            transaction_details: { order_id: midtransOrderId, gross_amount: Math.ceil(order.total) },
            customer_details: { first_name: customerName, email: customerEmail, phone: customerPhone },
            item_details: order.items.map(item => ({ id: item.package.id.toString(), price: Math.ceil(item.package.price), quantity: 1, name: item.package.name })),
            callbacks: { finish: finishUrl, unfinish: unfinishUrl, error: errorUrl }
        };

        const { serverKey, baseUrl } = await getMidtransConfig();
        if (!serverKey) throw { status: 400, message: 'Konfigurasi Midtrans belum lengkap.' };
        const auth = Buffer.from(`${serverKey}:`).toString('base64');

        const response = await fetch(baseUrl, {
            method: 'POST',
            headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json', 'X-Override-Notification': notificationUrl },
            body: JSON.stringify(transactionData)
        });

        if (!response.ok) {
            const errorBody = await response.text().catch(() => '');
            throw { status: 502, message: `Midtrans error: ${errorBody || 'Failed to create token'}` };
        }

        const result = await response.json() as any;
        await orderService.saveMidtransTransaction(orderId, result.token || '', midtransOrderId, result.redirect_url || '');

        return { snapToken: result.token, invoiceUrl: result.redirect_url, externalId: midtransOrderId, gateway: 'midtrans' };
    } catch (error: any) {
        if (error.status && error.message) throw error;
        throw { status: 500, message: 'Failed to create payment token', error: error.message };
    }
}

async function createXenditPaymentToken(orderId: number, customerName: string, customerEmail: string, customerPhone: string) {
    try {
        const order: OrderWithDetails = await orderService.getOrderById(orderId);
        if (order.status !== 'REVIEW_APPROVED') throw { status: 400, message: 'Order must be in REVIEW_APPROVED status to process payment' };

        const xenditExternalId = `ORDER-${orderId}-${Date.now()}`;
        const finishUrl = `${process.env.APP_URL || 'http://localhost:3000'}/payment/finish/${orderId}`;
        const errorUrl = `${process.env.APP_URL || 'http://localhost:3000'}/payment/error/${orderId}`;

        if (process.env.PAYMENT_SIMULATOR === 'true') {
            console.log(`[SIMULATOR] Simulating payment for order ${orderId} via Xendit`);
            setTimeout(async () => {
                try {
                    await verifyPaymentNotification({ external_id: xenditExternalId, status: 'PAID', is_simulator: true });
                } catch (e) {
                    console.error('[SIMULATOR] Error processing fake webhook:', e);
                }
            }, 3000);
            await orderService.saveXenditTransaction(orderId, 'SIMULATOR-INVOICE', xenditExternalId, finishUrl);
            return { invoiceUrl: finishUrl, externalId: xenditExternalId, gateway: 'xendit' };
        }

        const transactionData = {
            external_id: xenditExternalId,
            amount: Math.ceil(order.total),
            payer_email: customerEmail,
            description: `Payment for Order ${orderId}`,
            customer: { given_names: customerName, email: customerEmail, mobile_number: customerPhone },
            success_redirect_url: finishUrl,
            failure_redirect_url: errorUrl
        };

        const { secretKey, baseUrl } = await getXenditConfig();
        if (!secretKey) throw { status: 400, message: 'Konfigurasi Xendit belum lengkap.' };
        const auth = Buffer.from(`${secretKey}:`).toString('base64');

        const response = await fetch(baseUrl, {
            method: 'POST',
            headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(transactionData)
        });

        if (!response.ok) {
            const errorBody = await response.text().catch(() => '');
            throw { status: 502, message: `Xendit error: ${errorBody || 'Failed to create invoice'}` };
        }

        const result = await response.json() as any;
        await orderService.saveXenditTransaction(orderId, result.id || '', xenditExternalId, result.invoice_url || '');

        return { invoiceUrl: result.invoice_url, externalId: result.external_id, gateway: 'xendit' };
    } catch (error: any) {
        if (error.status && error.message) throw error;
        throw { status: 500, message: 'Failed to create payment token', error: error.message };
    }
}

// Create Invoice for billing invoice payment (monthly renewal)
async function createInvoicePaymentToken(userId: number, customerName: string, customerEmail: string, customerPhone: string) {
    const gateway = getActiveGateway();
    if (gateway === 'midtrans') {
        return await createMidtransInvoiceToken(userId, customerName, customerEmail, customerPhone);
    } else {
        return await createXenditInvoiceToken(userId, customerName, customerEmail, customerPhone);
    }
}

async function createMidtransInvoiceToken(userId: number, customerName: string, customerEmail: string, customerPhone: string) {
    try {
        const invoice = await prismaClient.billingInvoice.findFirst({ where: { userId, status: { in: ['UNPAID', 'OVERDUE'] } }, orderBy: { dueAt: 'desc' } });
        if (!invoice) throw { status: 404, message: 'Tidak ada tagihan yang perlu dibayar.' };

        const midtransOrderId = `INVOICE-${invoice.id}-${Date.now()}`;
        const notificationUrlInvoice = process.env.BACKEND_PUBLIC_URL ? `${process.env.BACKEND_PUBLIC_URL}/api/payment/notification` : 'https://nemafi-be.mzn.my.id/api/payment/notification';
        
        if (process.env.PAYMENT_SIMULATOR === 'true') {
            console.log(`[SIMULATOR] Simulating invoice payment for invoice ${invoice.id} via Midtrans`);
            setTimeout(async () => {
                try {
                    await verifyPaymentNotification({ order_id: midtransOrderId, transaction_status: 'settlement', is_simulator: true });
                } catch (e) {}
            }, 3000);
            return { snapToken: 'SIMULATOR-TOKEN', redirectUrl: `${process.env.APP_URL || 'http://localhost:3000'}/payment/finish-invoice/${invoice.id}`, invoiceId: invoice.id, gateway: 'midtrans' };
        }

        const transactionData = {
            transaction_details: { order_id: midtransOrderId, gross_amount: Math.ceil(invoice.amount) },
            customer_details: { first_name: customerName, email: customerEmail, phone: customerPhone },
            item_details: [{ id: `invoice-${invoice.id}`, price: Math.ceil(invoice.amount), quantity: 1, name: `Tagihan Internet` }]
        };

        const { serverKey, baseUrl } = await getMidtransConfig();
        if (!serverKey) throw { status: 400, message: 'Konfigurasi Midtrans belum lengkap.' };
        const auth = Buffer.from(`${serverKey}:`).toString('base64');

        const response = await fetch(baseUrl, {
            method: 'POST',
            headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json', 'X-Override-Notification': notificationUrlInvoice },
            body: JSON.stringify(transactionData)
        });

        if (!response.ok) throw { status: 502, message: `Midtrans error` };
        const result = await response.json() as any;

        return { snapToken: result.token, invoiceUrl: result.redirect_url, invoiceId: invoice.id, gateway: 'midtrans' };
    } catch (error: any) {
        if (error.status && error.message) throw error;
        throw { status: 500, message: 'Failed to create invoice token', error: error.message };
    }
}

async function createXenditInvoiceToken(userId: number, customerName: string, customerEmail: string, customerPhone: string) {
    try {
        const invoice = await prismaClient.billingInvoice.findFirst({ where: { userId, status: { in: ['UNPAID', 'OVERDUE'] } }, orderBy: { dueAt: 'desc' } });
        if (!invoice) throw { status: 404, message: 'Tidak ada tagihan yang perlu dibayar.' };

        const xenditExternalId = `INVOICE-${invoice.id}-${Date.now()}`;
        const finishUrl = `${process.env.APP_URL || 'http://localhost:3000'}/payment/finish-invoice/${invoice.id}`;
        const errorUrl = `${process.env.APP_URL || 'http://localhost:3000'}/payment/error-invoice/${invoice.id}`;

        if (process.env.PAYMENT_SIMULATOR === 'true') {
            console.log(`[SIMULATOR] Simulating invoice payment for invoice ${invoice.id} via Xendit`);
            setTimeout(async () => {
                try {
                    await verifyPaymentNotification({ external_id: xenditExternalId, status: 'PAID', is_simulator: true });
                } catch (e) {}
            }, 3000);
            return { invoiceUrl: finishUrl, externalId: xenditExternalId, invoiceId: invoice.id, gateway: 'xendit' };
        }

        const transactionData = {
            external_id: xenditExternalId,
            amount: Math.ceil(invoice.amount),
            payer_email: customerEmail,
            description: `Tagihan Internet`,
            customer: { given_names: customerName, email: customerEmail, mobile_number: customerPhone },
            success_redirect_url: finishUrl,
            failure_redirect_url: errorUrl
        };

        const { secretKey, baseUrl } = await getXenditConfig();
        if (!secretKey) throw { status: 400, message: 'Konfigurasi Xendit belum lengkap.' };
        const auth = Buffer.from(`${secretKey}:`).toString('base64');

        const response = await fetch(baseUrl, {
            method: 'POST',
            headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(transactionData)
        });

        if (!response.ok) throw { status: 502, message: `Xendit error` };
        const result = await response.json() as any;

        return { invoiceUrl: result.invoice_url, externalId: result.external_id, invoiceId: invoice.id, gateway: 'xendit' };
    } catch (error: any) {
        if (error.status && error.message) throw error;
        throw { status: 500, message: 'Failed to create invoice token', error: error.message };
    }
}

// Verify payment notification (callback from Midtrans or Xendit)
async function verifyPaymentNotification(notificationBody: any, callbackToken?: string) {
    try {
        const isMidtrans = !!notificationBody.order_id && !!notificationBody.transaction_status;
        const isXendit = !!notificationBody.external_id && !!notificationBody.status;
        const { is_simulator } = notificationBody;

        let statusStr = '';
        let externalIdStr = '';
        
        if (isMidtrans) {
            const { order_id, transaction_status, gross_amount, signature_key, status_code } = notificationBody;
            externalIdStr = order_id;

            if (!is_simulator) {
                const { serverKey } = await getMidtransConfig();
                if (!serverKey) throw { status: 400, message: 'Konfigurasi Midtrans belum lengkap.' };
                const dataToSign = `${order_id}${status_code}${gross_amount}${serverKey}`;
                const calculatedSignature = crypto.createHash('sha512').update(dataToSign).digest('hex');
                if (calculatedSignature !== signature_key) throw { status: 401, message: 'Invalid signature' };
            }

            if (transaction_status === 'settlement' || transaction_status === 'capture') statusStr = 'SUCCESS';
            else if (transaction_status === 'pending') statusStr = 'PENDING';
            else statusStr = 'FAILED';
        } else if (isXendit) {
            const { external_id, status } = notificationBody;
            externalIdStr = external_id;

            if (!is_simulator) {
                const { webhookToken } = await getXenditConfig();
                if (webhookToken && callbackToken !== webhookToken) throw { status: 401, message: 'Invalid callback token' };
            }

            if (status === 'PAID' || status === 'SETTLED') statusStr = 'SUCCESS';
            else if (status === 'PENDING') statusStr = 'PENDING';
            else statusStr = 'FAILED';
        } else {
            throw { status: 400, message: 'Unknown webhook format' };
        }

        const isInvoicePayment = externalIdStr.startsWith('INVOICE-');
        const entityId = parseInt(externalIdStr.split('-')[1]);
        if (isNaN(entityId)) throw { status: 400, message: 'Invalid ID in notification' };

        if (statusStr === 'SUCCESS') {
            if (isInvoicePayment) {
                const invoice = await prismaClient.billingInvoice.findUnique({ where: { id: entityId } });
                if (!invoice) throw { status: 404, message: 'Invoice not found' };
                await billingService.markLatestInvoicePaid(invoice.userId);
                return { status: 'success', message: 'Invoice payment verified', invoiceId: entityId };
            } else {
                const order = await prismaClient.order.findUnique({ where: { id: entityId } });
                if (!order) throw { status: 404, message: 'Order not found' };
                await orderService.updateOrderStatus(entityId, 'SURVEY_SCHEDULED');
                await ticketService.markTicketPaid(entityId);
                
                // Create initial paid BillingInvoice for this registration order if none exists
                const existingInvoice = await prismaClient.billingInvoice.findFirst({
                    where: { userId: order.userId },
                });
                if (!existingInvoice) {
                    const orderDate = new Date(order.createdAt);
                    const { periodStart, periodEnd } = calculateProratedAmount(order.total, orderDate);
                    await prismaClient.billingInvoice.create({
                        data: {
                            userId: order.userId,
                            amount: order.total,
                            periodStart,
                            periodEnd,
                            dueAt: periodEnd,
                            status: 'PAID',
                            paidAt: new Date(),
                        },
                    });
                } else {
                    await billingService.markLatestInvoicePaid(order.userId);
                }
                
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
                            data: { userId: order.userId, packageId: paidPackage.id, startedAt: new Date(), reason: 'Aktivasi paket setelah pembayaran' },
                        });
                    } else if (activeHistory.packageId !== paidPackage.id) {
                        await prismaClient.packageHistory.update({
                            where: { id: activeHistory.id },
                            data: { endedAt: new Date(), reason: 'Perubahan paket' },
                        });
                        await prismaClient.packageHistory.create({
                            data: { userId: order.userId, packageId: paidPackage.id, startedAt: new Date(), reason: 'Aktivasi paket setelah pembayaran' },
                        });
                    }
                }
                return { status: 'success', message: 'Payment verified', orderId: entityId };
            }
        } else if (statusStr === 'PENDING') {
            return { status: 'pending', message: 'Payment pending', entityId };
        } else {
            return { status: 'failed', message: 'Payment failed or expired', entityId };
        }
    } catch (error: any) {
        if (error.status && error.message) throw error;
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
            invoiceUrl: (order as any).redirectUrl,
            gateway: (order as any).paymentGateway
        };
    } catch (error: any) {
        if (error.status && error.message) throw error;
        throw { status: 500, message: 'Error getting payment status' };
    }
}

export default {
    createPaymentToken,
    createInvoicePaymentToken,
    verifyPaymentNotification,
    getPaymentStatus
};

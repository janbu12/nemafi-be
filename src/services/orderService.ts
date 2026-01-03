import { prismaClient } from "../application/prisma.js";
import { emitOrderPending, emitOrderReviewed } from "../application/socket.js";
import { Prisma, Status } from "@prisma/client";

export type OrderWithDetails = Prisma.OrderGetPayload<{
    include: {
        items: { include: { package: true } };
        user: true;
        tickets: true;
    };
}>;

// Get all orders for a user
async function getUserOrders(userId: number) {
    const orders = await prismaClient.order.findMany({
        where: { userId },
        include: {
            items: {
                include: {
                    package: true
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    });
    return orders;
}

// Get single order by ID
async function getOrderById(orderId: number, userId?: number): Promise<OrderWithDetails> {
    const order = await prismaClient.order.findUnique({
        where: { id: orderId },
        include: {
            items: {
                include: {
                    package: true
                }
            },
            user: true,
            tickets: true
        }
    });

    if (!order) throw { status: 404, message: 'Order not found' };
    
    // Check ownership if userId provided (for customer)
    if (userId && order.userId !== userId) {
        throw { status: 403, message: 'Unauthorized to view this order' };
    }

    return order;
}

// Create order manually (optional, usually created during registration)
async function createOrder(userId: number, packageId: number) {
    const pkg = await prismaClient.package.findUnique({
        where: { id: packageId }
    });

    if (!pkg) throw { status: 404, message: 'Package not found' };

    const order = await prismaClient.order.create({
        data: {
            userId,
            total: pkg.price,
            status: 'PENDING_REVIEW',
            items: {
                create: {
                    packageId
                }
            }
        },
        include: {
            items: {
                include: {
                    package: true
                }
            },
            user: {
                include: {
                    profile: true,
                },
            },
        }
    });

    emitOrderPending(order);
    return order;
}

// Admin: Approve order (change status to REVIEW_APPROVED)
async function approveOrder(orderId: number, adminId: number, notes?: string) {
    const order = await prismaClient.order.findUnique({
        where: { id: orderId }
    });

    if (!order) throw { status: 404, message: 'Order not found' };
    if (order.status !== 'PENDING_REVIEW') {
        throw { status: 400, message: 'Order can only be approved from PENDING_REVIEW status' };
    }

    const updatedOrder = await prismaClient.order.update({
        where: { id: orderId },
        data: {
            status: 'REVIEW_APPROVED',
            reviewedBy: adminId,
            reviewNotes: notes
        },
        include: {
            items: {
                include: {
                    package: true
                }
            },
            user: true
        }
    });

    emitOrderReviewed(updatedOrder);
    return updatedOrder;
}

// Admin: Reject order (change status to REVIEW_REJECTED)
async function rejectOrder(orderId: number, adminId: number, notes: string) {
    const order = await prismaClient.order.findUnique({
        where: { id: orderId }
    });

    if (!order) throw { status: 404, message: 'Order not found' };
    if (order.status !== 'PENDING_REVIEW') {
        throw { status: 400, message: 'Order can only be rejected from PENDING_REVIEW status' };
    }

    const updatedOrder = await prismaClient.order.update({
        where: { id: orderId },
        data: {
            status: 'REVIEW_REJECTED',
            reviewedBy: adminId,
            reviewNotes: notes
        },
        include: {
            items: {
                include: {
                    package: true
                }
            },
            user: true
        }
    });

    emitOrderReviewed(updatedOrder);
    return updatedOrder;
}

// Update order status
async function updateOrderStatus(orderId: number, newStatus: Status) {
    const order = await prismaClient.order.findUnique({
        where: { id: orderId }
    });

    if (!order) throw { status: 404, message: 'Order not found' };

    const updatedOrder = await prismaClient.order.update({
        where: { id: orderId },
        data: { status: newStatus },
        include: {
            items: {
                include: {
                    package: true
                }
            }
        }
    });

    return updatedOrder;
}

// Save Midtrans transaction details
async function saveMidtransTransaction(orderId: number, transactionId: string, orderId_midtrans: string, redirectUrl: string) {
    const order = await prismaClient.order.findUnique({
        where: { id: orderId }
    });

    console.log('Saving Midtrans transaction for order:', orderId, 'Transaction ID:', transactionId, 'Midtrans Order ID:', orderId_midtrans, 'Redirect URL:', redirectUrl);

    if (!order) throw { status: 404, message: 'Order not found' };
    if (order.status !== 'REVIEW_APPROVED') {
        throw { status: 400, message: 'Order must be in REVIEW_APPROVED status to process payment' };
    }

    const updatedOrder = await prismaClient.order.update({
        where: { id: orderId },
        data: {
            midtransTransactionId: transactionId,
            midtransOrderId: orderId_midtrans,
            redirectUrl,
        },
        include: {
            items: {
                include: {
                    package: true
                }
            }
        }
    });

    return { ...updatedOrder, redirectUrl, midtransTransactionId: transactionId, midtransOrderId: orderId_midtrans };
}

// Get all pending review orders (for admin)
async function getPendingReviewOrders() {
    const orders = await prismaClient.order.findMany({
        where: { status: 'PENDING_REVIEW' },
        include: {
            items: {
                include: {
                    package: true
                }
            },
            user: {
                include: {
                    profile: true,
                },
            },
        },
        orderBy: { createdAt: 'asc' }
    });
    return orders;
}

export default {
    getUserOrders,
    getOrderById,
    createOrder,
    approveOrder,
    rejectOrder,
    updateOrderStatus,
    saveMidtransTransaction,
    getPendingReviewOrders
};

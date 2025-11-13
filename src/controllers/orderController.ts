import { Request, Response } from 'express';
import orderService from '../services/orderService.js';
import { createOrderValidation, approveOrderValidation, rejectOrderValidation, updateOrderStatusValidation } from '../validation/orderValidation.js';
import * as responseHandler from '../utils/responseHandler.js';

// Get all orders for current user
export async function getUserOrders(req: Request, res: Response) {
    try {
        const userId = (req as any).user.id;
        const orders = await orderService.getUserOrders(userId);
        return responseHandler.success(res, orders, 'Orders retrieved successfully');
    } catch (error: any) {
        if (error.status && error.message) {
            return responseHandler.error(res, error.message, error.status);
        }
        return responseHandler.error(res, 'Internal server error', 500);
    }
}

// Get single order detail
export async function getOrderDetail(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const userId = (req as any).user.id;
        const userRole = (req as any).user.role;
        
        const orderId = parseInt(id);
        if (isNaN(orderId)) {
            return responseHandler.error(res, 'Invalid order ID', 400);
        }

        // Admin can view any order, customer can only view their own
        const order = await orderService.getOrderById(orderId, userRole === 'CUSTOMER' ? userId : undefined);
        return responseHandler.success(res, order, 'Order retrieved successfully');
    } catch (error: any) {
        if (error.status && error.message) {
            return responseHandler.error(res, error.message, error.status);
        }
        return responseHandler.error(res, 'Internal server error', 500);
    }
}

// Create order manually
export async function createOrder(req: Request, res: Response) {
    try {
        const userId = (req as any).user.id;
        const data = createOrderValidation.parse(req.body);

        const order = await orderService.createOrder(userId, data.packageId);
        return responseHandler.success(res, order, 'Order created successfully');
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

// Admin: Approve order
export async function approveOrder(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const adminId = (req as any).user.id;
        const data = approveOrderValidation.parse(req.body);

        const orderId = parseInt(id);
        if (isNaN(orderId)) {
            return responseHandler.error(res, 'Invalid order ID', 400);
        }

        const order = await orderService.approveOrder(orderId, adminId, data.notes);
        return responseHandler.success(res, order, 'Order approved successfully');
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

// Admin: Reject order
export async function rejectOrder(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const adminId = (req as any).user.id;
        const data = rejectOrderValidation.parse(req.body);

        const orderId = parseInt(id);
        if (isNaN(orderId)) {
            return responseHandler.error(res, 'Invalid order ID', 400);
        }

        const order = await orderService.rejectOrder(orderId, adminId, data.notes);
        return responseHandler.success(res, order, 'Order rejected successfully');
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

// Get pending review orders (for admin dashboard)
export async function getPendingReviewOrders(req: Request, res: Response) {
    try {
        const orders = await orderService.getPendingReviewOrders();
        return responseHandler.success(res, orders, 'Pending review orders retrieved successfully');
    } catch (error: any) {
        if (error.status && error.message) {
            return responseHandler.error(res, error.message, error.status);
        }
        return responseHandler.error(res, 'Internal server error', 500);
    }
}

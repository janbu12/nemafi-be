import { Router } from 'express';
import { getUserOrders, getOrderDetail, createOrder, approveOrder, rejectOrder, getPendingReviewOrders } from '../controllers/orderController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { roleMiddleware } from '../middlewares/roleMiddleware.js';

export const orderRoutes = Router();

// All authenticated users can see their orders
orderRoutes.get('/', authMiddleware, getUserOrders);
orderRoutes.get('/:id', authMiddleware, getOrderDetail);

// Customer can create order
orderRoutes.post('/', authMiddleware, roleMiddleware(['CUSTOMER']), createOrder);

// Admin/Tech Admin can review orders
orderRoutes.post('/:id/approve', authMiddleware, roleMiddleware(['TECH_ADMIN']), approveOrder);
orderRoutes.post('/:id/reject', authMiddleware, roleMiddleware(['TECH_ADMIN']), rejectOrder);

// Get pending review orders for admin dashboard
orderRoutes.get('/admin/pending-review', authMiddleware, roleMiddleware(['TECH_ADMIN']), getPendingReviewOrders);

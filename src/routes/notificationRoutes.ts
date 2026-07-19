import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import notificationController from '../controllers/notificationController.js';

export const notificationRoutes = Router();

notificationRoutes.use(authMiddleware);
notificationRoutes.get('/', notificationController.list);
notificationRoutes.get('/unread-count', notificationController.unreadCount);
notificationRoutes.patch('/read-all', notificationController.markAllAsRead);
notificationRoutes.patch('/:id/read', notificationController.markAsRead);

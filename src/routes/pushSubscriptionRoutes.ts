import { Router } from 'express';
import pushSubscriptionController from '../controllers/pushSubscriptionController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

export const pushSubscriptionRoutes = Router();

pushSubscriptionRoutes.get('/vapid-public-key', pushSubscriptionController.getPublicKey);
pushSubscriptionRoutes.post('/subscribe', authMiddleware, pushSubscriptionController.subscribe);
pushSubscriptionRoutes.post('/unsubscribe', authMiddleware, pushSubscriptionController.unsubscribe);

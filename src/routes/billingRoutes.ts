import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import billingController from '../controllers/billingController.js';

export const billingRoutes = Router();
billingRoutes.use(authMiddleware);

billingRoutes.post('/billing/pay-latest', billingController.payLatest);

import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { roleMiddleware } from '../middlewares/roleMiddleware.js';
import { Role } from '@prisma/client';
import billingController from '../controllers/billingController.js';

export const billingRoutes = Router();
billingRoutes.use(authMiddleware);

billingRoutes.post('/billing/pay-latest', billingController.payLatest);
billingRoutes.get('/billing/invoices', roleMiddleware([Role.TECH_ADMIN, Role.SUPER_ADMIN]), billingController.listInvoices);
billingRoutes.get('/billing/invoices/:id', roleMiddleware([Role.TECH_ADMIN, Role.SUPER_ADMIN]), billingController.getInvoiceDetail);

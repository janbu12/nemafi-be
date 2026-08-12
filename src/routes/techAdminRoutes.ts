import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { roleMiddleware } from '../middlewares/roleMiddleware.js';
import { Role } from '@prisma/client';
import dashboardController from '../controllers/dashboardController.js';

export const techAdminRouter = Router();

techAdminRouter.use(authMiddleware);

techAdminRouter.get('/tech-admin', roleMiddleware([Role.TECH_ADMIN, Role.SUPER_ADMIN]), (req, res) => {
    res.json({ message: 'Welcome Tech Admin' });
});

techAdminRouter.get(
  '/admin/dashboard-stats',
  roleMiddleware([Role.TECH_ADMIN, Role.SUPER_ADMIN]),
  dashboardController.getAdminDashboardStats
);


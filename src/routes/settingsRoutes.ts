import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { roleMiddleware } from '../middlewares/roleMiddleware.js';
import { Role } from '@prisma/client';
import billingSettingsController from '../controllers/billingSettingsController.js';

export const settingsRouter = Router();

settingsRouter.use(authMiddleware);
settingsRouter.use(roleMiddleware([Role.TECH_ADMIN, Role.SUPER_ADMIN]));

settingsRouter.get('/billing', billingSettingsController.getSettings);
settingsRouter.put('/billing', billingSettingsController.updateSettings);

import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { roleMiddleware } from '../middlewares/roleMiddleware.js';
import { Role } from '@prisma/client';
import appSettingController from '../controllers/appSettingController.js';

export const appSettingRouter = Router();

appSettingRouter.use(authMiddleware);
appSettingRouter.use(roleMiddleware([Role.TECH_ADMIN, Role.SUPER_ADMIN]));

appSettingRouter.get('/', appSettingController.list);
appSettingRouter.put('/', appSettingController.update);

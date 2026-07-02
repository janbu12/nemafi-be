import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { roleMiddleware } from '../middlewares/roleMiddleware.js';
import { Role } from '@prisma/client';
import integrationTestController from '../controllers/integrationTestController.js';

export const integrationTestRouter = Router();

integrationTestRouter.use(authMiddleware);
integrationTestRouter.use(roleMiddleware([Role.TECH_ADMIN, Role.SUPER_ADMIN]));

integrationTestRouter.post('/r2', integrationTestController.testR2);
integrationTestRouter.post('/xendit', integrationTestController.testXendit);
integrationTestRouter.post('/midtrans', integrationTestController.testMidtrans);
integrationTestRouter.post('/gemini', integrationTestController.testGemini);

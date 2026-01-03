import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { roleMiddleware } from '../middlewares/roleMiddleware.js';
import { Role } from '@prisma/client';
import ticketController from '../controllers/ticketController.js';

export const ticketRouter = Router();

ticketRouter.use(authMiddleware);

// Routes untuk Tech Admin
ticketRouter.post('/', roleMiddleware([Role.TECH_ADMIN]), ticketController.create);
ticketRouter.get('/', roleMiddleware([Role.TECH_ADMIN]), ticketController.getAll);
ticketRouter.get('/categories', roleMiddleware([Role.TECH_ADMIN]), ticketController.getCategories);
ticketRouter.post('/categories', roleMiddleware([Role.TECH_ADMIN]), ticketController.createCategory);
ticketRouter.patch('/categories/:id', roleMiddleware([Role.TECH_ADMIN]), ticketController.updateCategory);
ticketRouter.delete('/categories/:id', roleMiddleware([Role.TECH_ADMIN]), ticketController.deleteCategory);
ticketRouter.get('/:id/history', roleMiddleware([Role.TECH_ADMIN]), ticketController.getHistory);
ticketRouter.patch('/:id/assign', roleMiddleware([Role.TECH_ADMIN]), ticketController.assign);
ticketRouter.post('/:id/complete-survey', roleMiddleware([Role.TECH_ADMIN]), ticketController.completeSurvey);

// Routes untuk Teknisi
ticketRouter.get('/my-tickets', roleMiddleware([Role.TECHNICIAN]), ticketController.getMy);
ticketRouter.patch('/:id/status', roleMiddleware([Role.TECHNICIAN]), ticketController.updateStatus);

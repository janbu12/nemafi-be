import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { roleMiddleware } from '../middlewares/roleMiddleware.js';
import { Role } from '@prisma/client';
import coveredAreaController from '../controllers/coveredAreaController.js';

export const coveredAreaRouter = Router(); // <-- Diubah

coveredAreaRouter.use(authMiddleware, roleMiddleware([Role.TECH_ADMIN]));

coveredAreaRouter.post('/', coveredAreaController.addArea);
coveredAreaRouter.get('/', coveredAreaController.getAllAreas);
coveredAreaRouter.delete('/:id', coveredAreaController.deleteArea);
coveredAreaRouter.put('/:id', coveredAreaController.updateArea);
coveredAreaRouter.get('/history', coveredAreaController.getHistory);
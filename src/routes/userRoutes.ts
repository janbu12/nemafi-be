import { Router } from 'express';
import userController from '../controllers/userController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { roleMiddleware } from '../middlewares/roleMiddleware.js';
import { Role } from '@prisma/client';
import profileController from '../controllers/profileController.js';

export const userRouter = Router();
userRouter.use(authMiddleware);

// CRUD USER
userRouter.get('/', roleMiddleware([Role.TECH_ADMIN]), userController.listUsers);
userRouter.get('/technicians', roleMiddleware([Role.TECHNICIAN, Role.TECH_ADMIN]), userController.listTechnicians);
userRouter.get('/:id', roleMiddleware([Role.TECH_ADMIN]), userController.getUser);
userRouter.post('/', roleMiddleware([Role.TECH_ADMIN]), userController.createUser);
userRouter.patch('/:id', roleMiddleware([Role.TECH_ADMIN]), userController.updateUser);
userRouter.delete('/:id', roleMiddleware([Role.TECH_ADMIN]), userController.deleteUser);
userRouter.patch('/:id/reset-password', roleMiddleware([Role.SUPER_ADMIN]), userController.resetPassword);


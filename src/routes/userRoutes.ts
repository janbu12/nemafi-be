import { Router } from 'express';
import userController from '../controllers/user-controller.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { roleMiddleware } from '../middlewares/roleMiddleware.js';
import { Role } from '@prisma/client';


export const userRouter = Router();
userRouter.use(authMiddleware);

// CRUD USER
userRouter.get('/', roleMiddleware([Role.TECH_ADMIN]), userController.listUsers);
userRouter.get('/:id', roleMiddleware([Role.TECH_ADMIN]), userController.getUser);
userRouter.post('/', roleMiddleware([Role.TECH_ADMIN]), userController.createUser);
userRouter.patch('/:id', roleMiddleware([Role.TECH_ADMIN]), userController.updateUser);
userRouter.delete('/:id', roleMiddleware([Role.TECH_ADMIN]), userController.deleteUser);

// GENERAL USER ROUTE
userRouter.get('/profile/me', userController.meProfile);
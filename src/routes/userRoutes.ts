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
userRouter.get('/:id', roleMiddleware([Role.TECH_ADMIN]), userController.getUser);
userRouter.post('/', roleMiddleware([Role.TECH_ADMIN]), userController.createUser);
userRouter.patch('/:id', roleMiddleware([Role.TECH_ADMIN]), userController.updateUser);
userRouter.delete('/:id', roleMiddleware([Role.TECH_ADMIN]), userController.deleteUser);

// Profile Route
userRouter.get('/profile', profileController.meProfile);
userRouter.patch('/profile', profileController.updateProfile);
userRouter.patch('/profile/email', profileController.updateEmail);
userRouter.patch('/profile/password', profileController.updatePassword);
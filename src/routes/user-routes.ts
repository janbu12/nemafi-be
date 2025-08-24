import { Router } from 'express';
import userController from '../controllers/user-controller.js';


export const userRouter = Router();

userRouter.get('/', userController.listUsers);
userRouter.get('/:id', userController.getUser);
userRouter.post('/', userController.createUser);
userRouter.patch('/:id', userController.updateUser);
userRouter.delete('/:id', userController.deleteUser);
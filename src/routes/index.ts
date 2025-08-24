import { Router } from 'express';
import { userRouter } from './user-routes.js';
import { publicRouter } from './public-routes.js';
import { authRouter } from './auth-routes.js';


export const router = Router();

router.use(publicRouter);
router.use('/users', userRouter);
router.use('/auth', authRouter);

import { Router } from 'express';
import { userRouter } from './user-routes.js';
import { publicRouter } from './public-routes.js';
import { authRouter } from './auth-routes.js';
import { techAdminRouter } from './techAdmin-routes.js';
import { technicianRouter } from './technician-routes.js';


export const router = Router();

router.use(publicRouter);
router.use('/users', userRouter);
router.use('/auth', authRouter);
router.use(techAdminRouter);
router.use(technicianRouter);

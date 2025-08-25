import { Router } from 'express';
import { userRouter } from './user-routes.js';
import { publicRouter } from './public-routes.js';
import { authRouter } from './auth-routes.js';
import { techAdminRouter } from './techAdmin-routes.js';
import { technicianRouter } from './technician-routes.js';
import { categoryPackageRoutes } from './categoryPackageRoutes.js';
import { packageRoutes } from './packageRoutes.js';


export const router = Router();

router.use(publicRouter);
router.use('/users', userRouter);
router.use('/auth', authRouter);
router.use('/category-packages', categoryPackageRoutes);
router.use('/packages', packageRoutes);
router.use(techAdminRouter);
router.use(technicianRouter);

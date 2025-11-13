import { Router } from 'express';
import { userRouter } from './userRoutes.js';
import { publicRouter } from './publicRoutes.js';
import { authRouter } from './authRoutes.js';
import { techAdminRouter } from './techAdminRoutes.js';
import { technicianRouter } from './technicianRoutes.js';
import { categoryPackageRoutes } from './categoryPackageRoutes.js';
import { packageRoutes } from './packageRoutes.js';
import { ticketRouter } from './ticketRoute.js';
import { coveredAreaRouter } from './coveredAreaRoutes.js';
import { routerRoutes } from './routerRoutes.js';
import { profileRouter } from './profileRoutes.js';
import healthRouter from './healthRoutes.js';


export const router = Router();

router.use(publicRouter);
router.use('/users', userRouter);
router.use('/profile', profileRouter);
router.use('/auth', authRouter);
router.use('/category-packages', categoryPackageRoutes);
router.use('/packages', packageRoutes);
router.use('/tickets', ticketRouter);
router.use('/covered-areas', coveredAreaRouter);
router.use('/routers', routerRoutes);
router.use('/health', healthRouter);

router.use(techAdminRouter);
router.use(technicianRouter);

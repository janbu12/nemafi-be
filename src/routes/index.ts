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
import { orderRoutes } from './orderRoutes.js';
import { paymentRoutes } from './paymentRoutes.js';
import { inventoryRoutes } from './inventoryRoutes.js';
import { inventoryCategoryRoutes } from './inventoryCategoryRoutes.js';
import { billingRoutes } from './billingRoutes.js';
import { uploadRoutes } from './uploadRoutes.js';


export const router = Router();

router.use(publicRouter);
router.use('/users', userRouter);
router.use('/profile', profileRouter);
router.use('/auth', authRouter);
router.use('/category-packages', categoryPackageRoutes);
router.use('/packages', packageRoutes);
router.use('/inventory-categories', inventoryCategoryRoutes);
router.use('/inventories', inventoryRoutes);
router.use('/tickets', ticketRouter);
router.use('/covered-areas', coveredAreaRouter);
router.use('/routers', routerRoutes);
router.use('/orders', orderRoutes);
router.use('/payment', paymentRoutes);
router.use(billingRoutes);
router.use(uploadRoutes);

router.use(techAdminRouter);
router.use(technicianRouter);

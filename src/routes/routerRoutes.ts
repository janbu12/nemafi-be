import { Router } from 'express';
import routerController from '../controllers/routerController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { roleMiddleware } from '../middlewares/roleMiddleware.js';
import { Role } from '@prisma/client';

export const routerRoutes = Router();

// Lindungi semua rute di bawah ini hanya untuk TECH_ADMIN
routerRoutes.use(authMiddleware, roleMiddleware([Role.TECH_ADMIN]));

routerRoutes.post('/', routerController.create);
routerRoutes.get('/', routerController.getAll);
routerRoutes.get('/:id', routerController.getById);
routerRoutes.put('/:id', routerController.update);
routerRoutes.delete('/:id', routerController.remove);
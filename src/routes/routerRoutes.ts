import { Router } from 'express';
import routerController from '../controllers/routerController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { roleMiddleware } from '../middlewares/roleMiddleware.js';
import { Role } from '@prisma/client';

export const routerRoutes = Router();

// Endpoint untuk inisialisasi sesi Webfig (diakses via query token/Authorization header)
routerRoutes.get('/:id/webfig-session', routerController.createWebfigSession);

routerRoutes.use(authMiddleware, roleMiddleware([Role.TECH_ADMIN, Role.SUPER_ADMIN, Role.TECHNICIAN]));

routerRoutes.post('/', routerController.create);
routerRoutes.get('/', routerController.getAll);
routerRoutes.get('/:id', routerController.getById);
routerRoutes.put('/:id', routerController.update);
routerRoutes.delete('/:id', routerController.remove);

routerRoutes.post('/test-connection-config', routerController.testConnectionConfig);
routerRoutes.post('/:id/test-connection', routerController.testConnection);
routerRoutes.post('/:id/pppoe-users', routerController.addPppoeUser);
routerRoutes.get('/:id/active-users', routerController.activeUsers);

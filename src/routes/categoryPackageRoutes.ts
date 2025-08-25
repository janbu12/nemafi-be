import { Router } from 'express';
import categoryPackageController from '../controllers/categoryPackageController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { roleMiddleware } from '../middlewares/roleMiddleware.js';
import { Role } from '@prisma/client';

const router = Router();

router.use(authMiddleware, roleMiddleware([Role.TECH_ADMIN]));

router.post('/', categoryPackageController.create);
router.get('/', categoryPackageController.getAll);
router.get('/:id', categoryPackageController.getById);
router.put('/:id', categoryPackageController.update);
router.delete('/:id', categoryPackageController.remove);

export const categoryPackageRoutes = router;

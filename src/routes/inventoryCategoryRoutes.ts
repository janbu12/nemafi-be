import { Router } from 'express';
import inventoryCategoryController from '../controllers/inventoryCategoryController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { roleMiddleware } from '../middlewares/roleMiddleware.js';
import { Role } from '@prisma/client';

const router = Router();

router.use(authMiddleware, roleMiddleware([Role.TECH_ADMIN]));

router.post('/', inventoryCategoryController.create);
router.get('/', inventoryCategoryController.getAll);
router.get('/:id', inventoryCategoryController.getById);
router.put('/:id', inventoryCategoryController.update);
router.delete('/:id', inventoryCategoryController.remove);

export const inventoryCategoryRoutes = router;

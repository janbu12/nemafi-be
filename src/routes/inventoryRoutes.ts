import { Router } from 'express';
import inventoryController from '../controllers/inventoryController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { roleMiddleware } from '../middlewares/roleMiddleware.js';
import { Role } from '@prisma/client';

const router = Router();

router.use(authMiddleware, roleMiddleware([Role.TECH_ADMIN]));

router.post('/', inventoryController.create);
router.get('/', inventoryController.getAll);
router.get('/:id', inventoryController.getById);
router.put('/:id', inventoryController.update);
router.delete('/:id', inventoryController.remove);

export const inventoryRoutes = router;

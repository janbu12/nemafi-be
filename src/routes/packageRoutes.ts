import { Router } from 'express';
import packageController from '../controllers/packageController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { roleMiddleware } from '../middlewares/roleMiddleware.js';
import { Role } from '@prisma/client';

const router = Router();

router.use(authMiddleware, roleMiddleware([Role.TECH_ADMIN]));

router.post('/', packageController.create);
router.get('/', packageController.getAll);
router.get('/:id', packageController.getById);
router.put('/:id', packageController.update);
router.delete('/:id', packageController.remove);

export const packageRoutes = router;

import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { roleMiddleware } from '../middlewares/roleMiddleware.js';
import { Role } from '@prisma/client';

export const technicianRouter = Router();

technicianRouter.use(authMiddleware);

technicianRouter.get('/technician', roleMiddleware([Role.TECHNICIAN]), (req, res) => {
    res.json({ message: 'Welcome Technician' });
});

import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import uploadController from '../controllers/uploadController.js';

export const uploadRoutes = Router();
uploadRoutes.use(authMiddleware);

uploadRoutes.post('/uploads/presign', uploadController.createPresign);

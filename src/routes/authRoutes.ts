import { Router } from "express";
import authController from "../controllers/authController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

export const authRouter = Router();

authRouter.post('/login', authController.login);
authRouter.post('/register', authController.register);

authRouter.post('/logout', authMiddleware, authController.logout);
authRouter.post('/refresh-token', (_req, res) => {});
authRouter.post('/forgot-password', (_req, res) => {});
authRouter.post('/reset-password', (_req, res) => {});
authRouter.get('/verify-email', (_req, res) => {});
authRouter.post('/resend-verification', (_req, res) => {});
authRouter.post('/change-password', (_req, res) => {});
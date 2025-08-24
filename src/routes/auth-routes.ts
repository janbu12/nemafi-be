import { Router } from "express";

export const authRouter = Router();

authRouter.post('/login', (_req, res) => {});
authRouter.post('/register', (_req, res) => {});
authRouter.post('/logout', (_req, res) => {});
authRouter.post('/refresh-token', (_req, res) => {});
authRouter.post('/forgot-password', (_req, res) => {});
authRouter.post('/reset-password', (_req, res) => {});
authRouter.get('/verify-email', (_req, res) => {});
authRouter.post('/resend-verification', (_req, res) => {});
authRouter.post('/change-password', (_req, res) => {});
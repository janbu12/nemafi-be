import { Router } from "express";
import { registerUser, loginUser } from "../services/userService.js";

export const authRouter = Router();

authRouter.post('/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
        const result = await loginUser({ email, password });
        res.json(result);
    } catch (err) {
        next(err);
    }
});

authRouter.post('/register', async (req, res, next) => {
    try {
        const { email, password, name } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
        const result = await registerUser({ email, password, name });
        res.status(201).json(result);
    } catch (err) {
        next(err);
    }
});

authRouter.post('/logout', (_req, res) => {});
authRouter.post('/refresh-token', (_req, res) => {});
authRouter.post('/forgot-password', (_req, res) => {});
authRouter.post('/reset-password', (_req, res) => {});
authRouter.get('/verify-email', (_req, res) => {});
authRouter.post('/resend-verification', (_req, res) => {});
authRouter.post('/change-password', (_req, res) => {});
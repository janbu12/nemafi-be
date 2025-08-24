import { Router } from "express";

export const publicRouter = Router();

publicRouter.get('/', (_req, res) => {
    res.redirect('/api/health');
});

publicRouter.get('/health', (_req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
});

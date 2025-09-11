import { Router } from "express";
import coveredAreaController from "../controllers/coveredAreaController";

export const publicRouter = Router();

publicRouter.get('/', (_req, res) => {
    res.redirect('/api/health');
});

publicRouter.get('/health', (_req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
});

publicRouter.post('/covered-areas/check', coveredAreaController.check);
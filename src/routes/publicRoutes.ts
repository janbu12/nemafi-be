import { Router } from "express";
import coveredAreaController from "../controllers/coveredAreaController.js";
import recommendationController from "../controllers/recommendationController.js";

export const publicRouter = Router();

publicRouter.get('/', (_req, res) => {
    res.redirect('/api/health');
});

publicRouter.get('/health', (_req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
});

publicRouter.post('/covered-areas/check', coveredAreaController.check);
publicRouter.post('/recommendations/package', recommendationController.getRecommendation);
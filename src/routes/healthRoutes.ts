import { Router } from 'express';
import { healthCheck, replicationStatus } from '../controllers/healthController.js';

const router = Router();

// Health check endpoint
router.get('/health', healthCheck);

// Replication status endpoint
router.get('/replication', replicationStatus);

export default router;

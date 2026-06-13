import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { router } from '../routes/index.js';
import { errorHandler } from '../middlewares/errorHandler.js';
import billingService from '../services/billingService.js';
import cron from 'node-cron';


export const web = express();

web.use(helmet());
web.use(cors({
  origin: process.env.FRONTEND_URL?.split(','),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
web.use(express.json());


web.use('/api', router);

if (process.env.ENABLE_BILLING_AUTOMATION === 'true') {
  (async () => {
    const settings = await billingService.getBillingSettings();
    if (!settings.automationEnabled) return;

    cron.schedule(settings.suspendCron, () => {
      billingService.applyOverdueSuspension(settings.graceDays).catch(() => {
        // ignore background errors
      });
    });

    cron.schedule(settings.renewCron, () => {
      billingService.generateMonthlyInvoices().catch(() => {
        // ignore background errors
      });
    });
  })().catch(() => {
    // ignore settings load errors
  });
}

web.use(errorHandler);

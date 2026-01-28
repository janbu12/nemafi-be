import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { router } from '../routes/index.js';
import { errorHandler } from '../middlewares/errorHandler.js';
import billingService from '../services/billingService.js';
import cron from 'node-cron';


export const web = express();


web.use(helmet());
web.use(cors());
web.use(express.json());


web.use('/api', router);

if (process.env.ENABLE_BILLING_AUTOMATION === 'true') {
  const suspendCron = process.env.BILLING_SUSPEND_CRON || '0 * * * *';
  const renewCron = process.env.BILLING_RENEW_CRON || '10 0 1 * *';

  cron.schedule(suspendCron, () => {
    billingService.applyOverdueSuspension(3).catch(() => {
      // ignore background errors
    });
  });

  cron.schedule(renewCron, () => {
    billingService.generateMonthlyInvoices().catch(() => {
      // ignore background errors
    });
  });
}

web.use(errorHandler);

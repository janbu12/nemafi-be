import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { router } from '../routes/index.js';
import { errorHandler } from '../middlewares/errorHandler.js';
import billingService from '../services/billingService.js';


export const web = express();


web.use(helmet());
web.use(cors());
web.use(express.json());


web.use('/api', router);

if (process.env.ENABLE_BILLING_AUTOMATION === 'true') {
  setInterval(() => {
    billingService.applyOverdueSuspension(3).catch(() => {
      // ignore background errors
    });
  }, 60 * 60 * 1000);
}

web.use(errorHandler);

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { router } from '../routes/index.js';
import { errorHandler } from '../middlewares/errorHandler.js';
import billingService from '../services/billingService.js';
import cron from 'node-cron';
import routerController from '../controllers/routerController.js';


export const web = express();

// Helper to parse cookies for route checking
function parseCookies(cookieHeader?: string): Record<string, string> {
  const list: Record<string, string> = {};
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    const name = parts.shift()?.trim();
    if (name) {
      list[name] = decodeURI(parts.join('='));
    }
  });
  return list;
}

// Catch-all proxy middleware for all non-API routes when a Webfig session is active.
// Placed before helmet and express.json to prevent stream hanging and header/CSP interference.
web.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }

  const cookies = parseCookies(req.headers.cookie);
  if (cookies['active_router_id']) {
    return routerController.webfigProxy(req, res);
  }

  // If no active router session and requesting root, return a clear session error message
  if (req.path === '/' || req.path === '/index.html') {
    return res.status(400).send('Sesi router tidak aktif atau kedaluwarsa. Silakan buka kembali dari panel router.');
  }

  next();
});

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

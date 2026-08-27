import { Request, Response } from 'express';
import billingService from '../services/billingService.js';
import { success } from '../utils/responseHandler.js';

async function getSettings(_req: Request, res: Response, next: Function) {
  try {
    const settings = await billingService.getBillingSettings();
    return success(res, settings, 'Billing settings');
  } catch (e) {
    next(e);
  }
}

async function updateSettings(req: Request, res: Response, next: Function) {
  try {
    const updated = await billingService.updateBillingSettings(req.body || {});
    return success(res, updated, 'Billing settings updated');
  } catch (e) {
    next(e);
  }
}

async function triggerSuspend(_req: Request, res: Response, next: Function) {
  try {
    const settings = await billingService.getBillingSettings();
    const result = await billingService.applyOverdueSuspension(settings.graceDays);
    return success(
      res,
      result,
      `Pengecekan jatuh tempo selesai: ${result.updated} faktur diubah menjadi OVERDUE (${result.userCount} pelanggan diisolir)`
    );
  } catch (e) {
    next(e);
  }
}

async function triggerRenew(_req: Request, res: Response, next: Function) {
  try {
    const result = await billingService.generateMonthlyInvoices();
    return success(
      res,
      result,
      `Penerbitan tagihan bulanan selesai: ${result.created} faktur baru berhasil dibuat`
    );
  } catch (e) {
    next(e);
  }
}

export default {
  getSettings,
  updateSettings,
  triggerSuspend,
  triggerRenew,
};

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

export default {
  getSettings,
  updateSettings,
};

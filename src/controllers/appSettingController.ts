import { Request, Response } from 'express';
import appSettingService from '../services/appSettingService.js';
import { success } from '../utils/responseHandler.js';
import { AuthRequest } from '../middlewares/authMiddleware.js';

async function list(_req: Request, res: Response, next: Function) {
  try {
    const settings = await appSettingService.listSettings();
    return success(res, settings, 'Daftar pengaturan');
  } catch (e) {
    next(e);
  }
}

async function update(req: AuthRequest, res: Response, next: Function) {
  try {
    const payload = Array.isArray(req.body) ? req.body : [];
    const updated = await appSettingService.updateSettings(payload, req.user?.id ?? null);
    return success(res, updated, 'Pengaturan diperbarui');
  } catch (e) {
    next(e);
  }
}

export default {
  list,
  update,
};

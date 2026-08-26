import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware.js';
import dashboardService from '../services/dashboardService.js';
import { success } from '../utils/responseHandler.js';

async function getAdminDashboardStats(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { startDate, endDate, month, year, period } = req.query as {
      startDate?: string;
      endDate?: string;
      month?: string;
      year?: string;
      period?: string;
    };
    const stats = await dashboardService.getAdminDashboardStats({ startDate, endDate, month, year, period });
    return success(res, stats, 'Admin dashboard statistics');
  } catch (e) {
    next(e);
  }
}

export default {
  getAdminDashboardStats,
};

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware.js';
import billingService from '../services/billingService.js';
import { success } from '../utils/responseHandler.js';

async function payLatest(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return success(res, null, 'Unauthorized', 401);
    }
    const invoice = await billingService.markLatestInvoicePaid(userId);
    if (!invoice) {
      return success(res, null, 'Tidak ada tagihan yang bisa dibayar', 404);
    }
    return success(res, invoice, 'Invoice paid');
  } catch (e) {
    next(e);
  }
}

export default {
  payLatest,
};

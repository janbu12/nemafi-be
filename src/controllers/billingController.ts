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

async function listInvoices(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const invoices = await billingService.listInvoices();
    return success(res, invoices, 'Billing invoices');
  } catch (e) {
    next(e);
  }
}

async function getInvoiceDetail(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const invoice = await billingService.getInvoiceById(id);
    if (!invoice) return success(res, null, 'Invoice not found', 404);
    return success(res, invoice, 'Billing invoice detail');
  } catch (e) {
    next(e);
  }
}

export default {
  payLatest,
  listInvoices,
  getInvoiceDetail,
};

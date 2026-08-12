import { Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
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

    if (req.user?.role === Role.CUSTOMER && invoice.userId !== req.user.id) {
      return success(res, null, 'Unauthorized access to this invoice', 403);
    }

    return success(res, invoice, 'Billing invoice detail');
  } catch (e) {
    next(e);
  }
}

async function updateInvoiceStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;
    if (!['PAID', 'UNPAID', 'OVERDUE'].includes(status)) {
      return success(res, null, 'Status tidak valid', 400);
    }
    const invoice = await billingService.updateInvoiceStatus(id, status);
    if (!invoice) return success(res, null, 'Invoice tidak ditemukan', 404);
    return success(res, invoice, `Status invoice berhasil diubah menjadi ${status}`);
  } catch (e) {
    next(e);
  }
}

export default {
  payLatest,
  listInvoices,
  getInvoiceDetail,
  updateInvoiceStatus,
};

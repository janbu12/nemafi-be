import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware.js';
import ticketService from '../services/ticketService.js';
import { success } from '../utils/responseHandler.js';

// Admin
async function create(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await ticketService.createTicket(req.body);
    return success(res, result, 'Ticket created', 201);
  } catch (e) {
    next(e);
  }
}

// Admin
async function assign(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const ticketId = Number(req.params.id);
    const result = await ticketService.assignTicket(ticketId, req.body);
    return success(res, result, 'Ticket assigned');
  } catch (e) {
    next(e);
  }
}

// Teknisi
async function updateStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const ticketId = Number(req.params.id);
      const result = await ticketService.updateStatus(ticketId, req.user!, req.body);
      return success(res, result, 'Ticket status updated');
    } catch (e) {
      next(e);
    }
}

// Admin
async function getAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await ticketService.getAllTickets();
      return success(res, result, 'All tickets');
    } catch (e) {
      next(e);
    }
}

// Teknisi
async function getMy(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await ticketService.getMyTickets(req.user!);
      return success(res, result, 'My assigned tickets');
    } catch (e) {
      next(e);
    }
}

export default { create, assign, updateStatus, getAll, getMy };
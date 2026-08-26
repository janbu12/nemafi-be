import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware.js';
import ticketService from '../services/ticketService.js';
import ticketCategoryService from '../services/ticketCategoryService.js';
import { success } from '../utils/responseHandler.js';

// Admin
async function create(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await ticketService.createTicket(req.body, req.user);
    return success(res, result, 'Ticket created', 201);
  } catch (e) {
    next(e);
  }
}

// Admin
async function assign(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const ticketId = Number(req.params.id);
    const result = await ticketService.assignTicket(ticketId, req.body, req.user);
    return success(res, result, 'Ticket assigned');
  } catch (e) {
    next(e);
  }
}

async function schedule(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const ticketId = Number(req.params.id);
    const result = await ticketService.scheduleTicket(ticketId, req.body, req.user);
    return success(res, result, 'Ticket scheduled');
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

async function getHistory(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const ticketId = Number(req.params.id);
    const result = await ticketService.getHistory(ticketId);
    return success(res, result, 'Ticket history');
  } catch (e) {
    next(e);
  }
}

async function completeSurvey(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const ticketId = Number(req.params.id);
    const result = await ticketService.completeSurvey(ticketId, req.body, req.user);
    return success(res, result, 'Survey completed');
  } catch (e) {
    next(e);
  }
}

async function reportSurveyActual(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const ticketId = Number(req.params.id);
    const result = await ticketService.reportSurveyActual(ticketId, req.user!, req.body);
    return success(res, result, 'Survey actual usage updated');
  } catch (e) {
    next(e);
  }
}

async function updateMembers(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const ticketId = Number(req.params.id);
    const result = await ticketService.updateTicketMembers(ticketId, req.user!, req.body);
    return success(res, result, 'Ticket members updated');
  } catch (e) {
    next(e);
  }
}

async function getSurvey(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const ticketId = Number(req.params.id);
    const result = await ticketService.getSurveyByTicket(ticketId);
    return success(res, result, 'Survey detail');
  } catch (e) {
    next(e);
  }
}

async function updateSurvey(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const ticketId = Number(req.params.id);
    const result = await ticketService.updateSurvey(ticketId, req.body, req.user);
    return success(res, result, 'Survey updated');
  } catch (e) {
    next(e);
  }
}

// Customer
async function createSupport(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await ticketService.createSupportTicket(req.user!, req.body);
    return success(res, result, 'Support ticket created', 201);
  } catch (e) {
    next(e);
  }
}

async function getMySupport(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await ticketService.getMySupportTickets(req.user!);
    return success(res, result, 'Support tickets');
  } catch (e) {
    next(e);
  }
}

async function getCategories(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await ticketCategoryService.list();
    return success(res, result, 'Ticket categories');
  } catch (e) {
    next(e);
  }
}

async function createCategory(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await ticketCategoryService.create(req.body);
    return success(res, result, 'Ticket category created', 201);
  } catch (e) {
    next(e);
  }
}

async function updateCategory(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const result = await ticketCategoryService.update(id, req.body);
    return success(res, result, 'Ticket category updated');
  } catch (e) {
    next(e);
  }
}

async function deleteCategory(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const result = await ticketCategoryService.remove(id);
    return success(res, result, 'Ticket category deleted');
  } catch (e) {
    next(e);
  }
}

async function updateSopProgress(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const ticketId = Number(req.params.id);
    const result = await ticketService.updateSopProgress(ticketId, req.user!, req.body);
    return success(res, result, 'SOP progress updated');
  } catch (e) {
    next(e);
  }
}

export default { create, assign, schedule, updateStatus, getAll, getMy, getHistory, completeSurvey, reportSurveyActual, updateMembers, getSurvey, updateSurvey, createSupport, getMySupport, getCategories, createCategory, updateCategory, deleteCategory, updateSopProgress };


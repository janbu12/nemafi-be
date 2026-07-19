import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware.js';
import notificationService from '../services/notificationService.js';
import { success } from '../utils/responseHandler.js';

async function list(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const limit = Number(req.query.limit || 20);
    const notifications = await notificationService.list(req.user!.id, limit);
    return success(res, notifications, 'Notifications');
  } catch (error) {
    next(error);
  }
}

async function unreadCount(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const unreadCount = await notificationService.getUnreadCount(req.user!.id);
    return success(res, { unreadCount }, 'Notification unread count');
  } catch (error) {
    next(error);
  }
}

async function markAsRead(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw { status: 400, message: 'Invalid notification id' };
    }

    const notification = await notificationService.markAsRead(req.user!.id, id);
    return success(res, notification, 'Notification marked as read');
  } catch (error) {
    next(error);
  }
}

async function markAllAsRead(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await notificationService.markAllAsRead(req.user!.id);
    return success(res, result, 'Notifications marked as read');
  } catch (error) {
    next(error);
  }
}

export default {
  list,
  unreadCount,
  markAsRead,
  markAllAsRead,
};

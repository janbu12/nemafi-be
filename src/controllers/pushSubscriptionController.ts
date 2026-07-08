import { Response } from 'express';
import { Role } from '@prisma/client';
import { AuthRequest } from '../middlewares/authMiddleware.js';
import pushSubscriptionService from '../services/pushSubscriptionService.js';
import { success } from '../utils/responseHandler.js';

function assertInternalRole(req: AuthRequest) {
  const role = req.user?.role;
  const allowedRoles: Role[] = [Role.TECH_ADMIN, Role.SUPER_ADMIN, Role.TECHNICIAN];
  if (!role || !allowedRoles.includes(role)) {
    throw { status: 403, message: 'Push notification is only available for admin and technician' };
  }
}

async function getPublicKey(_req: AuthRequest, res: Response) {
  return success(res, pushSubscriptionService.getPublicKey(), 'VAPID public key');
}

async function subscribe(req: AuthRequest, res: Response) {
  assertInternalRole(req);
  const result = await pushSubscriptionService.subscribe(req.user!.id, {
    ...req.body,
    userAgent: req.headers['user-agent'] || req.body?.userAgent,
  });
  return success(res, result, 'Push subscription saved', 201);
}

async function unsubscribe(req: AuthRequest, res: Response) {
  assertInternalRole(req);
  const result = await pushSubscriptionService.unsubscribe(req.user!.id, req.body);
  return success(res, result, 'Push subscription removed');
}

export default {
  getPublicKey,
  subscribe,
  unsubscribe,
};

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware.js';
import profileService from '../services/profileService.js';
import { success } from '../utils/responseHandler.js';

async function meProfile(req: AuthRequest, res: Response, next: Function) {
    try {
        const result = await profileService.meProfile(req);
        return success(res, result, 'Profile');
    } catch (e) {
        next(e);
    }
}

async function updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await profileService.updateProfile(req.user!, req.body);
    return success(res, result, 'Profile updated');
  } catch (e) {
    next(e);
  }
}

async function updateEmail(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await profileService.updateEmail(req.user!, req.body);
    return success(res, result, 'Email updated');
  } catch (e) {
    next(e);
  }
}

async function updatePassword(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await profileService.updatePassword(req.user!, req.body);
    return success(res, result, 'Password updated');
  } catch (e) {
    next(e);
  }
}

export default {
    meProfile,
    updateProfile,
    updateEmail,
    updatePassword,
};
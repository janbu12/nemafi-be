import { Request, Response, NextFunction } from 'express';
import { success } from '../utils/responseHandler.js';
import recommendationService from '../services/recommendationService.js';

async function getRecommendation(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await recommendationService.recommendPackage(req.body);
    return success(res, result, 'Package recommendation successful');
  } catch (e) {
    next(e);
  }
}

export default { getRecommendation };
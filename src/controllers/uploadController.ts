import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware.js';
import { createPresignedUpload } from '../services/r2Service.js';
import { success } from '../utils/responseHandler.js';

async function createPresign(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { filename, contentType } = req.body as { filename?: string; contentType?: string };
    if (!filename || !contentType) {
      return success(res, null, 'filename and contentType are required', 400);
    }

    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `support/${req.user?.id}/${Date.now()}-${safeName}`;
    const result = await createPresignedUpload(key, contentType);
    return success(res, result, 'Presigned upload created');
  } catch (e) {
    next(e);
  }
}

export default { createPresign };

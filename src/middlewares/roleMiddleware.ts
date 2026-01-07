import { Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { AuthRequest } from './authMiddleware.js';

export function roleMiddleware(allowedRoles: Role[]) {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        const user = req.user;
        if (!user || (user.role !== Role.SUPER_ADMIN && !allowedRoles.includes(user.role))) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        next();
    };
}

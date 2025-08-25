import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prismaClient } from '../application/prisma.js';
import { User } from '@prisma/client';

export interface AuthRequest extends Request {
    user?: User;
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];

    const blacklistedToken = await prismaClient.tokenBlacklist.findUnique({
        where: { token },
    });

    if (blacklistedToken) {
        return res.status(401).json({ error: 'Invalid token' });
    }

    try {
        const payload = jwt.verify(token, env.JWT_SECRET) as { id: number, email: string };
        const user = await prismaClient.user.findUnique({
            where: { id: payload.id }
        });
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        req.user = user;
        next();
    } catch {
        return res.status(401).json({ error: 'Invalid token' });
    }
}

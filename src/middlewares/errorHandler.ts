import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { getMessageCode } from '../utils/messageCode.js';


export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
    if ((err as any)?.type === 'entity.too.large') {
        return res.status(413).json({
            data: null,
            status: 'error',
            message: 'Ukuran request terlalu besar. Maksimal payload laporan adalah 10MB.',
        });
    }

    if (err instanceof ZodError) {
        const firstIssue = err.issues[0];
        const message = firstIssue?.message || 'Validasi gagal';
        const code = getMessageCode(message);
        return res.status(400).json({
            data: null,
            status: 'error',
            message,
            issues: err.issues,
            ...(code ? { code } : {}),
        });
    }

    const status = (err as any)?.status || 500;
    const message = (err as any)?.message || 'Internal Server Error';
    const code = getMessageCode(message);
    return res.status(status).json({
        data: null,
        status: 'error',
        message,
        ...(code ? { code } : {}),
    });
}

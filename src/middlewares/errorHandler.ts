import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';


export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
    if (err instanceof ZodError) {
        const firstIssue = err.issues[0];
        return res.status(400).json({
            data: null,
            status: 'error',
            message: firstIssue?.message || 'Validasi gagal',
            issues: err.issues,
        });
    }

    const status = (err as any)?.status || 500;
    const message = (err as any)?.message || 'Internal Server Error';
    return res.status(status).json({
        data: null,
        status: 'error',
        message,
    });
}

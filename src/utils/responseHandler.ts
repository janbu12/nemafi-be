import { Response } from 'express';
import { getMessageCode } from './messageCode.js';

export function success(res: Response, data: any, message = 'OK', statusCode = 200) {
    const code = getMessageCode(message);
    return res.status(statusCode).json({
        data,
        status: 'success',
        message,
        ...(code ? { code } : {}),
    });
}

export function error(res: Response, message = 'Error', statusCode = 500, data: any = null) {
    const code = getMessageCode(message);
    return res.status(statusCode).json({
        data,
        status: 'error',
        message,
        ...(code ? { code } : {}),
    });
}

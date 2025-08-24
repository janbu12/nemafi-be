import { Response } from 'express';

export function success(res: Response, data: any, message = 'OK', statusCode = 200) {
    return res.status(statusCode).json({
        data,
        status: 'success',
        message,
    });
}

export function error(res: Response, message = 'Error', statusCode = 500, data: any = null) {
    return res.status(statusCode).json({
        data,
        status: 'error',
        message,
    });
}

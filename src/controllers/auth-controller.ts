import { Request, Response } from "express";
import { success } from "../utils/responseHandler";
import authService from "../services/authService";

async function login(req: Request, res: Response, next: Function) {
    try {
        const result = await authService.loginUser(req.body);
        return success(res, result, 'Login berhasil');
    } catch (e) {
        next(e);
    }
}

async function register(req: Request, res: Response, next: Function) {
    try {
        const result = await authService.registerUser(req.body);
        return success(res, result, 'Register berhasil', 201);
    } catch (e) {
        next(e);
    }
}

export default {
    login,
    register
}
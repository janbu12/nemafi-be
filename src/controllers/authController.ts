import { Request, Response } from "express";
import { success } from "../utils/responseHandler.js";
import authService from "../services/authService.js";

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

async function logout(req: Request, res: Response, next: Function) {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        const result = await authService.logoutUser(token!);
        return success(res, result, 'Logout berhasil');
    } catch (e) {
        next(e);
    }
}

export default {
    login,
    register,
    logout
}
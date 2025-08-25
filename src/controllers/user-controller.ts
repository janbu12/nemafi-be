import { Request, Response } from 'express';
import userService from '../services/userService.js';
import { success } from '../utils/responseHandler.js';
import { AuthRequest } from '../middlewares/authMiddleware.js';

async function listUsers(_req: Request, res: Response, next: Function) {
    try {
        const users = await userService.listUsers();
        return success(res, users, 'List user');
    } catch (e) {
        next(e);
    }
}

async function getUser(req: Request, res: Response, next: Function) {
    try {
        const id = Number(req.params.id);
        const user = await userService.getUser(id);
        if (!user) return success(res, null, 'User not found', 404);
        return success(res, user, 'Detail user');
    } catch (e) {
        next(e);
    }
}

async function createUser(req: Request, res: Response, next: Function) {
    try {
        const created = await userService.createUser(req.body);
        return success(res, created, 'User created', 201);
    } catch (e) {
        next(e);
    }
}

async function updateUser(req: Request, res: Response, next: Function) {
    try {
        const id = Number(req.params.id);
        const updated = await userService.updateUser(id, req.body);
        return success(res, updated, 'User updated');
    } catch (e) {
        next(e);
    }
}

async function deleteUser(req: Request, res: Response, next: Function) {
    try {
        const id = Number(req.params.id);
        await userService.deleteUser(id);
        return success(res, null, 'User deleted', 204);
    } catch (e) {
        next(e);
    }
}

async function meProfile(req: AuthRequest, res: Response, next: Function) {
    try {
        const result = await userService.meProfile(req);
        return success(res, result, 'Profile');
    } catch (e) {
        next(e);
    }
}

export default {
    listUsers,
    getUser,
    createUser,
    updateUser,
    deleteUser,
    meProfile
}
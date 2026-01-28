import { Request, Response } from 'express';
import userService from '../services/userService.js';
import { success } from '../utils/responseHandler.js';
import { AuthRequest } from '../middlewares/authMiddleware.js';
import billingService from '../services/billingService.js';
import { changePackageValidation } from '../validation/profileValidation.js';

async function listUsers(_req: Request, res: Response, next: Function) {
    try {
        const users = await userService.listUsers();
        return success(res, users, 'List user');
    } catch (e) {
        next(e);
    }
}

async function listTechnicians(_req: AuthRequest, res: Response, next: Function) {
    try {
        const users = await userService.listTechnicians();
        return success(res, users, 'List technicians');
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

async function createUser(req: AuthRequest, res: Response, next: Function) {
    try {
        const created = await userService.createUser(req.user!, req.body);
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

async function resetPassword(req: AuthRequest, res: Response, next: Function) {
    try {
        const id = Number(req.params.id);
        const result = await userService.resetPassword(id, req.user!, req.body);
        return success(res, result, 'Password reset');
    } catch (e) {
        next(e);
    }
}

async function changePackage(req: AuthRequest, res: Response, next: Function) {
    try {
        const id = Number(req.params.id);
        const { packageId } = changePackageValidation.parse(req.body);
        const result = await billingService.changeUserPackage(id, packageId);
        return success(res, result, 'Paket berhasil diubah');
    } catch (e) {
        next(e);
    }
}

export default {
    listUsers,
    listTechnicians,
    getUser,
    createUser,
    updateUser,
    deleteUser,
    resetPassword,
    changePackage,
}

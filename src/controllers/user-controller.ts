import { Request, Response } from 'express';
import userService from '../services/userService.js';

async function login(req: Request, res: Response, next: Function) {
    try {
        const result = await userService.loginUser(req.body);
        res.status(200).json({ data: result });
    } catch (e) {
        next(e);
    }
}

async function register(req: Request, res: Response, next: Function) {
    try {
        const result = await userService.registerUser(req.body);
        res.status(201).json({ data: result });
    } catch (e) {
        next(e);
    }
}

async function listUsers(_req: Request, res: Response, next: Function) {
    try {
        const users = await userService.listUsers();
        res.json(users);
    } catch (e) {
        next(e);
    }
}

async function getUser(req: Request, res: Response, next: Function) {
    try {
        const id = Number(req.params.id);
        const user = await userService.getUser(id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (e) {
        next(e);
    }
}

async function createUser(req: Request, res: Response, next: Function) {
    try {
        const created = await userService.createUser(req.body);
        res.status(201).json(created);
    } catch (e) {
        next(e);
    }
}

async function updateUser(req: Request, res: Response, next: Function) {
    try {
        const id = Number(req.params.id);
        const updated = await userService.updateUser(id, req.body);
        res.json(updated);
    } catch (e) {
        next(e);
    }
}

async function deleteUser(req: Request, res: Response, next: Function) {
    try {
        const id = Number(req.params.id);
        await userService.deleteUser(id);
        res.status(204).send();
    } catch (e) {
        next(e);
    }
}

export default {
    login,
    register,
    listUsers,
    getUser,
    createUser,
    updateUser,
    deleteUser,
}
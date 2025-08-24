import { prismaClient } from '../application/prisma.js';
import { Request, Response } from 'express';
import { createUserValidation, updateUserValidation } from '../validation/user-validation.js';


async function listUsers(_req: Request, res: Response) {
    const users = await prismaClient.user.findMany({ orderBy: { id: 'asc' } });
    res.json(users);
}


async function getUser(req: Request, res: Response) {
    const id = Number(req.params.id);
    const user = await prismaClient.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
}


async function createUser(req: Request, res: Response) {
    const data = createUserValidation.parse(req.body);
    const created = await prismaClient.user.create({ data });
    res.status(201).json(created);
}


async function updateUser(req: Request, res: Response) {
    const id = Number(req.params.id);
    const data = updateUserValidation.parse(req.body);
    const updated = await prismaClient.user.update({ where: { id }, data });
    res.json(updated);
}


async function deleteUser(req: Request, res: Response) {
    const id = Number(req.params.id);
    await prismaClient.user.delete({ where: { id } });
    res.status(204).send();
}

export default {
    listUsers,
    getUser,
    createUser,
    updateUser,
    deleteUser,
}
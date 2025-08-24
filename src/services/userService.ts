import { prismaClient } from '../application/prisma.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { registerValidation, loginValidation, createUserValidation, updateUserValidation } from '../validation/user-validation.js';
import { toUserDto } from '../domain/user.domain.js';

// Auth
async function registerUser(input: { email: string, password: string, name?: string }) {
    const data = registerValidation.parse(input);

    const existing = await prismaClient.user.findUnique({ where: { email: data.email } });
    if (existing) throw { status: 400, message: 'Email already registered' };

    const hashed = await bcrypt.hash(data.password, 10);
    const user = await prismaClient.user.create({
        data: { email: data.email, password: hashed, name: data.name }
    });

    const token = generateToken(user.id, user.email);
    return { user: toUserDto(user), token };
}

async function loginUser(input: { email: string, password: string }) {
    const data = loginValidation.parse(input);

    const user = await prismaClient.user.findUnique({ where: { email: data.email } });
    if (!user) throw { status: 401, message: 'Invalid email or password' };

    const valid = await bcrypt.compare(data.password, user.password);
    if (!valid) throw { status: 401, message: 'Invalid email or password' };

    const token = generateToken(user.id, user.email);
    return { user: toUserDto(user), token };
}

function generateToken(id: number, email: string) {
    return jwt.sign({ id, email }, env.JWT_SECRET, { expiresIn: '1d' });
}

// User CRUD
async function listUsers() {
    const users = await prismaClient.user.findMany({ orderBy: { id: 'asc' } });
    return users.map(toUserDto);
}

async function getUser(id: number) {
    const user = await prismaClient.user.findUnique({ where: { id } });
    return user ? toUserDto(user) : null;
}

async function createUser(input: { email: string, name?: string, password: string }) {
    const data = createUserValidation.parse(input);
    const hashed = await bcrypt.hash(data.password, 10);
    const user = await prismaClient.user.create({
        data: { email: data.email, name: data.name, password: hashed }
    });
    return toUserDto(user);
}

async function updateUser(id: number, input: { email?: string, name?: string | null }) {
    const data = updateUserValidation.parse(input);
    return prismaClient.user.update({ where: { id }, data });
}

async function deleteUser(id: number) {
    return prismaClient.user.delete({ where: { id } });
}

export default {
    registerUser,
    loginUser,
    listUsers,
    getUser,
    createUser,
    updateUser,
    deleteUser,
};

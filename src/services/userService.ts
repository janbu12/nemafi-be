import { prismaClient } from '../application/prisma.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export async function registerUser({ email, password, name }: { email: string, password: string, name?: string }) {
    const existing = await prismaClient.user.findUnique({ where: { email } });
    if (existing) throw { status: 400, message: 'Email already registered' };

    const hashed = await bcrypt.hash(password, 10);
    const user = await prismaClient.user.create({
        data: { email, password: hashed, name }
    });

    const token = generateToken(user.id, user.email);
    return { user: { id: user.id, email: user.email, name: user.name }, token };
}

export async function loginUser({ email, password }: { email: string, password: string }) {
    const user = await prismaClient.user.findUnique({ where: { email } });
    if (!user) throw { status: 401, message: 'Invalid email or password' };

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw { status: 401, message: 'Invalid email or password' };

    const token = generateToken(user.id, user.email);
    return { user: { id: user.id, email: user.email, name: user.name }, token };
}

function generateToken(id: number, email: string) {
    return jwt.sign({ id, email }, env.JWT_SECRET, { expiresIn: '1d' });
}

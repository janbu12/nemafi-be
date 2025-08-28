import { prismaClient } from "../application/prisma";
import utils from "../utils/utils";
import bcrypt from 'bcryptjs';
import { loginValidation, registerValidation } from "../validation/auth-validation";
import { toUserDto } from "../models/userModel";

// Auth
async function registerUser(input: { email: string, password: string, name?: string }) {
    const data = registerValidation.parse(input);

    const existing = await prismaClient.user.findUnique({ where: { email: data.email } });
    if (existing) throw { status: 400, message: 'Email already registered' };

    const hashed = await bcrypt.hash(data.password, 10);
    const user = await prismaClient.user.create({
        data: { email: data.email, password: hashed, name: data.name }
    });

    const token = utils.generateToken(user.id, user.email);
    return { user: toUserDto(user), token };
}

async function loginUser(input: { email: string, password: string }) {
    const data = loginValidation.parse(input);

    const user = await prismaClient.user.findUnique({ where: { email: data.email } });
    if (!user) throw { status: 401, message: 'Invalid email or password' };

    const valid = await bcrypt.compare(data.password, user.password);
    if (!valid) throw { status: 401, message: 'Invalid email or password' };

    const token = utils.generateToken(user.id, user.email);
    return { user: toUserDto(user), token };
}

async function logoutUser(token: string) {
    await prismaClient.tokenBlacklist.create({
        data: { token },
    });
    return { message: "Logout successful" };
}

export default {
    registerUser,
    loginUser,
    logoutUser,
}
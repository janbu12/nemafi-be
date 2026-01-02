import bcrypt from 'bcryptjs';
import { prismaClient } from '../application/prisma.js';
import { toUserDto } from '../models/userModel.js';
import {
  updateEmailValidation,
  updatePasswordValidation,
  updateProfileValidation,
} from '../validation/profileValidation.js';
import { User } from '@prisma/client';
import { AuthRequest } from '../middlewares/authMiddleware.js';

async function meProfile(req: AuthRequest) {
    if (!req.user) return null;
    const user = await prismaClient.user.findUnique({
        where: { id: req.user.id },
        include: { profile: true },
    });
    if (!user) return null;
    const dto = toUserDto(user as any);
    return { ...dto, profile: (user as any).profile ?? null };
}

async function updateProfile(user: User, data: any) {
    const validatedData = updateProfileValidation.parse(data);

    const userData: { fullname?: string } = {};
    if (validatedData.fullname) {
    userData.fullname = validatedData.fullname;
    }

    const profileData: { [key: string]: any } = { ...validatedData };
    delete profileData.fullname;

    const updatedUser = await prismaClient.$transaction(async (prisma) => {
    // Update tabel User jika ada data fullname
    if (Object.keys(userData).length > 0) {
        await prisma.user.update({
        where: { id: user.id },
        data: userData,
        });
    }

    // Cukup UPDATE, karena profil pasti sudah ada
    if (Object.keys(profileData).length > 0) {
        await prisma.profile.update({
        where: { user_id: user.id },
        data: profileData,
        });
    }

    return prisma.user.findUnique({
        where: { id: user.id },
        include: { profile: true },
    });
    });

    return toUserDto(updatedUser!);
}

async function updateEmail(user: User, data: any) {
    const { email } = updateEmailValidation.parse(data);

    if (email === user.email) {
    throw { status: 400, message: 'New email cannot be the same as the old email' };
    }

    const existing = await prismaClient.user.findUnique({ where: { email } });
    if (existing) {
    throw { status: 400, message: 'Email already registered' };
    }

    const updatedUser = await prismaClient.user.update({
    where: { id: user.id },
    data: { email },
    });

    return toUserDto(updatedUser);
}

async function updatePassword(user: User, data: any) {
    const { oldPassword, newPassword } = updatePasswordValidation.parse(data);

    const valid = await bcrypt.compare(oldPassword, user.password);
    if (!valid) {
    throw { status: 401, message: 'Invalid old password' };
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await prismaClient.user.update({
    where: { id: user.id },
    data: { password: hashed },
    });

    return { message: 'Password updated successfully' };
}

export default {
    meProfile,
    updateProfile,
    updateEmail,
    updatePassword,
};

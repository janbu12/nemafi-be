import { prismaClient } from "../application/prisma.js";
import utils from "../utils/utils.js";
import bcrypt from 'bcryptjs';
import { loginValidation, registerValidation } from "../validation/authValidation.js";
import { toUserDto } from "../utils/userDto.js";
import coveredAreaService from "./coveredAreaService.js";
import pushSubscriptionService from "./pushSubscriptionService.js";
import { Role } from '@prisma/client';

// Auth
async function registerUser(input: {
    email: string;
    password: string;
    confirm_password?: string;
    fullname: string;
    phone_number: string;
    full_address: string;
    province: string;
    city: string;
    district: string;
    subdistrict: string;
    latitude: number;
    longitude: number;
    image_url?: string;
    packageId: number;
    ticketCategoryId?: number;
}) {
    const data = registerValidation.parse(input);

    // 1. Validasi area coverage
    const coverageResult = await coveredAreaService.checkAvailabilityNoHistory({
        fullAddress: data.full_address,
        province: data.province,
        city: data.city,
        district: data.district,
        village: data.subdistrict,
        latitude: data.latitude,
        longitude: data.longitude,
    });

    if (!coverageResult.isAvailable) {
        throw { status: 400, message: 'Pendaftaran gagal: Area Anda belum tercover layanan kami.' };
    }

    // 2. Validasi email dan paket
    const existingUser = await prismaClient.user.findUnique({ where: { email: data.email } });
    if (existingUser) throw { status: 400, message: 'Email already registered' };

    const selectedPackage = await prismaClient.package.findUnique({ where: { id: data.packageId } });
    if (!selectedPackage) throw { status: 404, message: 'Package not found' };

    const hashed = await bcrypt.hash(data.password, 10);

    // 2. Gunakan transaksi untuk membuat User, Profile, dan Order
    let createdOrderId: number | null = null;
    const user = await prismaClient.$transaction(async (prisma) => {
        const newUser = await prisma.user.create({
            data: {
                email: data.email,
                password: hashed,
                fullname: data.fullname,
                role: 'CUSTOMER', // Pastikan role diset sebagai CUSTOMER
            }
        });

        await prisma.profile.create({
            data: {
                user_id: newUser.id,
                phone_number: data.phone_number,
                full_address: data.full_address,
                province: data.province,
                city: data.city,
                district: data.district,
                subdistrict: data.subdistrict,
                latitude: data.latitude,
                longitude: data.longitude,
                image_url: data.image_url,
            }
        });
        
        // Buat Order baru
        const order = await prisma.order.create({
            data: {
                userId: newUser.id,
                total: selectedPackage.price,
                status: 'PENDING_REVIEW',
                items: {
                    create: {
                        packageId: selectedPackage.id
                    }
                }
            }
        });
        createdOrderId = order.id;

        const category = data.ticketCategoryId
            ? await prisma.ticketCategory.findUnique({ where: { id: data.ticketCategoryId } })
            : await prisma.ticketCategory.findFirst({ where: { name: 'registrasi' } });

        if (data.ticketCategoryId && !category) {
            throw { status: 404, message: 'Ticket category not found' };
        }

        const expiresAt = category?.isExpirable && category.expireHours
            ? new Date(Date.now() + category.expireHours * 60 * 60 * 1000)
            : null;

        const ticket = await prisma.ticket.create({
            data: {
                orderId: order.id,
                title: `Pendaftaran paket ${selectedPackage.name}`,
                description: 'Tiket dibuat otomatis saat pendaftaran.',
                categoryId: category?.id,
                expiresAt,
            }
        });

        await prisma.ticketHistory.create({
            data: {
                ticketId: ticket.id,
                action: 'Ticket created',
                description: 'Tiket dibuat saat pendaftaran',
                actorType: 'CUSTOMER',
                actorId: newUser.id,
            }
        });

        return newUser;
    });

    if (createdOrderId) {
        const order = await prismaClient.order.findUnique({
            where: { id: createdOrderId },
            include: {
                items: { include: { package: true } },
                user: { include: { profile: true } },
            },
        });
        if (order) {
            const { emitOrderPending } = await import('../application/socket.js');
            emitOrderPending(order);
        }
    }

    // Kirim notifikasi ke Admin & Teknisi terkait pendaftaran pelanggan baru
    pushSubscriptionService.notifyAsync(
        { roles: [Role.TECH_ADMIN, Role.SUPER_ADMIN] },
        {
            title: 'Pendaftaran Pelanggan Baru',
            body: `${user.fullname} mendaftar paket ${selectedPackage.name} (${user.email}).`,
            url: `/admin/customers/${user.id}`,
            tag: `customer-registered-${user.id}`,
            data: { type: 'registration', userId: user.id, packageId: selectedPackage.id, orderId: createdOrderId },
        }
    );

    // Kirim notifikasi selamat datang ke Pelanggan yang baru mendaftar
    pushSubscriptionService.notifyAsync(
        { userIds: [user.id] },
        {
            title: 'Selamat Datang di NEMAFI Network!',
            body: `Pendaftaran Anda untuk paket ${selectedPackage.name} telah berhasil kami terima. Menunggu verifikasi admin.`,
            url: '/dashboard',
            tag: `welcome-customer-${user.id}`,
            data: { type: 'registration', userId: user.id },
        }
    );

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

import crypto from 'crypto';
import emailService from './emailService.js';

async function forgotPassword(email: string) {
    const user = await prismaClient.user.findUnique({ where: { email } });
    if (!user) {
        // We do not throw an error to prevent email enumeration attacks
        return { message: "If your email is registered, you will receive a reset link." };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now

    // Clear existing tokens for this user
    await prismaClient.passwordResetToken.deleteMany({
        where: { userId: user.id }
    });

    await prismaClient.passwordResetToken.create({
        data: {
            token: resetToken,
            userId: user.id,
            expiresAt,
        }
    });

    try {
        await emailService.sendPasswordResetEmail(user.email, resetToken, user.fullname);
    } catch (error) {
        console.error("Failed to send reset email:", error);
        throw { status: 500, message: "Failed to send reset email. Please try again later." };
    }

    return { message: "If your email is registered, you will receive a reset link." };
}

async function resetPassword(input: any) {
    const { token, newPassword } = input;
    if (!token || !newPassword) {
        throw { status: 400, message: "Token and new password are required" };
    }

    const resetTokenRecord = await prismaClient.passwordResetToken.findUnique({
        where: { token },
        include: { user: true }
    });

    if (!resetTokenRecord) {
        throw { status: 400, message: "Invalid or expired reset token" };
    }

    if (resetTokenRecord.expiresAt < new Date()) {
        await prismaClient.passwordResetToken.delete({ where: { id: resetTokenRecord.id } });
        throw { status: 400, message: "Reset token has expired" };
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prismaClient.user.update({
        where: { id: resetTokenRecord.userId },
        data: { password: hashedPassword }
    });

    await prismaClient.passwordResetToken.delete({ where: { id: resetTokenRecord.id } });

    return { message: "Password has been successfully reset" };
}

export default {
    registerUser,
    loginUser,
    logoutUser,
    forgotPassword,
    resetPassword
}

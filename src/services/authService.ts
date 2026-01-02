import { prismaClient } from "../application/prisma.js";
import utils from "../utils/utils.js";
import bcrypt from 'bcryptjs';
import { loginValidation, registerValidation } from "../validation/authValidation.js";
import { toUserDto } from "../models/userModel.js";

// Auth
async function registerUser(input: {
    email: string;
    password: string;
    fullname: string;
    phone_number: string;
    full_address: string;
    province: string;
    city: string;
    district: string;
    subdistrict: string;
    image_url?: string;
    packageId: number;
    ticketCategoryId?: number;
}) {
    const data = registerValidation.parse(input);

    // 1. Validasi email dan paket
    const existingUser = await prismaClient.user.findUnique({ where: { email: data.email } });
    if (existingUser) throw { status: 400, message: 'Email already registered' };

    const selectedPackage = await prismaClient.package.findUnique({ where: { id: data.packageId } });
    if (!selectedPackage) throw { status: 404, message: 'Package not found' };

    const hashed = await bcrypt.hash(data.password, 10);

    // 2. Gunakan transaksi untuk membuat User, Profile, dan Order
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

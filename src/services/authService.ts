import { prismaClient } from "../application/prisma.js";
import utils from "../utils/utils.js";
import bcrypt from 'bcryptjs';
import { loginValidation, registerValidation } from "../validation/authValidation.js";
import { toUserDto } from "../models/userModel.js";

// Auth
async function registerUser(input: { email: string, password: string, name?: string }) {
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
        await prisma.order.create({
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
import { prismaClient } from '../application/prisma.js';
import bcrypt from 'bcryptjs';
import { createUserValidation, resetPasswordValidation, updateUserValidation } from '../validation/userValidation.js';
import { toUserDto } from '../models/userModel.js';
import { Role, User } from '@prisma/client';



// User CRUD
async function listUsers() {
    const users = await prismaClient.user.findMany({ orderBy: { id: 'asc' } });
    return users.map(toUserDto);
}

async function listTechnicians() {
    const users = await prismaClient.user.findMany({
        where: { role: 'TECHNICIAN' },
        orderBy: { fullname: 'asc' },
    });
    return users.map(toUserDto);
}

async function getUser(id: number) {
    const user = await prismaClient.user.findUnique({
        where: { id },
        include: {
            profile: { include: { router: true } },
            billingInvoices: { orderBy: { dueAt: 'desc' } },
            suspensionHistory: { orderBy: { suspendedAt: 'desc' } },
            packageHistory: { include: { package: true }, orderBy: { startedAt: 'desc' } },
            orders: {
                orderBy: { createdAt: 'desc' },
                include: {
                    items: { include: { package: true } },
                    tickets: { include: { category: true }, orderBy: { createdAt: 'desc' } },
                },
            },
        },
    });
    if (!user) return null;
    const dto = toUserDto(user as any);
    return {
        ...dto,
        profile: (user as any).profile ?? null,
        billingInvoices: (user as any).billingInvoices ?? [],
        suspensionHistory: (user as any).suspensionHistory ?? [],
        packageHistory: (user as any).packageHistory ?? [],
        orders: (user as any).orders ?? [],
    };
}

async function createUser(actor: User, input: { email: string, name?: string, password: string, role?: Role }) {
    const data = createUserValidation.parse(input);
    const requestedRole = (data.role ?? 'CUSTOMER') as Role;
    const restrictedRoles = [Role.TECH_ADMIN, Role.TECHNICIAN];
    if (restrictedRoles.includes(requestedRole) && actor.role !== Role.SUPER_ADMIN) {
        throw { status: 403, message: 'Only super admin can assign admin or technician role' };
    }
    const hashed = await bcrypt.hash(data.password, 10);
    const user = await prismaClient.user.create({
        data: { email: data.email, fullname: data.name, password: hashed, role: requestedRole }
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

async function resetPassword(id: number, actor: User, input: { password: string }) {
    if (actor.role !== Role.SUPER_ADMIN) {
        throw { status: 403, message: 'Only super admin can reset passwords' };
    }
    const data = resetPasswordValidation.parse(input);
    const hashed = await bcrypt.hash(data.password, 10);
    return prismaClient.user.update({
        where: { id },
        data: { password: hashed },
    });
}

export default {
    listUsers,
    listTechnicians,
    getUser,
    createUser,
    updateUser,
    deleteUser,
    resetPassword,
};

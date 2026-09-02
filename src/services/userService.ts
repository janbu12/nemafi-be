import { prismaClient } from '../application/prisma.js';
import bcrypt from 'bcryptjs';
import { createUserValidation, resetPasswordValidation, updateUserValidation, adminCreateCustomerValidation } from '../validation/userValidation.js';
import { calculateProratedAmount } from '../utils/billingUtils.js';
import { toUserDto } from '../utils/userDto.js';
import { Role, User } from '@prisma/client';



// User CRUD
async function listUsers() {
    const users = await prismaClient.user.findMany({
        orderBy: { id: 'asc' },
        include: {
            profile: { include: { router: true } },
            billingInvoices: { orderBy: { dueAt: 'desc' } },
            packageHistory: {
                where: { endedAt: null },
                include: { package: { include: { category: true } } },
                orderBy: { startedAt: 'desc' },
            },
            orders: {
                orderBy: { createdAt: 'desc' },
                include: {
                    items: { include: { package: { include: { category: true } } } },
                },
            },
        },
    });

    return users.map((user: any) => {
        const dto = toUserDto(user);
        const profile = user.profile ?? null;
        const currentPackage =
            user.packageHistory?.[0]?.package || user.orders?.[0]?.items?.[0]?.package || null;
        const latestOrder = user.orders?.[0] || null;
        const invoices = user.billingInvoices || [];
        const latestInvoice = invoices[0] || null;

        // 1. Service Status
        let serviceStatus: 'ACTIVE' | 'SUSPENDED' | 'PENDING_INSTALLATION' | 'PENDING_REVIEW' | 'REJECTED' = 'PENDING_INSTALLATION';

        if (latestOrder?.status === 'REVIEW_REJECTED' || latestOrder?.status === 'CANCELLED') {
            serviceStatus = 'REJECTED';
        } else if (latestOrder?.status === 'PENDING_REVIEW') {
            serviceStatus = 'PENDING_REVIEW';
        } else if (latestOrder && [
            'REVIEW_APPROVED',
            'WAITING_FOR_ASSIGNMENT',
            'SURVEY_SCHEDULED',
            'SURVEY_COMPLETED',
            'TECHNICIAN_ASSIGNED',
            'INSTALLATION_IN_PROGRESS',
        ].includes(latestOrder.status)) {
            serviceStatus = 'PENDING_INSTALLATION';
        } else if (profile && profile.isPppActive === false) {
            serviceStatus = 'SUSPENDED';
        } else if (
            (latestOrder && latestOrder.status === 'COMPLETED') ||
            (user.packageHistory && user.packageHistory.some((ph: any) => !ph.endedAt) && profile?.isPppActive === true)
        ) {
            serviceStatus = 'ACTIVE';
        } else {
            serviceStatus = 'PENDING_INSTALLATION';
        }

        // 2. Billing Status
        let billingStatus: 'PAID' | 'UNPAID' | 'OVERDUE' | 'NO_INVOICE' = 'NO_INVOICE';
        if (invoices.some((inv: any) => inv.status === 'OVERDUE')) {
            billingStatus = 'OVERDUE';
        } else if (invoices.some((inv: any) => inv.status === 'UNPAID')) {
            billingStatus = 'UNPAID';
        } else if (invoices.some((inv: any) => inv.status === 'PAID')) {
            billingStatus = 'PAID';
        }

        return {
            ...dto,
            profile: profile
                ? {
                      id: profile.id,
                      phone_number: profile.phone_number,
                      full_address: profile.full_address,
                      province: profile.province,
                      city: profile.city,
                      district: profile.district,
                      subdistrict: profile.subdistrict,
                      latitude: profile.latitude,
                      longitude: profile.longitude,
                      pppUsername: profile.pppUsername,
                      pppProfile: profile.pppProfile,
                      isPppActive: profile.isPppActive,
                      routerId: profile.routerId,
                      router: profile.router ? { id: profile.router.id, name: profile.router.name, host: profile.router.host } : null,
                  }
                : null,
            serviceStatus,
            billingStatus,
            currentPackage: currentPackage
                ? {
                      id: currentPackage.id,
                      name: currentPackage.name,
                      price: currentPackage.price,
                      downloadSpeed: currentPackage.downloadSpeed,
                      uploadSpeed: currentPackage.uploadSpeed,
                      categoryId: currentPackage.categoryId,
                      categoryName: currentPackage.category?.name || 'Umum',
                  }
                : null,
            latestOrder: latestOrder
                ? {
                      id: latestOrder.id,
                      status: latestOrder.status,
                      reviewNotes: latestOrder.reviewNotes,
                      reviewedAt: latestOrder.reviewedAt,
                      createdAt: latestOrder.createdAt,
                  }
                : null,
            latestInvoice: latestInvoice
                ? {
                      id: latestInvoice.id,
                      invoiceNumber: latestInvoice.invoiceNumber,
                      amount: latestInvoice.amount,
                      status: latestInvoice.status,
                      dueAt: latestInvoice.dueAt,
                      paidAt: latestInvoice.paidAt,
                  }
                : null,
        };
    });
}

async function listTechnicians() {
    const users = await prismaClient.user.findMany({
        where: { role: 'TECHNICIAN' },
        include: { profile: true },
        orderBy: { fullname: 'asc' },
    });
    return users.map((u) => ({
        ...toUserDto(u),
        profile: u.profile ?? null,
    }));
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

async function createUser(actor: User, input: any) {
    const data = createUserValidation.parse(input);
    const requestedRole = (data.role ?? 'CUSTOMER') as Role;
    const restrictedRoles: Role[] = [Role.SUPER_ADMIN];
    if (restrictedRoles.includes(requestedRole) && actor.role !== Role.SUPER_ADMIN) {
        throw { status: 403, message: 'Hanya Super Admin yang dapat membuat Super Admin baru' };
    }

    const existingUser = await prismaClient.user.findUnique({ where: { email: data.email } });
    if (existingUser) {
        throw { status: 400, message: 'Email sudah terdaftar' };
    }

    const hashed = await bcrypt.hash(data.password, 10);
    const user = await prismaClient.user.create({
        data: {
            email: data.email,
            fullname: data.fullname || data.name || '',
            password: hashed,
            role: requestedRole,
            profile: (data.phone_number || data.full_address)
                ? {
                    create: {
                        phone_number: data.phone_number || '',
                        full_address: data.full_address || '',
                        province: data.province || '',
                        city: data.city || '',
                        district: data.district || '',
                        subdistrict: data.subdistrict || '',
                    },
                }
                : undefined,
        },
        include: { profile: true },
    });
    return {
        ...toUserDto(user),
        profile: user.profile ?? null,
    };
}

async function createCustomer(actor: User, input: any) {
    if (actor.role !== Role.TECH_ADMIN && actor.role !== Role.SUPER_ADMIN) {
        throw { status: 403, message: 'Only admin can create customers' };
    }
    const data = adminCreateCustomerValidation.parse(input);
    const existingUser = await prismaClient.user.findUnique({ where: { email: data.email } });
    if (existingUser) throw { status: 400, message: 'Email already registered' };

    const selectedPackage = await prismaClient.package.findUnique({ where: { id: data.packageId } });
    if (!selectedPackage) throw { status: 404, message: 'Package not found' };

    const hashed = await bcrypt.hash(data.password, 10);

    const user = await prismaClient.$transaction(async (prisma) => {
        const newUser = await prisma.user.create({
            data: {
                email: data.email,
                password: hashed,
                fullname: data.fullname,
                role: 'CUSTOMER',
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
            }
        });

        const { amount: proratedTotal } = calculateProratedAmount(selectedPackage.price);
        const order = await prisma.order.create({
            data: {
                userId: newUser.id,
                total: proratedTotal,
                status: 'PENDING_REVIEW',
                items: {
                    create: {
                        packageId: selectedPackage.id
                    }
                }
            }
        });

        const category = await prisma.ticketCategory.findFirst({ where: { name: 'registrasi' } });
        const expiresAt = category?.isExpirable && category.expireHours
            ? new Date(Date.now() + category.expireHours * 60 * 60 * 1000)
            : null;

        const ticket = await prisma.ticket.create({
            data: {
                orderId: order.id,
                title: `Pendaftaran paket ${selectedPackage.name}`,
                description: 'Tiket dibuat oleh admin saat pendaftaran manual.',
                categoryId: category?.id,
                expiresAt,
            }
        });

        await prisma.ticketHistory.create({
            data: {
                ticketId: ticket.id,
                action: 'Ticket created',
                description: 'Tiket dibuat oleh admin',
                actorType: 'ADMIN',
                actorId: actor.id,
            }
        });

        return { user: newUser, order };
    });

    try {
        const { emitOrderPending } = await import('../application/socket.js');
        const orderWithDetails = await prismaClient.order.findUnique({
            where: { id: user.order.id },
            include: {
                items: { include: { package: true } },
                user: { include: { profile: true } },
            },
        });
        if (orderWithDetails) {
            emitOrderPending(orderWithDetails);
        }
    } catch (err) {
        console.warn('Failed to emit order socket event:', err);
    }

    return toUserDto(user.user);
}

async function updateUser(id: number, input: any) {
    const data = updateUserValidation.parse(input);

    const existing = await prismaClient.user.findUnique({
        where: { id },
        include: { profile: true },
    });
    if (!existing) {
        throw { status: 404, message: 'Pengguna tidak ditemukan' };
    }

    if (data.email && data.email !== existing.email) {
        const emailInUse = await prismaClient.user.findUnique({ where: { email: data.email } });
        if (emailInUse) {
            throw { status: 400, message: 'Email sudah digunakan oleh akun lain' };
        }
    }

    const userUpdateData: any = {};
    if (data.email) userUpdateData.email = data.email;
    if (data.fullname || data.name) userUpdateData.fullname = data.fullname || data.name;
    if (data.role) userUpdateData.role = data.role;
    if (data.password) userUpdateData.password = await bcrypt.hash(data.password, 10);

    const profileUpdateData: any = {};
    if (data.phone_number !== undefined) profileUpdateData.phone_number = data.phone_number;
    if (data.full_address !== undefined) profileUpdateData.full_address = data.full_address;
    if (data.province !== undefined) profileUpdateData.province = data.province;
    if (data.city !== undefined) profileUpdateData.city = data.city;
    if (data.district !== undefined) profileUpdateData.district = data.district;
    if (data.subdistrict !== undefined) profileUpdateData.subdistrict = data.subdistrict;
    if (data.latitude !== undefined) profileUpdateData.latitude = data.latitude;
    if (data.longitude !== undefined) profileUpdateData.longitude = data.longitude;
    if (data.routerId !== undefined) {
        const nextRouterId = data.routerId ? Number(data.routerId) : null;
        profileUpdateData.routerId = nextRouterId;
        if (nextRouterId && nextRouterId !== existing.profile?.routerId) {
            const targetRouter = await prismaClient.router.findUnique({
                where: { id: nextRouterId },
                include: { _count: { select: { profiles: true } } },
            });
            if (targetRouter) {
                const currentCap = targetRouter.capacity ?? 40;
                if (targetRouter._count.profiles >= currentCap) {
                    throw {
                        status: 400,
                        message: `Router '${targetRouter.name}' sudah mencapai batas kapasitas maksimal (${targetRouter._count.profiles}/${currentCap} Pelanggan). Silakan pilih router lain.`,
                    };
                }
            }
        }
    }
    if (data.pppUsername !== undefined) profileUpdateData.pppUsername = data.pppUsername;
    if (data.pppProfile !== undefined) profileUpdateData.pppProfile = data.pppProfile;
    if (data.isPppActive !== undefined) profileUpdateData.isPppActive = data.isPppActive;

    const updatedUser = await prismaClient.$transaction(async (tx) => {
        if (Object.keys(userUpdateData).length > 0) {
            await tx.user.update({
                where: { id },
                data: userUpdateData,
            });
        }

        if (Object.keys(profileUpdateData).length > 0) {
            if (existing.profile) {
                await tx.profile.update({
                    where: { user_id: id },
                    data: profileUpdateData,
                });
            } else {
                await tx.profile.create({
                    data: {
                        user_id: id,
                        phone_number: profileUpdateData.phone_number || '',
                        full_address: profileUpdateData.full_address || '',
                        province: profileUpdateData.province || '',
                        city: profileUpdateData.city || '',
                        district: profileUpdateData.district || '',
                        subdistrict: profileUpdateData.subdistrict || '',
                        ...profileUpdateData,
                    },
                });
            }
        }

        return tx.user.findUnique({
            where: { id },
            include: { profile: { include: { router: true } } },
        });
    });

    return {
        ...toUserDto(updatedUser!),
        profile: updatedUser?.profile ?? null,
    };
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
    createCustomer,
    updateUser,
    deleteUser,
    resetPassword,
};

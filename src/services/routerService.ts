import { prismaClient } from "../application/prisma.js";
import { createRouterValidation, updateRouterValidation } from "../validation/routerValidation.js";

async function create(data: any) {
    const validatedData = createRouterValidation.parse(data);
    return prismaClient.router.create({ data: validatedData });
}

async function getAll() {
    return prismaClient.router.findMany({
        orderBy: { name: 'asc' },
    });
}

async function getById(id: number) {
    return prismaClient.router.findUnique({ where: { id } });
}

async function update(id: number, data: any) {
    const validatedData = updateRouterValidation.parse(data);
    return prismaClient.router.update({
        where: { id },
        data: validatedData,
    });
}

async function remove(id: number) {
    return prismaClient.router.delete({ where: { id } });
}

export default { create, getAll, getById, update, remove };
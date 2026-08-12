import { prismaClient } from "../application/prisma.js";
import { createRouterValidation, updateRouterValidation } from "../validation/routerValidation.js";
import mikrotikService from "./mikrotikService.js";

async function create(data: any) {
    const validatedData = createRouterValidation.parse(data);
    const router = await prismaClient.router.create({ data: validatedData });
    // Run package sync asynchronously in the background so HTTP response doesn't hang or timeout
    mikrotikService.syncAllPackagesToRouter(router.id).catch((err: any) => {
        console.warn(`[Router Create Background Sync] Failed to sync packages to router '${router.name}': ${err.message}`);
    });
    return router;
}

async function getAll() {
    return prismaClient.router.findMany({
        orderBy: { name: 'asc' },
    });
}

async function getById(id: number) {
    return prismaClient.router.findUnique({
        where: { id },
    });
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

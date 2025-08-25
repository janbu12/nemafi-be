import { prismaClient } from '../application/prisma.js';
import bcrypt from 'bcryptjs';
import { createUserValidation, updateUserValidation } from '../validation/user-validation.js';
import { toUserDto } from '../models/user.model.js';



// User CRUD
async function listUsers() {
    const users = await prismaClient.user.findMany({ orderBy: { id: 'asc' } });
    return users.map(toUserDto);
}

async function getUser(id: number) {
    const user = await prismaClient.user.findUnique({ where: { id } });
    return user ? toUserDto(user) : null;
}

async function createUser(input: { email: string, name?: string, password: string }) {
    const data = createUserValidation.parse(input);
    const hashed = await bcrypt.hash(data.password, 10);
    const user = await prismaClient.user.create({
        data: { email: data.email, name: data.name, password: hashed }
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

export default {
    listUsers,
    getUser,
    createUser,
    updateUser,
    deleteUser,
};

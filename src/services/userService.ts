import { getReadClient, getWriteClient } from '../application/prisma.js';
import bcrypt from 'bcryptjs';
import { createUserValidation, updateUserValidation } from '../validation/userValidation.js';
import { toUserDto } from '../models/userModel.js';
import { AuthRequest } from '../middlewares/authMiddleware.js';



// User CRUD with read/write database routing
async function listUsers() {
    // Read operation - use slave database
    const readClient = getReadClient();
    const users = await readClient.user.findMany({ orderBy: { id: 'asc' } });
    return users.map(toUserDto);
}

async function getUser(id: number) {
    // Read operation - use slave database
    const readClient = getReadClient();
    const user = await readClient.user.findUnique({ where: { id } });
    return user ? toUserDto(user) : null;
}

async function createUser(input: { email: string, name?: string, password: string }) {
    // Write operation - use main database
    const writeClient = getWriteClient();
    const data = createUserValidation.parse(input);
    const hashed = await bcrypt.hash(data.password, 10);
    const user = await writeClient.user.create({
        data: { email: data.email, fullname: data.name, password: hashed }
    });
    return toUserDto(user);
}

async function updateUser(id: number, input: { email?: string, name?: string | null }) {
    // Write operation - use main database
    const writeClient = getWriteClient();
    const data = updateUserValidation.parse(input);
    return writeClient.user.update({ where: { id }, data });
}

async function deleteUser(id: number) {
    // Write operation - use main database
    const writeClient = getWriteClient();
    return writeClient.user.delete({ where: { id } });
}

export default {
    listUsers,
    getUser,
    createUser,
    updateUser,
    deleteUser,
};

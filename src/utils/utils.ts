import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

function generateToken(id: number, email: string) {
    return jwt.sign({ id, email }, env.JWT_SECRET, { expiresIn: '1d' });
}

export default {
    generateToken
}
import z from "zod";
import { createUserValidation } from "./user-validation";

const registerValidation = createUserValidation;
const loginValidation = z.object({
    email: z.string().email(),
    password: z.string().min(6),
});

export { registerValidation, loginValidation };
import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import profileController from "../controllers/profileController.js";

export const profileRouter = Router();
profileRouter.use(authMiddleware);

// Profile Route
profileRouter.get('/', profileController.meProfile);
profileRouter.patch('/', profileController.updateProfile);
profileRouter.patch('/email', profileController.updateEmail);
profileRouter.patch('/password', profileController.updatePassword);
profileRouter.patch('/package', profileController.changePackage);

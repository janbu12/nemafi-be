import {PrismaClient} from "@prisma/client";
import {logger} from "./logging.js";
import { DatabaseRouter, getMainDatabase, getSlaveDatabase } from "../services/databaseRouterService.js";

// Legacy single client for backward compatibility
export const prismaClient = getMainDatabase();

// Database router instance for read/write operations
export const dbRouter = DatabaseRouter.getInstance();

// Export convenience functions
export const getReadClient = getSlaveDatabase;
export const getWriteClient = getMainDatabase;

// Health check function
export const checkDatabaseHealth = async () => {
    return await dbRouter.healthCheck();
};

// Graceful shutdown
export const disconnectDatabases = async () => {
    await dbRouter.disconnect();
};

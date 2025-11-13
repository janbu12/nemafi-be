import { PrismaClient } from '@prisma/client';
import { logger } from '../application/logging.js';
import { env } from '../config/env.js';

// Database connections
let mainPrismaClient: PrismaClient | null = null;
let slavePrismaClient: PrismaClient | null = null;

// Initialize database connections
const initializeConnections = () => {
    try {
        // Main database (Master) - for write operations
        const mainDatabaseUrl = env.DATABASE_MAIN_URL || env.DATABASE_URL;
        mainPrismaClient = new PrismaClient({
            datasources: {
                db: {
                    url: mainDatabaseUrl,
                },
            },
            log: [
                {
                    emit: 'event',
                    level: 'query',
                },
                {
                    emit: 'event',
                    level: 'error',
                },
                {
                    emit: 'event',
                    level: 'info',
                },
                {
                    emit: 'event',
                    level: 'warn',
                },
            ],
        });

        // Slave database (Read Replica) - for read operations
        const slaveDatabaseUrl = env.DATABASE_SLAVE_URL;
        if (slaveDatabaseUrl) {
            slavePrismaClient = new PrismaClient({
                datasources: {
                    db: {
                        url: slaveDatabaseUrl,
                    },
                },
                log: [
                    {
                        emit: 'event',
                        level: 'query',
                    },
                    {
                        emit: 'event',
                        level: 'error',
                    },
                    {
                        emit: 'event',
                        level: 'info',
                    },
                    {
                        emit: 'event',
                        level: 'warn',
                    },
                ],
            });
        }

        // Set up logging for main database
        mainPrismaClient.$on('error', (e: any) => {
            logger.error('Main DB Error:', e);
        });

        mainPrismaClient.$on('warn', (e: any) => {
            logger.warn('Main DB Warning:', e);
        });

        mainPrismaClient.$on('info', (e: any) => {
            logger.info('Main DB Info:', e);
        });

        mainPrismaClient.$on('query', (e: any) => {
            logger.info('Main DB Query:', e);
        });

        // Set up logging for slave database if available
        if (slavePrismaClient) {
            slavePrismaClient.$on('error', (e: any) => {
                logger.error('Slave DB Error:', e);
            });

            slavePrismaClient.$on('warn', (e: any) => {
                logger.warn('Slave DB Warning:', e);
            });

            slavePrismaClient.$on('info', (e: any) => {
                logger.info('Slave DB Info:', e);
            });

            slavePrismaClient.$on('query', (e: any) => {
                logger.info('Slave DB Query:', e);
            });
        }

        logger.info('Database connections initialized successfully');
    } catch (error) {
        logger.error('Failed to initialize database connections:', error);
        throw error;
    }
};

// Get main database client (for write operations)
export const getMainDatabase = (): PrismaClient => {
    if (!mainPrismaClient) {
        initializeConnections();
    }
    if (!mainPrismaClient) {
        throw new Error('Main database connection not available');
    }
    return mainPrismaClient;
};

// Get slave database client (for read operations)
export const getSlaveDatabase = (): PrismaClient => {
    if (!slavePrismaClient) {
        initializeConnections();
    }
    if (!slavePrismaClient) {
        logger.warn('Slave database not available, falling back to main database');
        return getMainDatabase();
    }
    return slavePrismaClient;
};

// Database router with automatic read/write routing
export class DatabaseRouter {
    private static instance: DatabaseRouter;
    private mainClient: PrismaClient;
    private slaveClient: PrismaClient;

    private constructor() {
        this.mainClient = getMainDatabase();
        this.slaveClient = getSlaveDatabase();
    }

    public static getInstance(): DatabaseRouter {
        if (!DatabaseRouter.instance) {
            DatabaseRouter.instance = new DatabaseRouter();
        }
        return DatabaseRouter.instance;
    }

    // For read operations - use slave database
    public getReadClient(): PrismaClient {
        return this.slaveClient;
    }

    // For write operations - use main database
    public getWriteClient(): PrismaClient {
        return this.mainClient;
    }

    // Execute transaction on main database
    public async executeTransaction<T>(
        callback: (client: any) => Promise<T>
    ): Promise<T> {
        return await this.mainClient.$transaction(callback);
    }

    // Execute read-only transaction on slave database
    public async executeReadTransaction<T>(
        callback: (client: any) => Promise<T>
    ): Promise<T> {
        return await this.slaveClient.$transaction(callback);
    }

    // Health check for both databases
    public async healthCheck(): Promise<{
        main: boolean;
        slave: boolean;
        mainError?: string;
        slaveError?: string;
    }> {
        const result = {
            main: false,
            slave: false,
            mainError: undefined as string | undefined,
            slaveError: undefined as string | undefined,
        };

        // Check main database
        try {
            await this.mainClient.$queryRaw`SELECT 1`;
            result.main = true;
        } catch (error) {
            result.mainError = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Main database health check failed:', error);
        }

        // Check slave database
        try {
            await this.slaveClient.$queryRaw`SELECT 1`;
            result.slave = true;
        } catch (error) {
            result.slaveError = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Slave database health check failed:', error);
        }

        return result;
    }

    // Graceful shutdown
    public async disconnect(): Promise<void> {
        try {
            await this.mainClient.$disconnect();
            await this.slaveClient.$disconnect();
            logger.info('Database connections closed successfully');
        } catch (error) {
            logger.error('Error closing database connections:', error);
        }
    }
}

// Convenience functions for direct access
export const db = DatabaseRouter.getInstance();
export const readDb = () => db.getReadClient();
export const writeDb = () => db.getWriteClient();

// Initialize connections on module load
initializeConnections();

import { web } from './application/web.js';
import { env } from './config/env.js';
import { disconnectDatabases } from './application/prisma.js';

const server = web.listen(env.PORT, () => {
    console.log(`[server] listening on http://localhost:${env.PORT}/api`);
    console.log(`[server] Health check available at http://localhost:${env.PORT}/api/health/health`);
    console.log(`[server] Replication status at http://localhost:${env.PORT}/api/health/replication`);
});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
    console.log(`[server] Received ${signal}. Starting graceful shutdown...`);
    
    server.close(async () => {
        console.log('[server] HTTP server closed');
        
        try {
            await disconnectDatabases();
            console.log('[server] Database connections closed');
        } catch (error) {
            console.error('[server] Error closing database connections:', error);
        }
        
        console.log('[server] Graceful shutdown completed');
        process.exit(0);
    });
    
    // Force shutdown after 30 seconds
    setTimeout(() => {
        console.error('[server] Forced shutdown after timeout');
        process.exit(1);
    }, 30000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('[server] Uncaught Exception:', error);
    gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[server] Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('unhandledRejection');
});
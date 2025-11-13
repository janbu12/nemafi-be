import { Request, Response } from 'express';
import { checkDatabaseHealth } from '../application/prisma.js';
import { responseHandler } from '../utils/responseHandler.js';

// Health check endpoint for monitoring database replication
export const healthCheck = async (req: Request, res: Response) => {
    try {
        const health = await checkDatabaseHealth();
        
        const overallHealth = health.main && health.slave;
        
        const healthData = {
            status: overallHealth ? 'healthy' : 'unhealthy',
            timestamp: new Date().toISOString(),
            databases: {
                main: {
                    status: health.main ? 'healthy' : 'unhealthy',
                    error: health.mainError || null,
                },
                slave: {
                    status: health.slave ? 'healthy' : 'unhealthy',
                    error: health.slaveError || null,
                },
            },
            replication: {
                main_available: health.main,
                slave_available: health.slave,
                replication_working: health.main && health.slave,
            },
        };

        const statusCode = overallHealth ? 200 : 503;
        
        responseHandler(res, healthData, 'Database health check completed', statusCode);
    } catch (error) {
        console.error('Health check error:', error);
        responseHandler(
            res, 
            { 
                status: 'error', 
                message: 'Health check failed',
                error: error instanceof Error ? error.message : 'Unknown error'
            }, 
            'Health check failed', 
            500
        );
    }
};

// Detailed replication status endpoint
export const replicationStatus = async (req: Request, res: Response) => {
    try {
        const health = await checkDatabaseHealth();
        
        if (!health.main) {
            return responseHandler(
                res,
                { error: 'Main database not available' },
                'Cannot check replication status - main database unavailable',
                503
            );
        }

        // Get replication status from main database
        const { getMainDatabase } = await import('../application/prisma.js');
        const mainDb = getMainDatabase();
        
        const replicationStats = await mainDb.$queryRaw`
            SELECT 
                client_addr,
                application_name,
                state,
                sync_state,
                sync_priority,
                pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), flush_lsn)) as lag
            FROM pg_stat_replication
        ` as any[];

        const responseData = {
            timestamp: new Date().toISOString(),
            health: {
                main: health.main,
                slave: health.slave,
            },
            replication: {
                active_connections: replicationStats.length,
                connections: replicationStats.map(stat => ({
                    client_addr: stat.client_addr,
                    application_name: stat.application_name,
                    state: stat.state,
                    sync_state: stat.sync_state,
                    sync_priority: stat.sync_priority,
                    lag: stat.lag,
                })),
            },
        };

        responseHandler(res, responseData, 'Replication status retrieved successfully');
    } catch (error) {
        console.error('Replication status error:', error);
        responseHandler(
            res,
            { 
                error: 'Failed to get replication status',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            'Failed to get replication status',
            500
        );
    }
};

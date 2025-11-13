#!/usr/bin/env node

/**
 * Database Replication Test Script
 * Tests read/write operations on main and slave databases
 */

const { PrismaClient } = require('@prisma/client');

// Database connections
const mainDb = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_MAIN_URL || process.env.DATABASE_URL,
        },
    },
});

const slaveDb = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_SLAVE_URL,
        },
    },
});

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testDatabaseConnection(db, name) {
    try {
        await db.$queryRaw`SELECT 1`;
        log(`✅ ${name} database connection successful`, 'green');
        return true;
    } catch (error) {
        log(`❌ ${name} database connection failed: ${error.message}`, 'red');
        return false;
    }
}

async function testWriteOperation() {
    try {
        log('📝 Testing write operation on main database...', 'blue');
        
        // Create a test user
        const testUser = await mainDb.user.create({
            data: {
                email: `test-${Date.now()}@example.com`,
                fullname: 'Test User',
                password: 'hashedpassword',
                role: 'CUSTOMER',
            },
        });
        
        log(`✅ Write operation successful. Created user with ID: ${testUser.id}`, 'green');
        return testUser.id;
    } catch (error) {
        log(`❌ Write operation failed: ${error.message}`, 'red');
        throw error;
    }
}

async function testReadOperation(userId) {
    try {
        log('📖 Testing read operation on slave database...', 'blue');
        
        // Wait a bit for replication to catch up
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const user = await slaveDb.user.findUnique({
            where: { id: userId },
        });
        
        if (user) {
            log(`✅ Read operation successful. Found user: ${user.email}`, 'green');
            return true;
        } else {
            log(`⚠️  Read operation: User not found (might be replication lag)`, 'yellow');
            return false;
        }
    } catch (error) {
        log(`❌ Read operation failed: ${error.message}`, 'red');
        throw error;
    }
}

async function testReplicationLag() {
    try {
        log('⏱️  Testing replication lag...', 'blue');
        
        const lagQuery = await mainDb.$queryRaw`
            SELECT 
                pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), flush_lsn)) as lag
            FROM pg_stat_replication
        `;
        
        if (lagQuery && lagQuery.length > 0) {
            log(`✅ Replication lag: ${lagQuery[0].lag}`, 'green');
        } else {
            log('⚠️  No active replication connections found', 'yellow');
        }
    } catch (error) {
        log(`❌ Failed to check replication lag: ${error.message}`, 'red');
    }
}

async function cleanupTestData(userId) {
    try {
        log('🧹 Cleaning up test data...', 'blue');
        await mainDb.user.delete({
            where: { id: userId },
        });
        log('✅ Test data cleaned up', 'green');
    } catch (error) {
        log(`⚠️  Failed to clean up test data: ${error.message}`, 'yellow');
    }
}

async function runTests() {
    log('🚀 Starting Database Replication Tests', 'cyan');
    log('=====================================', 'cyan');
    
    let testUserId = null;
    
    try {
        // Test database connections
        log('\n1. Testing Database Connections', 'magenta');
        const mainConnected = await testDatabaseConnection(mainDb, 'Main');
        const slaveConnected = await testDatabaseConnection(slaveDb, 'Slave');
        
        if (!mainConnected || !slaveConnected) {
            log('❌ Cannot proceed with tests due to connection failures', 'red');
            return;
        }
        
        // Test replication lag
        log('\n2. Checking Replication Status', 'magenta');
        await testReplicationLag();
        
        // Test write operation
        log('\n3. Testing Write Operations', 'magenta');
        testUserId = await testWriteOperation();
        
        // Test read operation
        log('\n4. Testing Read Operations', 'magenta');
        const readSuccess = await testReadOperation(testUserId);
        
        // Summary
        log('\n📊 Test Summary', 'cyan');
        log('===============', 'cyan');
        log(`Main DB Connection: ${mainConnected ? '✅' : '❌'}`);
        log(`Slave DB Connection: ${slaveConnected ? '✅' : '❌'}`);
        log(`Write Operation: ✅`);
        log(`Read Operation: ${readSuccess ? '✅' : '⚠️'}`);
        
        if (mainConnected && slaveConnected && readSuccess) {
            log('\n🎉 All tests passed! Database replication is working correctly.', 'green');
        } else {
            log('\n⚠️  Some tests failed. Please check the replication setup.', 'yellow');
        }
        
    } catch (error) {
        log(`\n❌ Test suite failed: ${error.message}`, 'red');
    } finally {
        // Cleanup
        if (testUserId) {
            await cleanupTestData(testUserId);
        }
        
        // Close connections
        await mainDb.$disconnect();
        await slaveDb.$disconnect();
        
        log('\n👋 Tests completed. Database connections closed.', 'cyan');
    }
}

// Handle script termination
process.on('SIGINT', async () => {
    log('\n\n🛑 Test interrupted by user', 'yellow');
    await mainDb.$disconnect();
    await slaveDb.$disconnect();
    process.exit(0);
});

// Run tests
runTests().catch(error => {
    log(`\n💥 Unexpected error: ${error.message}`, 'red');
    process.exit(1);
});

# Database Replication Setup Guide

## Overview

This project implements PostgreSQL Master-Slave replication with automatic read/write routing:
- **Main Database (Master)**: Handles all write operations (CREATE, UPDATE, DELETE)
- **Slave Database (Read Replica)**: Handles all read operations (SELECT)

## Architecture

```
Application
    ↓
Database Router Service
    ↓
┌─────────────────┬─────────────────┐
│   Main DB       │   Slave DB      │
│   (Port 5432)   │   (Port 5433)   │
│   Write Ops     │   Read Ops      │
└─────────────────┴─────────────────┘
```

## Setup Instructions

### 1. Environment Configuration

Update your `.env` file with the following variables:

```env
# Main Database (Master) - for write operations
DATABASE_URL=postgresql://app:app@localhost:5432/appdb
DATABASE_MAIN_URL=postgresql://app:app@localhost aplicaciones

# Slave Database (Read Replica) - for read operations
DATABASE_SLAVE_URL=postgresql://app:app@localhost:5433/appdb
```

### 2. Start the Databases

```bash
# Start both main and slave databases
docker-compose up -d

# Check if containers are running
docker-compose ps
```

### 3. Setup Replication

```bash
# Run the replication setup script
./postgres-config/setup-replication.sh
```

This script will:
- Create replication user on master
- Create replication slot
- Perform base backup from master to slave
- Configure slave for streaming replication

### 4. Verify Replication

```bash
# Check replication status on master
docker exec nemafi_db_main psql -U app -d appdb -c "SELECT client_addr, state, sync_state FROM pg_stat_replication;"

# Test read operations on slave
docker exec nemafi_db_slave psql -U app -d appdb -c "SELECT COUNT(*) FROM users;"
```

## Usage in Code

### Basic Usage

```typescript
import { getReadClient, getWriteClient } from '../application/prisma.js';

// Read operations - automatically routed to slave database
async function getUsers() {
    const readClient = getReadClient();
    return await readClient.user.findMany();
}

// Write operations - automatically routed to main database
async function createUser(userData: any) {
    const writeClient = getWriteClient();
    return await writeClient.user.create({ data: userData });
}
```

### Using Database Router

```typescript
import { db } from '../services/databaseRouterService.js';

// Read operations
async function getUsers() {
    const readClient = db.getReadClient();
    return await readClient.user.findMany();
}

// Write operations
async function createUser(userData: any) {
    const writeClient = db.getWriteClient();
    return await writeClient.user.create({ data: userData });
}

// Transactions (always on main database)
async function createUserWithProfile(userData: any, profileData: any) {
    return await db.executeTransaction(async (client) => {
        const user = await client.user.create({ data: userData });
        const profile = await client.profile.create({
            data: { ...profileData, user_id: user.id }
        });
        return { user, profile };
    });
}
```

### Health Check

```typescript
import { checkDatabaseHealth } from '../application/prisma.js';

async function healthCheck() {
    const health = await checkDatabaseHealth();
    console.log('Main DB:', health.main ? 'Healthy' : 'Unhealthy');
    console.log('Slave DB:', health.slave ? 'Healthy' : 'Unhealthy');
    
    if (health.mainError) {
        console.error('Main DB Error:', health.mainError);
    }
    if (health.slaveError) {
        console.error('Slave DB Error:', health.slaveError);
    }
}
```

## Monitoring

### Check Replication Status

```bash
# On master database
docker exec nemafi_db_main psql -U app -d appdb -c "
SELECT 
    client_addr,
    application_name,
    state,
    sync_state,
    sync_priority,
    sync_priority,
    pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), flush_lsn)) as lag
FROM pg_stat_replication;
"
```

### Check Database Health

```bash
# Main database health
docker exec nemafi_db_main pg_isready -U app -d appdb

# Slave database health
docker exec nemafi_db_slave pg_isready -U app -d appdb
```

## Troubleshooting

### Common Issues

1. **Replication not working**: Check if replication user exists and has proper permissions
2. **Slave database not connecting**: Verify network connectivity and credentials
3. **Lag issues**: Monitor WAL replication lag and adjust configuration if needed

### Reset Replication

```bash
# Stop slave database
docker stop nemafi_db_slave

# Remove slave data
docker volume rm nemafi-be_db_slave_data

# Restart slave container
docker-compose up -d db-slave

# Re-run setup script
./postgres-config/setup-replication.sh
```

## Performance Considerations

- **Read Operations**: Automatically distributed to slave database for better performance
- **Write Operations**: Always go to main database to ensure consistency
- **Transactions**: Always executed on main database
- **Connection Pooling**: Each database has its own connection pool

## Security Notes

- Replication user has limited permissions (only replication)
- Use strong passwords for production environments
- Consider SSL/TLS for database connections in production
- Regularly monitor replication lag and connection status

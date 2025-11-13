# Database Replication Implementation

## Overview

Implementasi database replication dengan PostgreSQL Master-Slave architecture untuk meningkatkan performa dan availability aplikasi.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                        │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│              Database Router Service                        │
│  • Automatic read/write routing                            │
│  • Connection pooling                                      │
│  • Health monitoring                                       │
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        │                           │
┌───────▼────────┐        ┌────────▼────────┐
│   Main DB      │        │   Slave DB      │
│   (Master)     │        │   (Read Only)   │
│   Port: 5432   │        │   Port: 5433   │
│   Write Ops    │◄───────┤   Read Ops      │
│   CREATE       │        │   SELECT        │
│   UPDATE       │        │   JOIN          │
│   DELETE       │        │   COUNT         │
└────────────────┘        └─────────────────┘
```

## Features

- ✅ **Automatic Read/Write Routing**: Read operations otomatis diarahkan ke slave database
- ✅ **Connection Pooling**: Setiap database memiliki connection pool terpisah
- ✅ **Health Monitoring**: Endpoint untuk monitoring kesehatan database
- ✅ **Graceful Shutdown**: Proper cleanup saat aplikasi dihentikan
- ✅ **Replication Monitoring**: Monitoring lag dan status replication
- ✅ **Fallback Mechanism**: Otomatis fallback ke main database jika slave tidak tersedia

## Quick Start

### 1. Setup Environment

Copy file environment contoh:
```bash
cp env.example .env
```

Edit `.env` file:
```env
# Main Database (Master) - for write operations
DATABASE_URL=postgresql://app:app@localhost:5432/appdb
DATABASE_MAIN_URL=postgresql://app:app@localhost:5432/appdb

# Slave Database (Read Replica) - for read operations
DATABASE_SLAVE_URL=postgresql://app:app@localhost:5433/appdb

# Other configurations...
JWT_SECRET=your-super-secret-jwt-key-here-min-16-chars
GEMINI_API_KEY=your-gemini-api-key-here
```

### 2. Start Databases

```bash
# Start both databases
docker-compose up -d

# Check status
docker-compose ps
```

### 3. Setup Replication

```bash
# Run setup script
./scripts/setup-replication.sh
```

### 4. Test Replication

```bash
# Test database replication
node scripts/test-replication.js
```

### 5. Start Application

```bash
# Start the application
npm run dev
```

## API Endpoints

### Health Check
```
GET /api/health/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "databases": {
    "main": {
      "status": "healthy",
      "error": null
    },
    "slave": {
      "status": "healthy",
      "error": null
    }
  },
  "replication": {
    "main_available": true,
    "slave_available": true,
    "replication_working": true
  }
}
```

### Replication Status
```
GET /api/health/replication
```

Response:
```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "health": {
    "main": true,
    "slave": true
  },
  "replication": {
    "active_connections": 1,
    "connections": [
      {
        "client_addr": "172.18.0.3",
        "application_name": "walreceiver",
        "state": "streaming",
        "sync_state": "async",
        "sync_priority": 0,
        "lag": "0 bytes"
      }
    ]
  }
}
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
}
```

## Monitoring

### Check Replication Status

```bash
# Check replication status on master
docker exec nemafi_db_main psql -U app -d appdb -c "
SELECT 
    client_addr,
    application_name,
    state,
    sync_state,
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

### Application Health Check

```bash
# Check application health
curl http://localhost:3000/api/health/health

# Check replication status
curl http://localhost:3000/api/health/replication
```

## Performance Benefits

### Read Operations
- **Load Distribution**: Read queries didistribusikan ke slave database
- **Better Performance**: Mengurangi load pada main database
- **Scalability**: Mudah menambah slave database tambahan

### Write Operations
- **Consistency**: Semua write operations tetap pada main database
- **Data Integrity**: Tidak ada masalah dengan data consistency
- **Transaction Support**: Full transaction support pada main database

## Troubleshooting

### Common Issues

1. **Replication not working**
   ```bash
   # Check replication status
   docker exec nemafi_db_main psql -U app -d appdb -c "SELECT * FROM pg_stat_replication;"
   
   # Restart replication
   ./scripts/setup-replication.sh
   ```

2. **Slave database not connecting**
   ```bash
   # Check slave database logs
   docker logs nemafi_db_slave
   
   # Check network connectivity
   docker exec nemafi_db_slave ping db-main
   ```

3. **High replication lag**
   ```bash
   # Check lag
   docker exec nemafi_db_main psql -U app -d appdb -c "
   SELECT pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), flush_lsn)) as lag
   FROM pg_stat_replication;
   "
   ```

### Reset Replication

```bash
# Stop all containers
docker-compose down -v

# Remove volumes
docker volume rm nemafi-be_db_main_data nemafi-be_db_slave_data

# Start fresh
docker-compose up -d
./scripts/setup-replication.sh
```

## Production Considerations

### Security
- Gunakan SSL/TLS untuk database connections
- Implementasi proper authentication dan authorization
- Regular security updates untuk PostgreSQL

### Monitoring
- Setup monitoring untuk replication lag
- Alert jika replication terputus
- Monitor database performance metrics

### Backup
- Regular backup dari main database
- Test restore procedures
- Document disaster recovery procedures

### Scaling
- Pertimbangkan read replicas tambahan
- Load balancer untuk multiple slave databases
- Connection pooling optimization

## File Structure

```
├── docker.compose.yml              # Docker configuration for dual databases
├── postgres-config/               # PostgreSQL configuration files
│   ├── main/                      # Main database configuration
│   │   ├── postgresql.conf
│   │   └── pg_hba.conf
│   ├── slave/                     # Slave database configuration
│   │   ├── postgresql.conf
│   │   └── pg_hba.conf
│   └── setup-replication.sh       # Replication setup script
├── scripts/                       # Utility scripts
│   ├── setup-replication.sh       # Automated setup script
│   └── test-replication.js        # Replication test script
├── src/
│   ├── services/
│   │   └── databaseRouterService.ts  # Database routing service
│   ├── controllers/
│   │   └── healthController.ts       # Health check controller
│   ├── routes/
│   │   └── healthRoutes.ts           # Health check routes
│   └── application/
│       └── prisma.ts                 # Updated Prisma configuration
└── DATABASE_REPLICATION_SETUP.md    # Detailed setup documentation
```

## Support

Jika mengalami masalah dengan implementasi database replication:

1. Check logs: `docker logs nemafi_db_main` dan `docker logs nemafi_db_slave`
2. Verify configuration: Pastikan semua environment variables sudah benar
3. Test connectivity: Gunakan `scripts/test-replication.js`
4. Check documentation: Lihat `DATABASE_REPLICATION_SETUP.md` untuk detail lebih lengkap

#!/bin/bash

# Database Replication Setup Script
# This script sets up PostgreSQL Master-Slave replication

set -e

echo "🚀 Starting Database Replication Setup..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    print_error "docker-compose is not installed. Please install docker-compose and try again."
    exit 1
fi

print_status "Docker and docker-compose are available"

# Stop existing containers if any
print_status "Stopping existing containers..."
docker-compose down -v 2>/dev/null || true

# Start the databases
print_status "Starting main and slave databases..."
docker-compose up -d

# Wait for main database to be ready
print_status "Waiting for main database to be ready..."
until docker exec nemafi_db_main pg_isready -U app -d appdb > /dev/null 2>&1; do
    echo -n "."
    sleep 2
done
echo ""

# Wait for slave database to be ready
print_status "Waiting for slave database to be ready..."
until docker exec nemafi_db_slave pg_isready -U app -d appdb > /dev/null 2>&1; do
    echo -n "."
    sleep 2
done
echo ""

print_status "Both databases are ready"

# Create replication user on master
print_status "Creating replication user on master..."
docker exec nemafi_db_main psql -U app -d appdb -c "
CREATE USER replicator WITH REPLICATION ENCRYPTED PASSWORD 'replicator_password';
" 2>/dev/null || print_warning "Replication user might already exist"

# Create replication slot on master
print_status "Creating replication slot on master..."
docker exec nemafi_db_main psql -U app -d appdb -c "
SELECT pg_create_physical_replication_slot('replication_slot');
" 2>/dev/null || print_warning "Replication slot might already exist"

# Stop slave database for initial backup
print_status "Stopping slave database for initial backup..."
docker stop nemafi_db_slave

# Perform base backup from master
print_status "Performing base backup from master..."
docker run --rm \
  --network nemafi-be_default \
  -e PGPASSWORD=replicator_password \
  -v nemafi-be_db_slave_data:/backup \
  postgres:16 \
  pg_basebackup -h db-main -D /backup -U replicator -v -P -W

# Create recovery configuration on slave
print_status "Creating recovery configuration on slave..."
docker run --rm \
  -v nemafi-be_db_slave_data:/data \
  postgres:16 \
  bash -c "
cat > /data/recovery.conf << EOF
standby_mode = 'on'
primary_conninfo = 'host=db-main port=5432 user=replicator password=replicator_password'
primary_slot_name = 'replication_slot'
EOF
"

# Start slave database
print_status "Starting slave database..."
docker start nemafi_db_slave

# Wait for slave to connect to master
print_status "Waiting for slave to connect to master..."
sleep 10

# Check replication status
print_status "Checking replication status..."
REPLICATION_STATUS=$(docker exec nemafi_db_main psql -U app -d appdb -t -c "
SELECT COUNT(*) FROM pg_stat_replication;
" 2>/dev/null | tr -d ' \n')

if [ "$REPLICATION_STATUS" = "1" ]; then
    print_status "✅ Replication is working correctly!"
else
    print_error "❌ Replication setup failed. Please check the logs."
    exit 1
fi

# Display replication details
print_status "Replication details:"
docker exec nemafi_db_main psql -U app -d appdb -c "
SELECT 
    client_addr,
    application_name,
    state,
    sync_state,
    pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), flush_lsn)) as lag
FROM pg_stat_replication;
"

print_status "🎉 Database replication setup completed successfully!"
print_status "Main database: localhost:5432"
print_status "Slave database: localhost:5433"
print_status "You can now start your application with: npm run dev"

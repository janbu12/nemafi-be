#!/bin/bash

# Setup script for PostgreSQL Master-Slave replication
# Run this script after both containers are running

MASTER_HOST="db-main"
SLAVE_HOST="db-slave"
MASTER_PORT="5432"
SLAVE_PORT="5432"
REPLICATION_USER="replicator"
REPLICATION_PASSWORD="replicator_password"
DATABASE="appdb"

echo "Setting up PostgreSQL Master-Slave replication..."

# Wait for master to be ready
echo "Waiting for master database to be ready..."
until docker exec nemafi_db_main pg_isready -U app -d appdb; do
  echo "Master database is not ready yet..."
  sleep 2
done

# Wait for slave to be ready
echo "Waiting for slave database to be ready..."
until docker exec nemafi_db_slave pg_isready -U app -d appdb; do
  echo "Slave database is not ready yet..."
  sleep 2
done

echo "Creating replication user on master..."
docker exec nemafi_db_main psql -U app -d appdb -c "
CREATE USER $REPLICATION_USER WITH REPLICATION ENCRYPTED PASSWORD '$REPLICATION_PASSWORD';
"

echo "Creating replication slot on master..."
docker exec nemafi_db_main psql -U app -d appdb -c "
SELECT pg_create_physical_replication_slot('replication_slot');
"

echo "Stopping slave database for initial backup..."
docker stop nemafi_db_slave

echo "Performing base backup from master..."
docker run --rm \
  --network nemafi-be_default \
  -e PGPASSWORD=$REPLICATION_PASSWORD \
  -v nemafi-be_db_slave_data:/backup \
  postgres:16 \
  pg_basebackup -h $MASTER_HOST -D /backup -U $REPLICATION_USER -v -P -W

echo "Creating recovery configuration on slave..."
docker run --rm \
  -v nemafi-be_db_slave_data:/data \
  postgres:16 \
  bash -c "
cat > /data/recovery.conf << EOF
standby_mode = 'on'
primary_conninfo = 'host=$MASTER_HOST port=$MASTER_PORT user=$REPLICATION_USER password=$REPLICATION_PASSWORD'
primary_slot_name = 'replication_slot'
EOF
"

echo "Starting slave database..."
docker start nemafi_db_slave

echo "Waiting for slave to connect to master..."
sleep 10

echo "Checking replication status..."
docker exec nemafi_db_main psql -U app -d appdb -c "
SELECT client_addr, state, sync_state FROM pg_stat_replication;
"

echo "Replication setup completed!"
echo "Master database: localhost:5432"
echo "Slave database: localhost:5433"

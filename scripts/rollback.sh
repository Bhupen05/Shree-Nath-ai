#!/bin/bash

# Rollback Script
# Usage: ./rollback.sh [to_version]

set -e

TO_VERSION=${1:-"previous"}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/var/log/shree-nath/rollback_${TIMESTAMP}.log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Starting Shree-Nath Rollback${NC}"
echo "Rolling back to: $TO_VERSION"
echo "Timestamp: $TIMESTAMP"
echo "Log: $LOG_FILE"

log_message() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

check_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ $1${NC}"
        log_message "✓ $1"
    else
        echo -e "${RED}✗ $1 FAILED${NC}"
        log_message "✗ $1 FAILED"
        exit 1
    fi
}

# Check root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root${NC}"
    exit 1
fi

# Stop application
echo -e "${YELLOW}Stopping application...${NC}"
systemctl stop shree-nath-api
check_status "Stop application"

# Restore from backup if needed
if [ "$TO_VERSION" = "database_only" ]; then
    echo -e "${YELLOW}Restoring database...${NC}"
    # Find latest backup
    LATEST_BACKUP=$(ls -t /backups/backup_*.sql.gz | head -1)
    gunzip -c "$LATEST_BACKUP" | psql -U postgres -d shree_nath
    check_status "Database restore"
fi

# Rollback application
cd /opt/shree-nath
echo -e "${YELLOW}Rolling back application...${NC}"

if [ "$TO_VERSION" = "previous" ]; then
    git checkout -
else
    git checkout "tags/$TO_VERSION" 2>/dev/null || git checkout "$TO_VERSION"
fi
check_status "Checkout version"

# Reinstall dependencies
npm install --production
check_status "Install dependencies"

# Start application
echo -e "${YELLOW}Starting application...${NC}"
systemctl start shree-nath-api
check_status "Start application"

# Health checks
sleep 5

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health)
if [ "$HTTP_CODE" -eq 200 ]; then
    check_status "Health check"
else
    echo -e "${RED}Health check failed (HTTP $HTTP_CODE)${NC}"
    exit 1
fi

echo -e "${GREEN}Rollback completed successfully!${NC}"
log_message "Rollback completed successfully"

exit 0

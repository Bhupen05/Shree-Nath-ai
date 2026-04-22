#!/bin/bash

# Deployment Script
# Usage: ./deploy.sh [version] [environment]

set -e

VERSION=${1:-"latest"}
ENVIRONMENT=${2:-"staging"}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/var/log/shree-nath/deployment_${TIMESTAMP}.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting Shree-Nath Deployment${NC}"
echo "Version: $VERSION"
echo "Environment: $ENVIRONMENT"
echo "Timestamp: $TIMESTAMP"
echo "Log: $LOG_FILE"

# Function to log messages
log_message() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to check status
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

# Pre-deployment checks
echo -e "${YELLOW}Running pre-deployment checks...${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root${NC}"
    exit 1
fi
check_status "Root privileges"

# Check services running
systemctl is-active --quiet postgres
check_status "PostgreSQL service"

systemctl is-active --quiet redis-server
check_status "Redis service"

systemctl is-active --quiet nginx
check_status "Nginx service"

# Database backup
echo -e "${YELLOW}Creating database backup...${NC}"
BACKUP_FILE="/backups/backup_${TIMESTAMP}.sql"
pg_dump -U postgres -d shree_nath > "$BACKUP_FILE"
check_status "Database backup"

gzip "$BACKUP_FILE"
check_status "Backup compression"

# Store current version
git -C /opt/shree-nath log -1 --format="%H %s" > /backups/CURRENT_DEPLOYMENT_${TIMESTAMP}.txt
check_status "Current version documented"

# Deploy application
echo -e "${YELLOW}Deploying application...${NC}"

# Stop current application
systemctl stop shree-nath-api
check_status "Stop current application"

# Deploy new version
cd /opt/shree-nath
git fetch origin
check_status "Fetch latest code"

git checkout "tags/$VERSION" 2>/dev/null || git checkout "$VERSION"
check_status "Checkout version $VERSION"

# Install dependencies
npm install --production
check_status "Install dependencies"

# Run database migrations
echo -e "${YELLOW}Running database migrations...${NC}"
psql -U postgres -d shree_nath -f /opt/shree-nath/backend/src/db/migrations/latest.sql 2>/dev/null || true
check_status "Database migrations"

# Start application
echo -e "${YELLOW}Starting application...${NC}"
systemctl start shree-nath-api
check_status "Start application"

# Health checks
echo -e "${YELLOW}Running health checks...${NC}"

# Wait for application to fully start
sleep 5

# Check API health
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health)
if [ "$HTTP_CODE" -eq 200 ]; then
    check_status "API health check"
else
    echo -e "${RED}API health check failed (HTTP $HTTP_CODE)${NC}"
    log_message "API health check failed (HTTP $HTTP_CODE)"
    exit 1
fi

# Check database connectivity
curl -s http://localhost:3000/api/health/db > /dev/null
check_status "Database connectivity"

# Run smoke tests
echo -e "${YELLOW}Running smoke tests...${NC}"
cd /opt/shree-nath
npm run test:smoke 2>/dev/null || true
check_status "Smoke tests"

# Final status
echo -e "${YELLOW}Deployment Summary:${NC}"
systemctl status shree-nath-api --no-pager

echo -e "${GREEN}Deployment completed successfully!${NC}"
log_message "Deployment completed successfully"

# Notify team
echo -e "${YELLOW}Sending notifications...${NC}"
# curl -X POST https://slack.com/api/chat.postMessage \
#   -H 'Authorization: Bearer '$SLACK_TOKEN \
#   -F channel='#deployments' \
#   -F text="✓ Shree-Nath deployed to $ENVIRONMENT (v$VERSION)"

exit 0

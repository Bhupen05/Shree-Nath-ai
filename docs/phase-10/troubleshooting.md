# Phase 10 Troubleshooting Guide

## Quick Diagnosis

### System Status Check

```bash
# Complete system health check
curl -s http://localhost:3000/api/health/detailed | jq .

# Expected response:
{
  "api": "ok",
  "database": "ok",
  "cache": "ok",
  "disk": "ok",
  "memory": "ok"
}
```

### Quick Troubleshooting Matrix

| Symptom | Likely Cause | Solution |
|---------|------|----------|
| API not responding | Service stopped or crashed | Check systemctl status, view logs |
| High error rate | Database issue or bug | Check DB connection, review error logs |
| Slow response times | Resource constraint or query issue | Check CPU/memory/slow queries |
| Missing data | Migration issue or sync problem | Verify database state, check logs |
| Memory leak | Long-running process memory growth | Restart service, check for loops |

---

## Common Issues & Solutions

### Issue 1: API Service Down

**Symptoms:**
- `curl http://localhost:3000/health` returns connection refused
- Application won't start
- Port already in use

**Diagnosis:**
```bash
# Check if service is running
systemctl status shree-nath-api

# Check if port is in use
netstat -tln | grep 3000

# View recent errors
journalctl -u shree-nath-api -n 50 --no-pager
```

**Solutions:**

**Solution A: Port Already in Use**
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Restart service
systemctl restart shree-nath-api
```

**Solution B: Service Crashed**
```bash
# Check logs for error
tail -100 /var/log/shree-nath/error.log

# If application code issue:
cd /opt/shree-nath
npm start

# If database connection issue:
# Check DB_HOST, DB_PORT, DB_USER, DB_PASSWORD
env | grep DB_
```

**Solution C: Configuration Issue**
```bash
# Verify environment variables
env | grep NODE_ENV
env | grep DATABASE_URL

# If missing, set them
export NODE_ENV=production
export DATABASE_URL=postgres://user:pass@localhost/dbname

# Restart
systemctl restart shree-nath-api
```

**Solution D: Out of Memory**
```bash
# Check memory usage
free -h

# If low, increase swap or add RAM
# Temporary increase swap (requires sudo)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Restart service
systemctl restart shree-nath-api
```

---

### Issue 2: High Error Rate

**Symptoms:**
- Error rate > 1%
- Many 5xx responses
- Errors in application logs

**Diagnosis:**
```bash
# Check current error rate
curl -s http://localhost:3000/metrics | grep errors_total

# View error logs
tail -50 /var/log/shree-nath/error.log

# Check specific error type
grep "ERROR" /var/log/shree-nath/error.log | tail -20
```

**Common Error Causes:**

**Cause 1: Database Connection Failed**
```bash
# Check database status
psql -U postgres -d shree_nath -c "SELECT 1"

# Check connection pool
psql -U postgres -d shree_nath -c "SELECT count(*) FROM pg_stat_activity"

# If connections maxed, restart app
systemctl restart shree-nath-api
```

**Cause 2: Memory Pressure**
```bash
# Check memory
top -b -n 1 | head -20

# If high, check top processes
ps aux --sort=-%mem | head -10

# Restart if memory exhausted
systemctl restart shree-nath-api
```

**Cause 3: Slow Database Queries**
```bash
# Check slow queries
psql -U postgres -d shree_nath -c "
  SELECT query, calls, total_time, mean_time 
  FROM pg_stat_statements 
  ORDER BY mean_time DESC LIMIT 10
"

# If queries > 1000ms, need optimization
# See Performance Tuning guide
```

**Cause 4: Application Bug**
```bash
# Check application logs for stack traces
grep -A 10 "Stack trace" /var/log/shree-nath/error.log

# Review recent code changes
git log --oneline -10

# If critical, consider rollback
./scripts/rollback.sh
```

---

### Issue 3: Slow Response Times

**Symptoms:**
- Response time p95 > 500ms
- p99 > 1s
- Users report delays

**Diagnosis:**
```bash
# Check response time metrics
curl -s http://localhost:3000/metrics | grep http_request_duration

# Check dashboard load time
time curl -s http://localhost:3000/api/kpis > /dev/null

# Check slow queries
psql -U postgres -d shree_nath -c "
  SELECT 
    query, 
    calls, 
    mean_time, 
    max_time 
  FROM pg_stat_statements 
  WHERE mean_time > 100 
  ORDER BY mean_time DESC
"
```

**Solutions:**

**Solution A: Database Query Optimization**
```bash
# Analyze query plan
psql -U postgres -d shree_nath << 'EOF'
EXPLAIN ANALYZE
SELECT * FROM bills 
WHERE bill_date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY bill_date DESC
LIMIT 100;
EOF

# If Sequential Scan, need index
CREATE INDEX idx_bills_date ON bills(bill_date DESC);

# Reanalyze
ANALYZE bills;
```

**Solution B: Increase Connection Pool**
```bash
# In src/db.js, increase max connections
const pool = new Pool({
  max: 75,  // Increase from 50
  // ... other config
});

# Restart service
systemctl restart shree-nath-api
```

**Solution C: Cache Responses**
```javascript
// Add caching for expensive queries
const redis = require('redis');
const client = redis.createClient();

app.get('/api/expensive-query', async (req, res) => {
  const cached = await client.get('expensive_query_key');
  if (cached) return res.json(JSON.parse(cached));
  
  const data = await expensiveQuery();
  await client.setex('expensive_query_key', 300, JSON.stringify(data));
  res.json(data);
});
```

**Solution D: Scale Horizontally**
```bash
# Add load balancer configuration
# In nginx.conf, add more upstream servers
upstream shree-nath {
  server localhost:3000;
  server localhost:3001;  # New instance
  server localhost:3002;  # New instance
}

# Start additional instances
PORT=3001 npm start &
PORT=3002 npm start &

# Reload nginx
systemctl reload nginx
```

---

### Issue 4: Database Connection Issues

**Symptoms:**
- "Connection refused"
- "Too many connections"
- Connection pool exhausted

**Diagnosis:**
```bash
# Test database connectivity
psql -U postgres -d shree_nath -c "SELECT 1"

# Check active connections
psql -U postgres -c "SELECT count(*) FROM pg_stat_activity"

# Check max connections setting
psql -U postgres -c "SHOW max_connections"

# Check connection pool status
curl -s http://localhost:3000/metrics | grep pg_pool
```

**Solutions:**

**Solution A: Max Connections Reached**
```bash
# Increase PostgreSQL max_connections
# Edit /etc/postgresql/12/main/postgresql.conf
# Change: max_connections = 100

# Reload PostgreSQL
systemctl reload postgresql

# Verify
psql -U postgres -c "SHOW max_connections"
```

**Solution B: Connection Pool Leak**
```bash
# Monitor connection count over time
watch -n 1 'psql -U postgres -c "SELECT count(*) FROM pg_stat_activity"'

# If count keeps increasing, pool leak detected
# Restart application
systemctl restart shree-nath-api

# Check app logs for unclosed connections
grep "query executed" /var/log/shree-nath/debug.log | tail -100
```

**Solution C: Idle Connections**
```bash
# Kill idle connections
psql -U postgres << 'EOF'
SELECT pg_terminate_backend(pid) FROM pg_stat_activity
WHERE state = 'idle' AND query_start < now() - INTERVAL '30 minutes';
EOF
```

**Solution D: Long-Running Queries**
```bash
# Find long-running queries
psql -U postgres << 'EOF'
SELECT pid, query, query_start FROM pg_stat_activity
WHERE query_start < now() - INTERVAL '5 minutes'
ORDER BY query_start;
EOF

# Cancel query if safe
SELECT pg_cancel_backend(<pid>);

# Or terminate if necessary
SELECT pg_terminate_backend(<pid>);
```

---

### Issue 5: High Memory Usage

**Symptoms:**
- Memory > 85%
- Application becomes unresponsive
- OOM killer triggers

**Diagnosis:**
```bash
# Check overall memory
free -h

# Check per-process memory
ps aux --sort=-%mem | head -10

# Check memory by module (Node.js)
node -e "console.log(Math.round(process.memoryUsage().heapUsed / 1024 / 1024));" 

# Check for memory leaks
watch -n 1 'ps aux | grep node | grep shree'
```

**Solutions:**

**Solution A: Increase System Memory**
```bash
# Add more RAM (requires infrastructure change)
# Or add swap space
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

**Solution B: Find Memory Leak**
```bash
# Profile memory usage
node --expose-gc -e "
  setInterval(() => {
    if (global.gc) global.gc();
    console.log(Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB');
  }, 5000);
"

# If memory keeps growing, investigate:
# - Open database connections
# - Cached data accumulation
# - Circular references
# - Event listener leaks
```

**Solution C: Optimize Queries**
```javascript
// Instead of loading all results:
const results = await pool.query('SELECT * FROM large_table');

// Use pagination:
const results = await pool.query(
  'SELECT * FROM large_table LIMIT $1 OFFSET $2',
  [1000, 0]
);
```

**Solution D: Increase Heap Size**
```bash
# Start with larger heap
node --max-old-space-size=4096 /opt/shree-nath/backend/src/index.js

# Or in systemd service
# ExecStart=/usr/bin/node --max-old-space-size=4096 /opt/shree-nath/backend/src/index.js

systemctl restart shree-nath-api
```

---

### Issue 6: Missing or Incorrect Data

**Symptoms:**
- Data not appearing in application
- Incorrect calculated values
- Referential integrity violations

**Diagnosis:**
```bash
# Check recent changes
psql -U postgres -d shree_nath << 'EOF'
SELECT * FROM audit_logs 
ORDER BY created_at DESC 
LIMIT 20;
EOF

# Verify data consistency
SELECT COUNT(*) FROM bills WHERE party_id NOT IN (SELECT id FROM parties);

# Check transaction status
SELECT * FROM information_schema.table_constraints 
WHERE constraint_type = 'FOREIGN KEY';
```

**Solutions:**

**Solution A: Failed Migration**
```bash
# Check migration status
psql -U postgres -d shree_nath -c "SELECT * FROM schema_version"

# Re-run migration if needed
psql -U postgres -d shree_nath -f /migrations/latest.sql

# Verify data integrity
psql -U postgres -d shree_nath << 'EOF'
SELECT COUNT(*) FROM bills;
SELECT COUNT(*) FROM bill_items;
EOF
```

**Solution B: Replication Lag**
```bash
# Check replication status (if applicable)
psql -U postgres -c "SELECT * FROM pg_stat_replication"

# If lagging, wait or restart replication
# For primary-only setup, this shouldn't be an issue
```

**Solution C: Transaction Rollback**
```bash
# Check for failed transactions
grep "ROLLBACK" /var/log/shree-nath/debug.log

# Identify and fix issues
# Retry transaction manually
psql -U postgres -d shree_nath << 'EOF'
BEGIN;
-- Your transaction
COMMIT;
EOF
```

---

### Issue 7: Deployment Failures

**Symptoms:**
- Deploy script fails
- Application won't start after deploy
- Health checks failing

**Diagnosis:**
```bash
# Check deployment log
tail -100 /var/log/shree-nath/deployment_*.log

# Check if application stopped
systemctl status shree-nath-api

# Check port availability
netstat -tln | grep 3000
```

**Solutions:**

**Solution A: Quick Rollback**
```bash
./scripts/rollback.sh
```

**Solution B: Manual Rollback**
```bash
# Stop current version
systemctl stop shree-nath-api

# Checkout previous version
cd /opt/shree-nath
git checkout tags/v1.9.0

# Reinstall
npm install --production

# Start
systemctl start shree-nath-api

# Verify
curl http://localhost:3000/health
```

**Solution C: Failed Migration Rollback**
```bash
# Restore database from backup
pg_restore -U postgres -d shree_nath < backup_previous.sql

# Or rollback specific migration
psql -U postgres -d shree_nath -f migrations/rollback_latest.sql
```

---

## Monitoring & Recovery

### Health Check Script

```bash
#!/bin/bash
# health_check.sh - Automated health monitoring

API_URL="http://localhost:3000"
ALERT_EMAIL="ops@company.com"

while true; do
  # Check API
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" $API_URL/health)
  
  if [ "$HTTP_CODE" -ne 200 ]; then
    echo "API DOWN: HTTP $HTTP_CODE"
    # Send alert
    echo "API is down!" | mail -s "ALERT: Shree-Nath API Down" $ALERT_EMAIL
    # Attempt restart
    systemctl restart shree-nath-api
    sleep 30
    continue
  fi
  
  # Check database
  DB_STATUS=$(curl -s $API_URL/api/health/db | jq -r '.status')
  if [ "$DB_STATUS" != "connected" ]; then
    echo "DB ISSUE: $DB_STATUS"
    echo "Database issue detected!" | mail -s "ALERT: Shree-Nath DB Issue" $ALERT_EMAIL
  fi
  
  sleep 60
done
```

### Error Log Analyzer

```bash
#!/bin/bash
# analyze_errors.sh - Analyze error patterns

ERROR_LOG="/var/log/shree-nath/error.log"

echo "=== Error Summary ==="
echo "Total errors (last hour):"
grep "$(date -d '1 hour ago' +%Y-%m-%d\ %H)" $ERROR_LOG | wc -l

echo -e "\nTop 5 error types:"
grep "ERROR" $ERROR_LOG | tail -100 | awk '{print $NF}' | sort | uniq -c | sort -rn | head -5

echo -e "\nRecent errors:"
tail -20 $ERROR_LOG
```

---

## Escalation Procedures

### When to Escalate

| Severity | Response Time | Escalation |
|----------|---------------|------------|
| Critical | Immediate | On-call → Manager → CTO |
| High | 15 minutes | On-call → Manager |
| Medium | 1 hour | Support team |
| Low | 4 hours | Backlog |

### Escalation Checklist

```
[ ] Document the issue
    - Time discovered
    - Symptoms
    - Impact
    - Steps taken

[ ] Gather logs
    - Application logs
    - Database logs
    - System logs
    - Error messages

[ ] Attempt recovery
    - Basic restart
    - Health checks
    - Database verification

[ ] Contact escalation chain
    - On-call engineer
    - If no response in 5 min → Manager
    - If no response in 15 min → CTO

[ ] Communicate status
    - Update #incidents channel
    - Notify affected users
    - Provide ETA
```

---

## Recovery Procedures

### Full System Recovery

```bash
#!/bin/bash
# recover.sh - Full system recovery

set -e

echo "Starting full system recovery..."

# 1. Backup current state
echo "Backing up current state..."
pg_dump -U postgres -d shree_nath > /tmp/recovery_backup_$(date +%s).sql

# 2. Stop services
echo "Stopping services..."
systemctl stop shree-nath-api
systemctl stop redis-server
systemctl stop nginx

# 3. Clear caches
echo "Clearing caches..."
redis-cli FLUSHALL

# 4. Verify database
echo "Verifying database..."
psql -U postgres -d shree_nath -c "SELECT 1"

# 5. Restart in order
echo "Restarting services..."
systemctl start postgresql
sleep 5
systemctl start redis-server
sleep 5
systemctl start shree-nath-api

# 6. Verify recovery
sleep 10
curl http://localhost:3000/health

echo "Recovery complete!"
```

---

## Performance Optimization

### During High Load

```bash
#!/bin/bash
# optimize_load.sh - Optimize for high load

# 1. Increase file descriptors
ulimit -n 65536

# 2. Optimize TCP settings
sysctl -w net.core.somaxconn=4096
sysctl -w net.ipv4.tcp_max_syn_backlog=4096

# 3. Scale application
PORT=3001 npm start &
PORT=3002 npm start &

# 4. Monitor
watch -n 1 'ps aux | grep node | grep -v grep'
```

---

## Contact & Resources

### Emergency Contacts
- On-Call: [Phone] / [Slack]
- Manager: [Phone] / [Email]
- CTO: [Phone] / [Email]

### Documentation Links
- [Production Deployment Guide](./PRODUCTION_DEPLOYMENT_GUIDE.md)
- [System Integration Guide](./system-integration-guide.md)
- [Monitoring Setup](./monitoring-setup.md)
- [Performance Tuning](./performance-tuning.md)

### Log Locations
- Application: `/var/log/shree-nath/application.log`
- Errors: `/var/log/shree-nath/error.log`
- Database: `/var/log/postgresql/postgresql.log`
- System: `/var/log/syslog`

---

**Version**: 1.0  
**Last Updated**: June 19, 2024  
**Maintained By**: DevOps Team

# Phase 10: Operations Quick Reference

## 🚨 Emergency Checklist (First 5 Minutes)

### System Down - Do This Immediately

```
1. [ ] Verify system is actually down
   - Try multiple times: curl http://localhost:3000/health
   - Check from different machine if possible

2. [ ] Check what's running
   - systemctl status shree-nath-api
   - systemctl status postgresql
   - systemctl status redis-server

3. [ ] Check error logs immediately
   - journalctl -u shree-nath-api -n 100 --no-pager

4. [ ] If recoverable: Restart
   - systemctl restart shree-nath-api

5. [ ] If still down: Call manager/CTO
   - Don't waste time, escalate
```

---

## 📊 Daily Checks (Run Every Morning)

```bash
# 1. System Status
curl -s http://localhost:3000/api/health/detailed | jq .

# Expected: all "ok"

# 2. Error Rate (Last Hour)
curl -s http://localhost:3000/metrics | grep errors_total

# Expected: < 10 errors

# 3. Database Connections
psql -U postgres -c "SELECT count(*) FROM pg_stat_activity"

# Expected: < 40 connections

# 4. Memory Usage
free -h | grep Mem

# Expected: Used < 80%

# 5. Disk Space
df -h | grep -E '/$|shree'

# Expected: Available > 20%

# 6. Backup Status
ls -lh /backups/ | tail -5

# Expected: Recent backup exists
```

---

## 🔧 Common Commands

### Service Management

```bash
# Start service
systemctl start shree-nath-api

# Stop service
systemctl stop shree-nath-api

# Restart service
systemctl restart shree-nath-api

# Check status
systemctl status shree-nath-api

# View logs
journalctl -u shree-nath-api -f

# View last 100 lines
journalctl -u shree-nath-api -n 100
```

### Database Operations

```bash
# Connect to database
psql -U postgres -d shree_nath

# Check connections
SELECT count(*) FROM pg_stat_activity;

# Check slow queries
SELECT query, mean_time FROM pg_stat_statements 
ORDER BY mean_time DESC LIMIT 5;

# Check database size
SELECT pg_size_pretty(pg_database_size('shree_nath'));

# Vacuum database
VACUUM ANALYZE;
```

### Monitoring

```bash
# Real-time metrics
curl -s http://localhost:3000/metrics | grep -E 'requests_total|errors_total'

# Dashboard data
curl -s http://localhost:3000/api/kpis | jq .

# Health check
curl http://localhost:3000/health

# Detailed health
curl http://localhost:3000/api/health/detailed
```

---

## 🚀 Deployment Quick Start

### Deploy New Version

```bash
# 1. Prepare
cd /opt/shree-nath
git fetch origin

# 2. Run automated deploy
./scripts/deploy.sh v2.0.0 production

# 3. Verify
curl http://localhost:3000/health
```

### Quick Rollback

```bash
# One command rollback
./scripts/rollback.sh v1.9.0

# Verify
curl http://localhost:3000/health
```

---

## 📈 Performance Check

### Response Time Health

```bash
# Check response times
curl -s http://localhost:3000/metrics | grep 'http_request_duration'

# Expected thresholds:
# p50: < 100ms ✅
# p95: < 500ms ✅
# p99: < 1000ms ✅
```

### Query Performance

```bash
# Identify slow queries
psql -U postgres -d shree_nath << 'EOF'
SELECT query, calls, mean_time 
FROM pg_stat_statements 
WHERE mean_time > 100 
ORDER BY mean_time DESC 
LIMIT 10;
EOF
```

### Resource Utilization

```bash
# CPU & Memory
top -b -n 1 | head -15

# Disk I/O
iostat -x 1 5

# Network
netstat -s | grep -i "segments"
```

---

## ⚠️ Alert Response Guide

### High Error Rate Alert

**Alert**: `http_errors_total` > threshold

**Response**:
1. Check error logs: `tail -50 /var/log/shree-nath/error.log`
2. Identify error type (DB, validation, logic)
3. If DB: Check connection pool
4. If logic: Check recent changes
5. If severe: Consider rollback
6. Document and notify team

### High Response Time Alert

**Alert**: `http_request_duration_p95` > 500ms

**Response**:
1. Check slow queries: See Database Operations section
2. If slow query: May need optimization
3. Check CPU/memory: See Resource Utilization section
4. If resource constrained: May need scaling
5. Check database connections: See Database Operations
6. If all normal: May be temporary spike

### Database Connection Alert

**Alert**: `pg_pool_connections` > 40

**Response**:
1. Check connections: `SELECT count(*) FROM pg_stat_activity`
2. Find idle connections: `SELECT * FROM pg_stat_activity WHERE state = 'idle'`
3. Kill idle: `SELECT pg_terminate_backend(pid) FROM ...`
4. If connections still high: Likely connection leak in app
5. Restart application: `systemctl restart shree-nath-api`

### Disk Space Alert

**Alert**: Disk usage > 90%

**Response**:
1. Check sizes: `df -h`
2. Find large directories: `du -sh /*`
3. Check log files: `du -sh /var/log/*`
4. Check database: `SELECT pg_database_size('shree_nath')`
5. Clean old files: `rm -rf /var/log/old_logs/*`
6. If critical: Might need to increase disk

---

## 📋 Runbooks

### Scenario: API Unresponsive

```
1. Verify connectivity
   curl http://localhost:3000/health

2. If timeout or refused, check service
   systemctl status shree-nath-api

3. If not running, start it
   systemctl start shree-nath-api

4. If still fails, check logs
   journalctl -u shree-nath-api -n 50

5. If startup error:
   - Check database: psql -U postgres -d shree_nath -c "SELECT 1"
   - Check port: netstat -tln | grep 3000
   - Check permissions: ls -l /opt/shree-nath

6. If can't fix, escalate
   Contact: [Manager] / [CTO]
```

### Scenario: High Error Rate

```
1. Check error logs
   tail -100 /var/log/shree-nath/error.log | grep ERROR

2. Categorize error:
   - Database error? → Check DB connection
   - Validation error? → Check request data
   - Logic error? → Review recent code
   - Timeout? → Check performance

3. For database errors:
   psql -U postgres -d shree_nath -c "SELECT 1"

4. For timeouts:
   - Check slow queries
   - Check resource usage
   - Consider scaling

5. If critical:
   Consider rollback: ./scripts/rollback.sh

6. Document:
   - What happened
   - How you fixed it
   - What to watch for
```

### Scenario: Performance Degradation

```
1. Identify bottleneck:
   [ ] Database (slow queries)
   [ ] Application (high CPU)
   [ ] Memory (low free memory)
   [ ] Disk I/O (slow reads/writes)

2. If database:
   SELECT query, mean_time FROM pg_stat_statements 
   ORDER BY mean_time DESC LIMIT 5;

3. If memory:
   free -h
   ps aux --sort=-%mem | head

4. If CPU:
   top -b -n 1 | head

5. If disk I/O:
   iostat -x 1 5

6. Apply fix from Performance Tuning guide

7. Monitor for improvement
```

---

## 🔐 Security Quick Checks

### Daily Security Audit

```bash
# 1. Check failed login attempts
grep "unauthorized\|failed" /var/log/auth.log | tail -20

# 2. Check open ports
netstat -tln | grep LISTEN

# 3. Check file permissions
ls -l /opt/shree-nath/backend/

# 4. Check user accounts
cut -d: -f1 /etc/passwd | grep shree

# 5. Check SSL certificates
openssl x509 -in /etc/ssl/certs/shree-nath.crt -noout -dates
```

### SSL Certificate Expiry Check

```bash
# Check expiry date
openssl x509 -in /etc/ssl/certs/shree-nath.crt -noout -dates

# Days until expiry
echo "Certificate expires in $(($(date -d "$(openssl x509 -in /etc/ssl/certs/shree-nath.crt -noout -dates | grep notAfter | cut -d= -f2)" +%s) - $(date +%s))) / 86400" | bc) days"

# If expiring soon, renew immediately
```

---

## 📞 Escalation Contacts

### Tier 1 (On-Call Engineer)
- Name: [Name]
- Phone: [Phone]
- Slack: [Handle]
- Availability: 24/7

### Tier 2 (Engineering Manager)
- Name: [Name]
- Phone: [Phone]
- Email: [Email]
- Available: Mon-Fri 9am-6pm

### Tier 3 (CTO)
- Name: [Name]
- Phone: [Phone]
- Email: [Email]
- For: Critical production issues

### External
- Database Provider: [Contact]
- Hosting Provider: [Contact]
- CDN Provider: [Contact]

---

## 📚 Documentation Shortcuts

| Need | File |
|------|------|
| How to deploy? | [PRODUCTION_DEPLOYMENT_GUIDE.md](./PRODUCTION_DEPLOYMENT_GUIDE.md) |
| API not responding? | [troubleshooting.md](./troubleshooting.md) - Issue 1 |
| Database down? | [troubleshooting.md](./troubleshooting.md) - Issue 4 |
| High error rate? | [troubleshooting.md](./troubleshooting.md) - Issue 2 |
| Slow performance? | [troubleshooting.md](./troubleshooting.md) - Issue 3 |
| Need to rollback? | [PRODUCTION_DEPLOYMENT_GUIDE.md](./PRODUCTION_DEPLOYMENT_GUIDE.md) - Rollback |
| Performance metrics? | [monitoring-setup.md](./monitoring-setup.md) |
| Tuning guidance? | [performance-tuning.md](./performance-tuning.md) |

---

## 🎯 Success Criteria

### Application Health ✅
- [ ] HTTP 200 response on /health
- [ ] All database connections active
- [ ] Error rate < 0.1%
- [ ] p95 response time < 500ms

### Data Integrity ✅
- [ ] No orphaned records
- [ ] Referential constraints active
- [ ] Transaction counts match
- [ ] Audit logs current

### System Performance ✅
- [ ] CPU < 70%
- [ ] Memory < 80%
- [ ] Disk < 90%
- [ ] Network < 100Mbps

### Backup & Recovery ✅
- [ ] Recent backup exists (< 1 day)
- [ ] Backup size reasonable
- [ ] Recovery tested recently
- [ ] Rollback available

---

## 📅 Maintenance Calendar

| Task | Frequency | Owner |
|------|-----------|-------|
| Daily health check | Daily | On-call |
| Weekly performance review | Weekly | DevOps |
| Monthly security audit | Monthly | Security |
| Backup verification | Weekly | DevOps |
| Index optimization | Monthly | DBA |
| SSL cert check | Monthly | DevOps |
| Disaster recovery drill | Quarterly | Team |
| Capacity planning | Quarterly | DevOps |

---

## 🔍 Log File Locations

```
Application:  /var/log/shree-nath/application.log
Errors:       /var/log/shree-nath/error.log
Debug:        /var/log/shree-nath/debug.log
Database:     /var/log/postgresql/postgresql.log
System:       /var/log/syslog
Auth:         /var/log/auth.log
Nginx:        /var/log/nginx/access.log
Nginx Errors: /var/log/nginx/error.log
```

---

## ⏱️ SLA Targets

| Metric | Target | Alert At |
|--------|--------|----------|
| Uptime | 99.9% | 99.5% |
| Response Time (p95) | 500ms | 800ms |
| Error Rate | < 0.1% | > 1% |
| Database Availability | 99.99% | 99% |
| Backup Success | 100% | 95% |

---

**Quick Reference Version**: 1.0  
**Last Updated**: June 19, 2024  
**For On-Call Engineers & Operations Team**

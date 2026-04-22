# Production Deployment Guide

## Pre-Deployment Checklist

### Code & Build
- [ ] All tests passing (`npm test`)
- [ ] Code coverage > 80% (`npm test -- --coverage`)
- [ ] No linting errors (`npm run lint`)
- [ ] Security audit clear (`npm audit`)
- [ ] Build successful (`npm run build`)

### Database
- [ ] All migrations tested in staging
- [ ] Database backup taken
- [ ] Migration rollback procedure tested
- [ ] Data validation passed
- [ ] Performance indexes verified

### Infrastructure
- [ ] Servers provisioned and tested
- [ ] SSL certificates installed and valid
- [ ] Load balancer configured
- [ ] DNS records updated
- [ ] CDN configured (if applicable)

### Configuration
- [ ] Environment variables defined
- [ ] API endpoints configured
- [ ] Database connection tested
- [ ] Cache system configured
- [ ] Logging aggregation set up

### Monitoring
- [ ] Monitoring dashboards created
- [ ] Alert rules configured
- [ ] Log aggregation working
- [ ] Error tracking set up
- [ ] Performance metrics configured

### Documentation
- [ ] Deployment procedures documented
- [ ] Rollback procedures documented
- [ ] Troubleshooting guide ready
- [ ] Escalation procedures defined
- [ ] Team trained

## Deployment Procedure

### Phase 1: Pre-Deployment (30 minutes)

**1. Environment Verification**
```bash
# Check all services running
systemctl status postgres
systemctl status redis
systemctl status nginx

# Verify connectivity
psql -U postgres -d shree_nath -c "SELECT COUNT(*) FROM information_schema.tables"
redis-cli ping
```

**2. Database Backup**
```bash
# Create full backup
pg_dump -U postgres -d shree_nath \
  > backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup
file backup_*.sql
gzip backup_*.sql

# Store backup
mv backup_*.sql.gz /secure/backups/
```

**3. Current Version Documentation**
```bash
# Record current deployment
git log -1 --format="%H %s" > CURRENT_DEPLOYMENT.txt
npm list > package_versions.txt
```

### Phase 2: Application Deployment (15 minutes)

**1. Stop Current Application**
```bash
# Graceful shutdown
systemctl stop shree-nath-api

# Verify stopped
ps aux | grep node
```

**2. Deploy New Version**
```bash
# Pull new code
cd /opt/shree-nath
git fetch origin
git checkout tags/v2.0.0  # or branch name

# Install dependencies
npm install --production

# Verify installation
npm list --production | head -20
```

**3. Database Migration**
```bash
# Run migrations (if any)
psql -U postgres -d shree_nath -f /opt/shree-nath/backend/src/db/migrations/latest.sql

# Verify migration
psql -U postgres -d shree_nath -c "SELECT version FROM schema_version ORDER BY applied DESC LIMIT 1"
```

**4. Start Application**
```bash
# Start service
systemctl start shree-nath-api

# Verify startup
systemctl status shree-nath-api

# Check logs
journalctl -u shree-nath-api -n 50
```

### Phase 3: Health Checks (10 minutes)

**1. Application Health**
```bash
# Check API health
curl -X GET http://localhost:3000/health

# Expected response:
# {"status":"ok","timestamp":"2024-06-19T10:00:00Z","version":"2.0.0"}
```

**2. Database Health**
```bash
# Check database connection
curl -X GET http://localhost:3000/api/health/db

# Expected: All queries returning results
```

**3. Critical Services**
```bash
# Test critical endpoints
curl -X GET http://localhost:3000/api/bills \
  -H "Authorization: Bearer $TEST_TOKEN"

curl -X GET http://localhost:3000/api/inventory/stock \
  -H "Authorization: Bearer $TEST_TOKEN"

curl -X GET http://localhost:3000/api/analytics/dashboards \
  -H "Authorization: Bearer $TEST_TOKEN"
```

**4. Smoke Tests**
```bash
# Run smoke test suite
npm run test:smoke

# Should complete in < 2 minutes with all passing
```

### Phase 4: Monitoring & Validation (10 minutes)

**1. Error Monitoring**
```bash
# Check error logs
tail -f /var/log/shree-nath/error.log

# Should see minimal errors
```

**2. Performance Metrics**
```bash
# Check response times
curl -X GET http://localhost:3000/metrics

# Should show acceptable latencies
```

**3. Transaction Testing**
```bash
# Create test transaction
./scripts/create_test_bill.sh

# Verify processing
./scripts/verify_test_bill.sh

# Check notifications sent
./scripts/verify_notifications.sh
```

**4. Load Testing (Optional)**
```bash
# If confident, run load test
npm run test:load -- --duration=60

# Should maintain performance under load
```

## Rollback Procedure

### Quick Rollback (5 minutes)

```bash
# 1. Stop current application
systemctl stop shree-nath-api

# 2. Revert to previous version
cd /opt/shree-nath
git checkout tags/v1.9.0

# 3. Reinstall dependencies
npm install --production

# 4. Start application
systemctl start shree-nath-api

# 5. Verify startup
systemctl status shree-nath-api
curl http://localhost:3000/health
```

### Full Rollback (with database)

```bash
# 1. Stop application
systemctl stop shree-nath-api

# 2. Restore database backup
psql -U postgres -d shree_nath < backup_previous.sql

# 3. Verify database
psql -U postgres -d shree_nath -c "SELECT COUNT(*) FROM bills"

# 4. Revert application
cd /opt/shree-nath
git checkout tags/v1.9.0
npm install --production

# 5. Start application
systemctl start shree-nath-api

# 6. Verify
curl http://localhost:3000/health
```

### Partial Rollback (database only)

```bash
# Rollback specific migration
psql -U postgres -d shree_nath -f migrations/rollback_latest.sql

# Restart application
systemctl restart shree-nath-api
```

## Post-Deployment Validation

### Hour 1

**Every 5 minutes:**
- Check error logs
- Verify response times
- Monitor database connections
- Check memory usage
- Verify transaction processing

### Hour 2-4

**Every 15 minutes:**
- Check business transactions
- Verify analytics processing
- Check notification delivery
- Monitor resource usage
- Look for performance degradation

### Day 1

**Every hour:**
- Review error logs
- Check performance metrics
- Verify data consistency
- Check backup status
- Monitor system stability

### Ongoing (Week 1)

**Daily:**
- Review application logs
- Check performance metrics
- Verify data integrity
- Monitor resource usage
- Test critical workflows

## Monitoring Setup

### Key Metrics to Monitor

```
Application:
- Request latency (p50, p95, p99)
- Error rate (5xx, 4xx)
- Request count
- Active connections
- Request queue depth

Database:
- Query time
- Connection pool usage
- Slow queries
- Cache hit ratio
- Table sizes

System:
- CPU usage
- Memory usage
- Disk I/O
- Network I/O
- Disk space
```

### Alert Configuration

```yaml
Alerts:
  - High error rate (> 1%) → Page on-call
  - Response time p99 > 2s → Alert to Slack
  - DB connections > 40 → Alert to Slack
  - Disk space < 10% → Page on-call
  - CPU > 80% for 5 min → Alert to Slack
  - Memory > 85% → Alert to Slack
```

### Dashboard Setup

Create dashboards in monitoring tool:
1. Overview dashboard (main metrics)
2. Application performance
3. Database performance
4. System resources
5. Business metrics
6. Error tracking

## Troubleshooting

### High Error Rate

```bash
# Check error logs
tail -100 /var/log/shree-nath/error.log

# Check specific error
grep -i "error_type" /var/log/shree-nath/error.log | tail -20

# If database issue
psql -U postgres -d shree_nath -c "SELECT COUNT(*) FROM bills"

# If rollback needed
./scripts/rollback.sh
```

### Slow Response Times

```bash
# Check slow queries
psql -U postgres -d shree_nath -c "SELECT query, calls, total_time FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10"

# Check connection pool
psql -U postgres -d shree_nath -c "SELECT count(*) FROM pg_stat_activity"

# If too many connections, restart
systemctl restart shree-nath-api
```

### High Memory Usage

```bash
# Check process
ps aux | grep node

# Check memory by module
node --expose-gc /opt/shree-nath/scripts/check_memory.js

# If needed, restart gracefully
systemctl restart shree-nath-api
```

### Database Issues

```bash
# Check database status
psql -U postgres -d shree_nath -c "SELECT * FROM pg_stat_activity"

# Check for locks
psql -U postgres -d shree_nath -c "SELECT * FROM pg_locks WHERE NOT granted"

# Check table sizes
psql -U postgres -d shree_nath -c "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) FROM pg_tables ORDER BY pg_total_relation_size DESC"
```

## Deployment Signals

### Success Indicators
- ✅ Health check returns 200 OK
- ✅ Error logs clean (minimal errors)
- ✅ Response times normal
- ✅ Transactions processing
- ✅ Notifications delivering
- ✅ Analytics updating

### Warning Indicators
- ⚠️ Occasional errors (< 0.1%)
- ⚠️ Response times slightly elevated
- ⚠️ Some slow queries
- ⚠️ High database connections

### Failure Indicators
- 🔴 Health check failing
- 🔴 High error rate (> 1%)
- 🔴 Response times > 2s
- 🔴 Database connection issues
- 🔴 Transactions failing

## Communication Plan

### Deployment Notification

Before deployment:
- Post to #deployments Slack channel
- Include: version, expected duration, rollback plan
- Set status to "Deploying"

During deployment:
- Provide updates every 5 minutes
- Report any issues immediately
- Keep team informed of progress

After deployment:
- Announce completion
- Report metrics
- Set status to "Deployed"
- Monitor for 1 hour

### Issue Communication

If issues occur:
- Immediately post to #incidents channel
- Include: issue description, severity, action taken
- Update status every 5 minutes
- Post resolution summary

## Deployment Checklist

**Before Starting:**
- [ ] All tests passing
- [ ] Backup created
- [ ] Team notified
- [ ] Rollback plan reviewed
- [ ] Monitoring ready

**During Deployment:**
- [ ] Old version stopped
- [ ] New version deployed
- [ ] Database migrated
- [ ] Application started
- [ ] Health checks passing

**After Deployment:**
- [ ] Smoke tests passing
- [ ] Error logs clean
- [ ] Performance normal
- [ ] Transactions working
- [ ] Monitoring active

**Sign-Off:**
- [ ] Technical lead approval
- [ ] Manager notification
- [ ] Team update
- [ ] Status updated

## Emergency Contacts

- **On-Call Engineer**: [Contact Info]
- **Manager**: [Contact Info]
- **Tech Lead**: [Contact Info]
- **Emergency Line**: [Phone Number]

## Related Documentation

- [System Integration Guide](./system-integration-guide.md)
- [Monitoring Setup](./monitoring-setup.md)
- [Performance Tuning](./performance-tuning.md)
- [Troubleshooting Guide](./troubleshooting.md)
- [Runbooks](./runbooks/)

---

**Document Version**: 1.0
**Last Updated**: June 19, 2024
**Next Review**: After deployment

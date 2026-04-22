# Monitoring & Alerting Setup

## Overview

Complete monitoring and alerting infrastructure for Shree-Nath production deployment. Covers application, database, and system-level monitoring.

## Architecture

```
Application Metrics
     ↓
Metrics Collector (StatsD/Prometheus)
     ↓
Time Series Database (InfluxDB/Prometheus)
     ↓
Visualization (Grafana)
     ↓
Alerting Engine (AlertManager)
     ↓
Notification Channels (Slack, Email, PagerDuty)
```

## Application Metrics

### Instrumentation

```javascript
// src/middleware/metrics.js
const metrics = {
  requestCount: 0,
  errorCount: 0,
  responseTime: [],
  activeConnections: 0
};

app.use((req, res, next) => {
  const start = Date.now();
  metrics.requestCount++;
  metrics.activeConnections++;

  res.on('finish', () => {
    const duration = Date.now() - start;
    metrics.responseTime.push(duration);
    metrics.activeConnections--;

    if (res.statusCode >= 400) {
      metrics.errorCount++;
    }

    // Send to metrics server
    sendMetrics({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: duration
    });
  });

  next();
});
```

### Key Application Metrics

| Metric | Type | Target | Alert |
|--------|------|--------|-------|
| Request Latency (p50) | Gauge | < 100ms | - |
| Request Latency (p95) | Gauge | < 500ms | > 800ms |
| Request Latency (p99) | Gauge | < 1000ms | > 2000ms |
| Error Rate | Counter | < 0.1% | > 1% |
| Request Count | Counter | - | - |
| Active Connections | Gauge | < 50 | > 40 |
| Request Queue | Gauge | < 10 | > 20 |

### Instrumentation Code

```javascript
// src/lib/monitoring.js
const prom = require('prom-client');

// Create metrics
const httpRequestDuration = new prom.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2]
});

const httpRequestTotal = new prom.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status']
});

const httpErrorsTotal = new prom.Counter({
  name: 'http_errors_total',
  help: 'Total number of HTTP errors',
  labelNames: ['method', 'route', 'status']
});

// Middleware
function metricsMiddleware(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;

    httpRequestDuration.labels(
      req.method,
      route,
      res.statusCode
    ).observe(duration);

    httpRequestTotal.labels(
      req.method,
      route,
      res.statusCode
    ).inc();

    if (res.statusCode >= 400) {
      httpErrorsTotal.labels(
        req.method,
        route,
        res.statusCode
      ).inc();
    }
  });

  next();
}

// Metrics endpoint
app.get('/metrics', (req, res) => {
  res.set('Content-Type', prom.register.contentType);
  res.end(prom.register.metrics());
});
```

## Database Monitoring

### Connection Pool Metrics

```javascript
// Monitor connection pool
setInterval(() => {
  const poolMetrics = {
    totalConnections: pool.totalCount,
    availableConnections: pool.availableObjectsCount,
    waitingRequests: pool.waitingClientsCount
  };

  console.log('Connection Pool:', poolMetrics);

  // Send to monitoring
  sendMetrics('pg_pool_total', poolMetrics.totalConnections);
  sendMetrics('pg_pool_available', poolMetrics.availableConnections);
  sendMetrics('pg_pool_waiting', poolMetrics.waitingRequests);
}, 10000);
```

### Query Performance

```javascript
// Track slow queries
const slowQueryThreshold = 1000; // 1 second

function trackQuery(query, duration) {
  if (duration > slowQueryThreshold) {
    console.warn(`SLOW QUERY (${duration}ms):`, query);
    sendMetrics('slow_queries_total', 1);
    sendMetrics('slow_query_duration', duration);
  }
}
```

### Database Queries to Monitor

```sql
-- Connection pool status
SELECT count(*) FROM pg_stat_activity;

-- Query performance
SELECT 
  query,
  calls,
  total_time,
  mean_time
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 10;

-- Long-running queries
SELECT 
  pid,
  query,
  query_start,
  extract(epoch FROM (now() - query_start)) as duration
FROM pg_stat_activity
WHERE query_start < now() - INTERVAL '5 minutes'
ORDER BY duration DESC;

-- Index bloat
SELECT 
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## System Monitoring

### CPU & Memory

```bash
# CPU usage
top -b -n 1 | head -15

# Memory usage
free -h

# Per-process memory
ps aux --sort=-%mem | head -10
```

### Disk I/O

```bash
# Disk usage
df -h

# I/O stats
iostat -x 1 5

# Disk space by directory
du -sh /opt/shree-nath/*
du -sh /var/log/shree-nath/*
du -sh /backups/*
```

### Network

```bash
# Network stats
netstat -s

# Active connections
netstat -an | grep ESTABLISHED | wc -l

# Port monitoring
netstat -tln | grep LISTEN
```

## Grafana Dashboards

### Dashboard 1: Overview

Key panels:
- Requests/second
- Error rate
- P95 latency
- Active connections
- Database connections
- CPU usage
- Memory usage
- Disk usage

### Dashboard 2: Application Performance

Key panels:
- Request latency distribution
- Error count by endpoint
- Error rate trend
- Top slow endpoints
- Request volume by endpoint
- Cache hit rate
- Queue depth

### Dashboard 3: Database Performance

Key panels:
- Query time distribution
- Slow queries count
- Connection pool usage
- Table sizes
- Index usage
- Lock waits
- Autovacuum activity

### Dashboard 4: System Resources

Key panels:
- CPU usage
- Memory usage
- Disk I/O
- Network I/O
- Disk space
- Process list
- System load

### Dashboard 5: Business Metrics

Key panels:
- Bills created/hour
- Orders processed/hour
- Inventory transactions
- Notifications sent
- API success rate
- Customer transactions
- Revenue dashboard

## Alert Rules

### Critical Alerts (Page On-Call)

```yaml
alerts:
  - name: api_down
    condition: up{job="shree-nath-api"} == 0
    duration: 1m
    severity: critical

  - name: high_error_rate
    condition: rate(http_errors_total[5m]) > 0.05
    duration: 5m
    severity: critical

  - name: db_connection_fail
    condition: pg_up == 0
    duration: 1m
    severity: critical

  - name: disk_full
    condition: node_filesystem_avail_bytes / node_filesystem_size_bytes < 0.1
    duration: 5m
    severity: critical
```

### Warning Alerts (Slack Notification)

```yaml
alerts:
  - name: slow_response_time
    condition: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 0.5
    duration: 10m
    severity: warning

  - name: high_memory_usage
    condition: memory_usage_percent > 0.8
    duration: 10m
    severity: warning

  - name: db_connections_high
    condition: pg_stat_activity_count > 40
    duration: 5m
    severity: warning

  - name: slow_queries
    condition: count(pg_stat_statements_mean_time > 1000) > 5
    duration: 5m
    severity: warning
```

### Info Alerts (Logging)

```yaml
alerts:
  - name: server_restarted
    condition: changes(up[5m]) > 0
    severity: info

  - name: deployment_completed
    condition: version_changed
    severity: info

  - name: backup_completed
    condition: backup_success == 1
    severity: info
```

## Alert Routing

### Routing Rules

```yaml
routes:
  - match:
      severity: critical
    receiver: pagerduty_oncall
    repeat_interval: 15m

  - match:
      severity: warning
    receiver: slack_warnings
    repeat_interval: 1h

  - match:
      severity: info
    receiver: slack_info
    repeat_interval: 12h
```

### Notification Templates

**Critical Alert (PagerDuty):**
```
🔴 CRITICAL: API Down
Service: Shree-Nath API
Status: Down
Time: 2024-06-19 10:05:00
Action: Investigate immediately
```

**Warning Alert (Slack):**
```
⚠️ Warning: High Response Time (p95)
Value: 850ms (target: 500ms)
Duration: 10 minutes
Action: Monitor and investigate if persists
```

**Info Alert (Log):**
```
ℹ️ Info: Deployment Completed
Version: 2.0.0
Time: 2024-06-19 09:00:00
Status: Success
```

## Health Check Endpoints

### Application Health

```
GET /health
Response: {"status":"ok","version":"2.0.0","timestamp":"2024-06-19T10:00:00Z"}
```

### Database Health

```
GET /api/health/db
Response: {"status":"connected","latency":15,"connections":25}
```

### Detailed Health

```
GET /api/health/detailed
Response: {
  "api": "ok",
  "database": "ok",
  "cache": "ok",
  "disk": "ok",
  "memory": "ok"
}
```

## Log Aggregation

### Log Levels

```
ERROR: errors.log
WARN: warnings.log
INFO: info.log
DEBUG: debug.log (dev only)
```

### Log Centralization

**ELK Stack / Splunk Configuration:**

```
Application Logs
     ↓
Filebeat
     ↓
Logstash
     ↓
Elasticsearch
     ↓
Kibana
```

### Important Logs to Monitor

```
- API errors (500, 4xx)
- Database errors
- Payment failures
- Authentication failures
- Data validation errors
- Performance warnings
```

## Monitoring Checklists

### Daily Checks
- [ ] Error rate < 0.5%
- [ ] P95 latency < 500ms
- [ ] Database connections healthy
- [ ] Disk space > 20%
- [ ] Memory usage < 80%
- [ ] No unresolved alerts

### Weekly Checks
- [ ] Review error logs
- [ ] Verify all alerts working
- [ ] Check backup status
- [ ] Analyze performance trends
- [ ] Review slow queries
- [ ] Optimize indexes if needed

### Monthly Checks
- [ ] Capacity planning
- [ ] Performance analysis
- [ ] Alert tuning
- [ ] Documentation updates
- [ ] Disaster recovery drill
- [ ] Security audit

## Troubleshooting Metrics

### High Error Rate
Check:
1. Application logs for errors
2. Database errors
3. Recent deployments
4. External service dependencies
Action: Review logs, check DB, or rollback if needed

### Slow Response Times
Check:
1. Slow query log
2. Database connection pool
3. Cache hit rate
4. CPU/Memory usage
Action: Optimize queries, increase pool, clear cache

### High Memory Usage
Check:
1. Memory leak patterns
2. Query result sizes
3. Cache sizes
Action: Restart service, adjust cache, fix leak

### Database Issues
Check:
1. Connection count
2. Long-running queries
3. Lock waits
4. Disk space
Action: Investigate query, kill long-running, check disk

## Related Documentation

- [Production Deployment Guide](./PRODUCTION_DEPLOYMENT_GUIDE.md)
- [Performance Tuning](./performance-tuning.md)
- [Troubleshooting Guide](./troubleshooting.md)

---

**Version**: 1.0
**Last Updated**: June 19, 2024

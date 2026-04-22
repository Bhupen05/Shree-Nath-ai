# Phase 7: Notification Engine - Integration Checklist

## 📋 Pre-Implementation

- [ ] All Phase 6 (Bill-Stock Integration) work is complete and tested
- [ ] Database backup created
- [ ] Team has reviewed Phase 7 implementation guide
- [ ] API keys obtained from SendGrid, Twilio
- [ ] Test environment ready for notification testing
- [ ] All team members have access to documentation

## 🗄️ Database Migration

### Execute Migration
- [ ] Run database migration:
  ```bash
  npm run db:migrate
  ```
- [ ] Verify all tables created:
  ```sql
  SELECT * FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name IN (
    'notification_providers',
    'notification_channels', 
    'notification_failures',
    'notification_statistics'
  );
  ```
- [ ] Verify enhanced columns on existing tables:
  ```sql
  SELECT column_name FROM information_schema.columns 
  WHERE table_name = 'notification_jobs' 
  AND column_name IN ('provider_id', 'template_id', 'retry_count');
  ```
- [ ] Verify views created:
  ```sql
  SELECT * FROM v_notification_provider_status;
  SELECT * FROM v_notification_queue_status;
  SELECT * FROM v_notification_delivery_metrics;
  ```
- [ ] Verify functions created:
  ```sql
  SELECT routine_name FROM information_schema.routines 
  WHERE routine_schema = 'public' 
  AND routine_name LIKE 'get_notification%' OR routine_name LIKE '%notification%';
  ```

## 🔧 Backend Integration

### Install Dependencies
- [ ] Install Twilio SDK:
  ```bash
  npm install twilio
  ```
- [ ] Install SendGrid SDK (if not already):
  ```bash
  npm install @sendgrid/mail
  ```
- [ ] Verify packages added to package.json

### Update index.js (Main Backend File)

#### 1. Import Notification Service (~line 1)
- [ ] Add at top of file:
  ```javascript
  const NotificationService = require('./modules/notifications/services/notification.service');
  ```

#### 2. Initialize Notification Service (~line 100, after DB init)
- [ ] Add after database connection:
  ```javascript
  // Initialize notification service
  let notificationService = null;
  
  try {
    notificationService = await NotificationService.initialize(pool);
    console.log('✅ Notification service initialized');
  } catch (error) {
    console.error('❌ Notification service init failed:', error.message);
    notificationService = null;
  }
  ```

#### 3. Mount Routes (~line 1900, with other route mounts)
- [ ] Add after existing route mounts:
  ```javascript
  // Notification routes
  const createNotificationRoutes = require('./modules/notifications/routes/notification.routes');
  app.use('/api/notifications', requireAuth, createNotificationRoutes(pool, notificationService));
  ```

#### 4. Add Retry Worker (~line 500, with other workers)
- [ ] Add notification retry worker:
  ```javascript
  // Notification retry worker configuration
  let notificationRetryWorkerTimer = null;
  
  async function runNotificationRetryWorkerTick() {
    if (!notificationService || !pool) return;
    
    const client = await pool.connect();
    try {
      const retryableResult = await client.query(`
        SELECT id, retry_count FROM notification_jobs
        WHERE status = 'FAILED'
          AND retry_count < 3
          AND next_retry_at <= NOW()
        ORDER BY next_retry_at ASC
        LIMIT 10
        FOR UPDATE SKIP LOCKED
      `);
      
      for (const job of retryableResult.rows) {
        try {
          await notificationService.retryNotification(job.id);
        } catch (error) {
          console.error(`Failed to retry job ${job.id}:`, error.message);
        }
      }
    } catch (error) {
      console.error('Notification retry worker error:', error);
    } finally {
      client.release();
    }
  }
  
  function startNotificationRetryWorker() {
    notificationRetryWorkerTimer = setInterval(
      runNotificationRetryWorkerTick,
      300000 // Every 5 minutes
    );
  }
  
  function stopNotificationRetryWorker() {
    if (notificationRetryWorkerTimer) {
      clearInterval(notificationRetryWorkerTimer);
      notificationRetryWorkerTimer = null;
    }
  }
  
  // Start on boot
  startNotificationRetryWorker();
  
  // Stop on shutdown
  process.on('SIGTERM', () => {
    stopNotificationRetryWorker();
  });
  ```

### Configuration Files

#### .env File
- [ ] Add SendGrid API key:
  ```
  SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  ```
- [ ] Add Twilio credentials:
  ```
  TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxx
  TWILIO_AUTH_TOKEN=your_auth_token
  TWILIO_FROM_NUMBER=+1234567890
  TWILIO_WHATSAPP_NUMBER=1234567890
  ```
- [ ] Restart backend service

## ✅ API Testing

### Provider Configuration
- [ ] Test SendGrid provider creation:
  ```bash
  curl -X POST http://localhost:5000/api/notifications/providers \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "providerType": "SENDGRID",
      "displayName": "SendGrid Email",
      "config": {"apiKey": "'$SENDGRID_API_KEY'"},
      "isActive": true
    }'
  ```
- [ ] Verify response: 201 Created with provider ID
- [ ] Test Twilio provider creation (same process)
- [ ] List providers:
  ```bash
  curl -X GET http://localhost:5000/api/notifications/providers \
    -H "Authorization: Bearer YOUR_TOKEN"
  ```
- [ ] Verify all 2-3 providers returned

### Basic Send Test
- [ ] Send test email:
  ```bash
  curl -X POST http://localhost:5000/api/notifications/send \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "channel": "EMAIL",
      "recipientEmail": "test@example.com",
      "recipientName": "Test User",
      "subject": "Test Email",
      "message": "This is a test email from SIBMS"
    }'
  ```
- [ ] Verify: 201 Created with jobId
- [ ] Check email inbox for test message
- [ ] Get status:
  ```bash
  curl -X GET http://localhost:5000/api/notifications/status/1 \
    -H "Authorization: Bearer YOUR_TOKEN"
  ```
- [ ] Verify: status should be "SENT"

### Metrics and Monitoring
- [ ] Check metrics:
  ```bash
  curl -X GET http://localhost:5000/api/notifications/metrics \
    -H "Authorization: Bearer YOUR_TOKEN"
  ```
- [ ] Verify: metrics show 1 sent email (100% success rate)
- [ ] Check provider status:
  ```bash
  curl -X GET http://localhost:5000/api/notifications/provider-status \
    -H "Authorization: Bearer YOUR_TOKEN"
  ```
- [ ] Verify: SENDGRID provider shows 1 sent job

## 🧪 Integration Testing

### Unit Tests
- [ ] Run notification tests:
  ```bash
  npm test -- backend/test/integration/notification-engine.test.js
  ```
- [ ] Verify: All 15+ test scenarios passing
- [ ] Check test output for:
  - ✅ Email service tests
  - ✅ SMS service tests
  - ✅ WhatsApp service tests
  - ✅ Service integration tests
  - ✅ Rate limiting tests
  - ✅ Metrics tests

### Manual Workflow Testing

#### Scenario 1: Email Reminder
- [ ] Create a new bill (manually via API or UI)
- [ ] Mark bill as CONFIRMED
- [ ] Verify: Email reminder sent to customer
- [ ] Check: Delivery log created and job marked SENT
- [ ] Query success:
  ```sql
  SELECT status, sent_at FROM notification_jobs ORDER BY id DESC LIMIT 1;
  ```

#### Scenario 2: SMS with Retry
- [ ] Send SMS to invalid number (testing)
- [ ] Verify: Job marked FAILED
- [ ] Manually retry:
  ```bash
  curl -X POST http://localhost:5000/api/notifications/retry/2 \
    -H "Authorization: Bearer YOUR_TOKEN"
  ```
- [ ] Verify: Job retried and status updated

#### Scenario 3: Multi-Channel
- [ ] Send notification via EMAIL
- [ ] Send same content via SMS
- [ ] Send via WhatsApp
- [ ] Verify: 3 jobs created with status SENT
- [ ] Check metrics shows 3 successful deliveries

#### Scenario 4: Batch Notifications
- [ ] Create 10 test notifications
- [ ] Query queue:
  ```bash
  curl -X GET http://localhost:5000/api/notifications/queue-status \
    -H "Authorization: Bearer YOUR_TOKEN"
  ```
- [ ] Verify: pending_count = 10 (or less if already processed)

## 📊 Dashboard Verification

### Notification Dashboard UI
- [ ] Access notifications dashboard (if implemented)
- [ ] Verify: Shows list of recent notifications
- [ ] Verify: Status indicators (SENT, FAILED, PENDING)
- [ ] Verify: Retry button works on failed items
- [ ] Verify: Metrics display correct success rates

### Database Queries
- [ ] Query recent deliveries:
  ```sql
  SELECT id, status, provider_status, sent_at, delivery_time_ms
  FROM notification_jobs
  ORDER BY created_at DESC
  LIMIT 10;
  ```
- [ ] Query daily metrics:
  ```sql
  SELECT * FROM v_notification_delivery_metrics;
  ```
- [ ] Query failed jobs:
  ```sql
  SELECT * FROM notification_jobs WHERE status = 'FAILED';
  ```
- [ ] Query provider performance:
  ```sql
  SELECT * FROM v_notification_provider_status;
  ```

## 🔐 Security Testing

### Permission Testing
- [ ] Test without authentication:
  ```bash
  curl -X GET http://localhost:5000/api/notifications/jobs
  ```
  - Expected: 401 Unauthorized

- [ ] Test with insufficient permissions (if RBAC available)
- [ ] Verify: Only authorized users can send notifications

### Rate Limit Testing
- [ ] Send 150 notifications in quick succession
- [ ] Verify: Rate limit responses (429) after limit exceeded
- [ ] Verify: Queue status shows backlog

### Credential Security
- [ ] Verify: API keys not logged in plain text
- [ ] Check logs don't contain credentials:
  ```bash
  grep -r "SG\\..*" logs/
  ```
  - Expected: No API keys in logs

## 🚀 Performance & Load Testing

### Load Test (10 emails/second for 60 seconds)
- [ ] Run load test script:
  ```javascript
  // Load test: 600 total notifications
  for (let i = 0; i < 600; i++) {
    fetch('/api/notifications/send', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer TOKEN' },
      body: JSON.stringify({
        channel: 'EMAIL',
        recipientEmail: `test${i}@example.com`,
        message: 'Load test email'
      })
    }).catch(console.error);
    
    if (i % 10 === 0) await new Promise(r => setTimeout(r, 1000));
  }
  ```
- [ ] Monitor database performance:
  ```sql
  SELECT COUNT(*) FROM notification_jobs WHERE created_at > NOW() - INTERVAL '1 minute';
  ```
- [ ] Expected: System handles 1000s of jobs without degradation

### Latency Benchmarks
- [ ] Average send response time < 500ms
- [ ] Average delivery time (provider) < 2s for EMAIL
- [ ] Average delivery time < 1s for SMS
- [ ] Query all notifications: < 1s for 10,000 records

## 📋 Documentation

- [ ] Implementation guide completed: `docs/phase-7/PHASE_7_IMPLEMENTATION_GUIDE.md`
- [ ] API reference completed: `docs/phase-7/PHASE_7_API_REFERENCE.md`
- [ ] Quick reference completed: `docs/phase-7/PHASE_7_QUICK_REFERENCE.md`
- [ ] README updated with Phase 7 info
- [ ] All code documented with JSDoc comments
- [ ] Team trained on new notification APIs

## ✨ Deployment

### Pre-Production
- [ ] All tests passing (100% coverage for critical paths)
- [ ] Code reviewed by tech lead
- [ ] Database migration validated on staging
- [ ] Load testing completed
- [ ] Security audit complete
- [ ] Documentation final review

### Production Deployment
- [ ] Database backup before migration
- [ ] Execute migration on production
- [ ] Verify migration completed:
  ```bash
  psql -h prod-db -U user -d sibms -c "SELECT * FROM notification_providers;"
  ```
- [ ] Deploy backend code
- [ ] Start notification retry worker
- [ ] Monitor logs for errors:
  ```bash
  tail -f /var/log/backend.log | grep -i notification
  ```
- [ ] Test end-to-end in production:
  ```bash
  curl -X POST https://api.sibms.com/api/notifications/send \
    -H "Authorization: Bearer PROD_TOKEN" \
    -d '{"channel":"EMAIL","recipientEmail":"admin@example.com"}'
  ```

### Post-Deployment
- [ ] Verify all 10 API endpoints responding (200 OK)
- [ ] Monitor first 24 hours for issues
- [ ] Check success rates are 95%+
- [ ] Verify retry worker processing failed jobs
- [ ] Collect metrics for dashboard
- [ ] Alert team on any failures

## 🎯 Success Criteria

- ✅ All 10 API endpoints functional
- ✅ Email, SMS, WhatsApp channels working
- ✅ Retry logic handling failures correctly
- ✅ Rate limiting prevents provider overload
- ✅ Metrics showing 95%+ success rate
- ✅ No credentials in logs or error messages
- ✅ System handles 1000+ notifications/minute
- ✅ Database queries < 1s for 10,000 records
- ✅ All documentation complete
- ✅ Team trained and ready

## 🚨 Rollback Plan

### If Critical Issues Occur:

1. **Immediate**: Stop notification retry worker
   ```bash
   # Comment out startNotificationRetryWorker() in index.js
   # Restart backend
   ```

2. **Revert**: Remove notification routes from index.js
   ```javascript
   // Comment out: app.use('/api/notifications', ...)
   // Restart backend
   ```

3. **Database**: Keep migration (non-destructive)
   - No data loss, just leaves tables unused

4. **Communication**: Notify team of rollback

### Recovery Steps:
1. Identify root cause in logs
2. Fix issue in code
3. Re-test on staging
4. Redeploy with fix

## 📞 Support Contact

- **Tech Lead**: [Name] - Architecture/design questions
- **Backend Owner**: [Name] - Implementation/API issues
- **Database Admin**: [Name] - Migration/schema questions
- **QA Lead**: [Name] - Testing/validation

---

**Sign-Off**: 
- [ ] Product Manager: _____ Date: _____
- [ ] Tech Lead: _____ Date: _____
- [ ] QA Lead: _____ Date: _____
- [ ] Deployment Authority: _____ Date: _____

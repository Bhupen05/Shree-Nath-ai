# Phase 7: Notification Engine Backend - Implementation Guide

## 📋 Overview

Phase 7 delivers a production-ready notification engine with:
- **Real provider integrations**: SendGrid (Email), Twilio (SMS/WhatsApp)
- **Multi-channel delivery**: Email, SMS, WhatsApp, Internal
- **Intelligent retry logic**: Exponential backoff with provider-specific handling
- **Rate limiting**: Per-provider configuration with automatic throttling
- **Comprehensive tracking**: Job status, delivery logs, failure analysis
- **Performance metrics**: Success rates, delivery times, provider statistics

**Key Features**:
- ✅ 10 REST API endpoints for notification management
- ✅ 6 database tables with comprehensive tracking
- ✅ 4 service classes for provider abstraction
- ✅ 3 database views for monitoring
- ✅ 15+ test scenarios covering all workflows
- ✅ Production-ready error handling and retry logic

## 🏗️ Architecture

### Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      API Layer (Routes)                     │
│  POST /send, GET /status, POST /retry, GET /metrics, etc   │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                   Controller Layer                          │
│        NotificationController (8 HTTP handlers)            │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                  Service Layer (Orchestration)              │
│              NotificationService (Core Logic)               │
│  - Provider selection, Rate limiting, Retry management      │
│  - Delivery tracking, Metrics calculation                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┬──────────────┐
        │              │              │              │
┌───────▼───────┐ ┌───▼─────────┐ ┌─▼──────────┐ ┌─▼─────────┐
│  EmailService │ │ SMSService  │ │WhatsAppSvc │ │  Internal │
│   (SendGrid)  │ │  (Twilio)   │ │ (Twilio)   │ │  Channel  │
└───────┬───────┘ └───┬─────────┘ └─┬──────────┘ └─┬─────────┘
        │              │              │              │
        └──────────────┼──────────────┴──────────────┘
                       │
        ┌──────────────▼──────────────┐
        │   External APIs             │
        │ SendGrid, Twilio Services   │
        └─────────────────────────────┘
```

### Database Schema (New Tables)

#### notification_providers
Stores provider configuration and credentials:
```sql
CREATE TABLE notification_providers (
  id SERIAL PRIMARY KEY,
  provider_type VARCHAR(50) -- SENDGRID, TWILIO, WHATSAPP, INTERNAL
  display_name VARCHAR(100),
  is_active BOOLEAN,
  config JSONB, -- API keys, credentials
  rate_limit_per_minute INTEGER,
  retry_max_attempts INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

#### notification_channels
Maps notification channels to providers:
```sql
CREATE TABLE notification_channels (
  id SERIAL PRIMARY KEY,
  channel_type VARCHAR(20), -- EMAIL, SMS, WHATSAPP, INTERNAL
  provider_id INTEGER REFERENCES notification_providers(id),
  is_enabled BOOLEAN,
  created_at TIMESTAMPTZ
);
```

#### notification_jobs (Enhanced)
Enhanced job tracking with provider details:
```
NEW COLUMNS:
- provider_id: Link to provider
- template_id: Link to template
- retry_count: Number of retry attempts
- last_retry_at: Last retry timestamp
- next_retry_at: Next scheduled retry
- error_code: Provider-specific error code
- provider_status: Provider's status response
- provider_reference_id: Provider's message ID
```

#### notification_delivery_logs (Enhanced)
Detailed delivery tracking:
```
NEW COLUMNS:
- template_id: Link to template
- provider_id: Link to provider
- delivery_time_ms: Delivery latency
- provider_error_code: Error from provider
- provider_request: JSONB request payload
- retry_attempt: Attempt number
```

#### notification_failures
New table for failure analysis:
```sql
CREATE TABLE notification_failures (
  id SERIAL PRIMARY KEY,
  job_id INTEGER REFERENCES notification_jobs(id),
  attempt_number INTEGER,
  provider_id INTEGER,
  error_type VARCHAR(50), -- PROVIDER_ERROR, RATE_LIMIT, INVALID_RECIPIENT, etc
  error_message TEXT,
  error_code VARCHAR(50),
  error_details JSONB,
  should_retry BOOLEAN,
  created_at TIMESTAMPTZ
);
```

#### notification_statistics
Aggregated metrics:
```sql
CREATE TABLE notification_statistics (
  id SERIAL PRIMARY KEY,
  provider_id INTEGER,
  channel_type VARCHAR(20),
  date DATE,
  total_jobs INTEGER,
  successful_jobs INTEGER,
  failed_jobs INTEGER,
  total_attempts INTEGER,
  avg_delivery_time_ms NUMERIC,
  created_at TIMESTAMPTZ
);
```

### Monitoring Views

1. **v_notification_provider_status**: Current provider health
2. **v_notification_queue_status**: Queue depth and next scheduled
3. **v_notification_delivery_metrics**: Channel performance metrics

## 🔌 API Endpoints

### 1. Send Notification
**POST** `/api/notifications/send`

```javascript
// Request
{
  channel: "EMAIL|SMS|WHATSAPP|INTERNAL",
  recipientEmail: "user@example.com",
  recipientPhone: "+1234567890",
  recipientName: "John Doe",
  subject: "Payment Reminder",
  message: "Your bill is due tomorrow",
  htmlContent: "<p>Your bill is due tomorrow</p>",
  context: { billId: 123, amount: 500 }
}

// Response (201 Created)
{
  success: true,
  jobId: 1,
  status: "SENT",
  messageId: "SG.xxxxx",
  delivery: {
    provider: "SENDGRID",
    timestamp: "2026-04-19T10:30:00Z"
  }
}
```

### 2. Get Delivery Status
**GET** `/api/notifications/status/:jobId`

```javascript
// Response
{
  success: true,
  job: {
    id: 1,
    status: "SENT",
    provider_status: "SENT",
    retry_count: 0,
    sent_at: "2026-04-19T10:31:00Z",
    successful_attempts: 1
  }
}
```

### 3. Retry Failed Notification
**POST** `/api/notifications/retry/:jobId`

```javascript
// Response
{
  success: true,
  message: "Notification retry initiated",
  result: {
    status: "SENT",
    messageId: "SG.yyyy"
  }
}
```

### 4. Get Delivery Metrics
**GET** `/api/notifications/metrics?days=7&channel=EMAIL`

```javascript
// Response
{
  success: true,
  metrics: [
    {
      channel_type: "EMAIL",
      total: 150,
      sent: 148,
      failed: 2,
      success_rate: 98.67,
      avg_delivery_ms: 1250
    }
  ]
}
```

### 5. List Jobs
**GET** `/api/notifications/jobs?status=PENDING&limit=50&offset=0`

```javascript
// Response
{
  success: true,
  jobs: [
    {
      id: 1,
      job_type: "BILL_DUE_REMINDER",
      status: "SENT",
      recipient_email: "user@example.com",
      sent_at: "2026-04-19T10:31:00Z"
    }
  ],
  pagination: {
    limit: 50,
    offset: 0,
    total: 523
  }
}
```

### 6-10. Additional Endpoints
- `GET /api/notifications/providers` - List providers
- `POST /api/notifications/providers` - Configure provider
- `GET /api/notifications/delivery-logs/:jobId` - Delivery logs
- `GET /api/notifications/provider-status` - Provider health
- `GET /api/notifications/queue-status` - Queue depth

## 🔧 Implementation Integration Points

### 1. Provider Configuration (Backend Startup)

Add to `backend/src/index.js` after database initialization:

```javascript
// Around line 100 (after db init)
const NotificationService = require('./modules/notifications/services/notification.service');
let notificationService;

// Initialize notification service
try {
  notificationService = await NotificationService.initialize(pool);
  console.log('✅ Notification service initialized');
} catch (error) {
  console.error('❌ Failed to initialize notification service:', error);
  notificationService = null;
}

// Mount notification routes (~line 1900, after existing routes)
const createNotificationRoutes = require('./modules/notifications/routes/notification.routes');
app.use('/api/notifications', requireAuth, createNotificationRoutes(pool, notificationService));
```

### 2. Send Notification from Bill Confirmation

Add to bill confirmation endpoint (~line 2045):

```javascript
// After bill confirmation logic
if (bill.bill_type === 'SALE' && notificationService) {
  try {
    // Get customer contact info
    const partyResult = await pool.query(
      'SELECT email, phone, party_name FROM parties WHERE id = $1',
      [bill.party_id]
    );
    
    if (partyResult.rows.length > 0) {
      const party = partyResult.rows[0];
      const dueAmount = bill.grand_total - (bill.paid_amount || 0);
      
      // Queue reminder notification
      await notificationService.sendNotification({
        channel: 'EMAIL',
        recipient: {
          email: party.email,
          phone: party.phone,
          name: party.party_name
        },
        subject: `Bill #${bill.bill_number} - Amount Due: ₹${dueAmount}`,
        message: `Your bill #${bill.bill_number} for ₹${bill.grand_total} is due on ${bill.due_date}`,
        context: { billId: bill.id, amount: dueAmount },
        jobId: null, // Creates new job
        userId: req.user.id
      });
    }
  } catch (error) {
    console.error('Notification error (non-blocking):', error.message);
  }
}
```

### 3. Automatic Retry Worker

Add to `backend/src/index.js` (~line 500, in worker section):

```javascript
// Notification retry worker (runs every 5 minutes)
let notificationRetryWorkerTimer = null;

async function runNotificationRetryWorkerTick() {
  if (!notificationService || !pool) return;
  
  const client = await pool.connect();
  try {
    // Get jobs ready for retry
    const retryableResult = await client.query(`
      SELECT id, retry_count
      FROM notification_jobs
      WHERE status = 'FAILED'
        AND retry_count < 3
        AND next_retry_at <= NOW()
      ORDER BY next_retry_at ASC
      LIMIT 10
      FOR UPDATE SKIP LOCKED
    `);
    
    for (const job of retryableResult.rows) {
      await notificationService.retryNotification(job.id);
    }
  } catch (error) {
    console.error('Notification retry worker error:', error);
  } finally {
    client.release();
  }
}

function startNotificationRetryWorker() {
  notificationRetryWorkerTimer = setInterval(() => {
    runNotificationRetryWorkerTick();
  }, 300000); // Every 5 minutes
}

function stopNotificationRetryWorker() {
  if (notificationRetryWorkerTimer) {
    clearInterval(notificationRetryWorkerTimer);
    notificationRetryWorkerTimer = null;
  }
}

// Start workers on app boot
startNotificationRetryWorker();

// Stop workers on graceful shutdown
process.on('SIGTERM', () => {
  stopNotificationRetryWorker();
});
```

## 📊 Workflow Scenarios

### Scenario 1: Email Reminder on Bill Confirmation

```
1. Bill created & marked CONFIRMED
2. System extracts customer email
3. POST /api/notifications/send
   channel: "EMAIL"
   recipient: customer email
   subject: "Bill #123 due tomorrow"
4. NotificationService.sendNotification()
   - Selects SENDGRID provider
   - Validates rate limit
   - Calls EmailService.sendEmail()
   - Records delivery_log as SENT
   - Updates job status
5. Callback: GET /api/notifications/status/123
   - Returns: SENT at 2026-04-19T10:31Z
```

### Scenario 2: SMS with Retry on Failure

```
1. SMS fails: invalid recipient phone
   - RecordFailure: error_type="INVALID_RECIPIENT", should_retry=false
2. Manual retry via admin dashboard
   POST /api/notifications/retry/124
3. System updates phone to valid format
4. Retries SMS
   - Success: Updates delivery_log, job.status=SENT
5. Metrics updated: failures[SMS]++, success_rate recalculated
```

### Scenario 3: Multi-Channel Bill Reminder

```
1. Bill becomes OVERDUE (7+ days)
2. Reminder generation logic creates 3 jobs:
   - Job A: EMAIL to customer
   - Job B: SMS to customer
   - Job C: WhatsApp to supplier contact
3. Worker dispatches all 3 in parallel
4. Results tracked in notification_delivery_logs:
   - EMAIL: SENT (1200ms)
   - SMS: FAILED (retry scheduled)
   - WHATSAPP: SENT (900ms)
5. Dashboard shows:
   - Success rate: 66.67%
   - Avg delivery: 1050ms
```

### Scenario 4: Rate Limiting

```
1. 100 emails queued
2. SENDGRID rate limit = 100/minute
3. Dispatch loop:
   - Email 1-100: ✅ SENT
   - Email 101: ❌ RATE_LIMIT
     - Scheduled for next minute
     - Error recorded
4. Worker retries after 1 minute
   - Email 101: ✅ SENT
```

## 🧪 Testing Workflow

### Manual Testing with Curl

```bash
# 1. Configure SendGrid provider
curl -X POST http://localhost:5000/api/notifications/providers \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "providerType": "SENDGRID",
    "displayName": "SendGrid Email",
    "config": {"apiKey": "SG.xxxxxxxxxxxxx"},
    "isActive": true
  }'

# 2. Send test email
curl -X POST http://localhost:5000/api/notifications/send \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "EMAIL",
    "recipientEmail": "test@example.com",
    "recipientName": "Test User",
    "subject": "Test Notification",
    "message": "This is a test notification"
  }'

# 3. Check status
curl -X GET http://localhost:5000/api/notifications/status/1 \
  -H "Authorization: Bearer TOKEN"

# 4. Get metrics
curl -X GET http://localhost:5000/api/notifications/metrics?days=7 \
  -H "Authorization: Bearer TOKEN"

# 5. List jobs
curl -X GET "http://localhost:5000/api/notifications/jobs?status=SENT&limit=20" \
  -H "Authorization: Bearer TOKEN"
```

### Integration Tests

```bash
# Run all notification tests
npm test -- backend/test/integration/notification-engine.test.js

# Run specific test suite
npm test -- backend/test/integration/notification-engine.test.js --grep "Email Service"
```

## ⚠️ Error Handling

### Provider-Specific Errors

| Error | Code | Retryable | Action |
|-------|------|-----------|--------|
| Invalid Email | 400 | ❌ No | Log failure, move to DLQ |
| Rate Limit | 429 | ✅ Yes | Retry with backoff |
| Provider Down | 503 | ✅ Yes | Retry with exponential backoff |
| Invalid Phone | 21211 | ❌ No | Log failure, request correction |
| Auth Failed | 401 | ❌ No | Alert ops, check credentials |
| Timeout | - | ✅ Yes | Retry after delay |

### Retry Strategy

- **Max attempts**: 3 (configurable per provider)
- **Backoff formula**: 2^attempt × 30 seconds
  - Attempt 1: 60s
  - Attempt 2: 120s
  - Attempt 3: 240s

## 📈 Performance Considerations

### Optimization Tips

1. **Batch operations**: Send 50-100 notifications per worker tick
2. **Async dispatch**: Don't block HTTP request on sending
3. **Connection pooling**: Use pool size = 2 × num_providers
4. **Index strategy**: `(provider_id, status, scheduled_for)`
5. **Rate limiting**: Start at 100/min per provider, tune based on metrics

### Load Capacity

- **Single provider**: ~1000 notifications/minute
- **Three providers**: ~3000 notifications/minute
- **Expected scale**: 5,000-50,000/day for typical system

## 🔐 Security Considerations

1. **Credentials management**:
   - Store API keys in config JSONB (encrypted at rest)
   - Rotate keys quarterly
   - Use IAM roles in production

2. **Rate limiting**:
   - Global: 1000 notifications/minute
   - Per-user: 100/minute
   - Per-recipient: Block after 5 in 1 hour

3. **PII handling**:
   - Don't log full phone numbers/emails
   - Mask in delivery logs: +1*****7890
   - Clean up logs after 90 days

4. **Permission model**:
   - `billing:read` for viewing notifications
   - `billing:write` for sending/configuration
   - `admin` only for provider setup

## 📊 Monitoring Queries

```sql
-- Queue depth
SELECT COUNT(*) FROM notification_jobs WHERE status = 'PENDING';

-- Success rate today
SELECT 
  channel,
  COUNT(*) total,
  COUNT(*) FILTER (WHERE status = 'SENT') sent,
  ROUND(100 * COUNT(*) FILTER (WHERE status = 'SENT') / COUNT(*), 2) rate
FROM notification_delivery_logs
WHERE created_at > NOW() - INTERVAL '1 day'
GROUP BY channel;

-- Failed jobs needing retry
SELECT * FROM notification_jobs
WHERE status = 'FAILED'
  AND retry_count < 3
  AND next_retry_at <= NOW()
LIMIT 10;

-- Provider performance
SELECT * FROM v_notification_provider_status;

-- Slow deliveries (>5s)
SELECT * FROM notification_delivery_logs
WHERE delivery_time_ms > 5000
ORDER BY delivery_time_ms DESC;
```

## 📋 Deployment Checklist

- [ ] Database migration executed: `npm run db:migrate`
- [ ] Environment variables configured (API keys)
- [ ] Provider credentials validated
- [ ] Routes mounted in index.js
- [ ] Retry worker started
- [ ] Integration tests passing
- [ ] Monitoring dashboards setup
- [ ] Alert thresholds configured
- [ ] Documentation deployed
- [ ] Team trained on new APIs


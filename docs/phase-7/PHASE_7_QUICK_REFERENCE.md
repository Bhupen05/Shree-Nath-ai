# Phase 7: Notification Engine - Quick Reference

## 🚀 Fast Start (5 Minutes)

### 1. Configure Providers
```javascript
// POST /api/notifications/providers
{
  "providerType": "SENDGRID",
  "config": { "apiKey": "SG.xxxxx" },
  "isActive": true
}
```

### 2. Send Notification
```javascript
// POST /api/notifications/send
{
  "channel": "EMAIL",
  "recipientEmail": "user@example.com",
  "subject": "Hello",
  "message": "Test notification"
}
```

### 3. Check Status
```javascript
// GET /api/notifications/status/1
// Returns: { status: "SENT", sent_at: "..." }
```

---

## 📊 File Structure

```
backend/
  src/
    modules/notifications/
      services/
        email.service.js          (SendGrid integration)
        sms.service.js            (Twilio SMS)
        whatsapp.service.js       (Twilio WhatsApp)
        notification.service.js   (Core orchestration)
      controllers/
        notification.controller.js (10 HTTP handlers)
      routes/
        notification.routes.js    (10 REST endpoints)
    db/
      migrations/
        202604190003__notification_engine.sql (Tables, views, functions)
  test/
    integration/
      notification-engine.test.js (15+ test scenarios)
docs/
  phase-7/
    PHASE_7_IMPLEMENTATION_GUIDE.md
    PHASE_7_API_REFERENCE.md
    PHASE_7_INTEGRATION_CHECKLIST.md
    PHASE_7_QUICK_REFERENCE.md (this file)
```

---

## 🔌 10 API Endpoints

| # | Endpoint | Method | Purpose |
|---|----------|--------|---------|
| 1 | `/send` | POST | Send notification |
| 2 | `/status/:jobId` | GET | Get delivery status |
| 3 | `/retry/:jobId` | POST | Retry failed |
| 4 | `/metrics` | GET | Performance metrics |
| 5 | `/jobs` | GET | List jobs |
| 6 | `/providers` | GET | List providers |
| 7 | `/providers` | POST | Configure provider |
| 8 | `/delivery-logs/:jobId` | GET | Delivery history |
| 9 | `/provider-status` | GET | Provider health |
| 10 | `/queue-status` | GET | Queue depth |

---

## 🏗️ Database Schema

### New Tables (6)
1. **notification_providers** - Provider configs
2. **notification_channels** - Channel-to-provider mapping
3. **notification_failures** - Failure tracking
4. **notification_statistics** - Aggregated metrics
5. **notification_jobs** - Enhanced with 8 new columns
6. **notification_delivery_logs** - Enhanced with 5 new columns

### New Views (3)
1. `v_notification_provider_status`
2. `v_notification_queue_status`
3. `v_notification_delivery_metrics`

### New Functions (4)
1. `get_notification_provider()`
2. `get_next_notification_job_to_retry()`
3. `record_notification_delivery()`
4. `increment_notification_statistics()`

---

## 🎯 Supported Channels

| Channel | Provider | Use Case | Speed |
|---------|----------|----------|-------|
| **EMAIL** | SendGrid | Bills, reminders | 1-2s |
| **SMS** | Twilio | Urgent alerts | 0.5-1s |
| **WHATSAPP** | Twilio | Personal outreach | 1-2s |
| **INTERNAL** | Built-in | Audit trail | <100ms |

---

## 📈 Key Metrics

### Success Rate Formula
```
Success Rate = (Sent / Total) × 100
```

### Targets
- EMAIL: 99%+ delivery
- SMS: 98%+ delivery
- WHATSAPP: 95%+ delivery

### Monitoring Queries
```sql
-- Success rate today
SELECT channel, 
  ROUND(100 * COUNT(*) FILTER (WHERE status = 'SENT') / COUNT(*), 2) as rate
FROM notification_delivery_logs
WHERE created_at > NOW() - INTERVAL '1 day'
GROUP BY channel;

-- Avg delivery time
SELECT channel, ROUND(AVG(delivery_time_ms), 2) as avg_ms
FROM notification_delivery_logs
WHERE created_at > NOW() - INTERVAL '1 day'
GROUP BY channel;

-- Pending jobs
SELECT COUNT(*) FROM notification_jobs WHERE status = 'PENDING';
```

---

## ⚡ Service Methods

### NotificationService

```javascript
// Send notification
await notificationService.sendNotification({
  channel: 'EMAIL',
  recipient: { email, phone, name },
  subject: 'Subject',
  message: 'Body',
  context: { billId: 123 },
  jobId: 1,
  userId: 1
});

// Retry failed
await notificationService.retryNotification(jobId);

// Get status
await notificationService.getDeliveryStatus(jobId);

// Get metrics
await notificationService.getDeliveryMetrics({ days: 7, channel: 'EMAIL' });
```

---

## 🔄 Retry Logic

### Exponential Backoff
```
Attempt 1: Immediate
Attempt 2: 60 seconds
Attempt 3: 120 seconds
Attempt 4: 240 seconds (max 3 attempts default)
```

### Error Classification
```
RETRYABLE:
- Network timeout
- Rate limit (429)
- Provider down (503)

NON-RETRYABLE:
- Invalid email format
- Invalid phone number
- Authentication failure
```

---

## 🚦 Rate Limiting

### Defaults
- **Global**: 1,000 requests/minute
- **Per user**: 100 notifications/minute
- **Per provider**: 100/minute

### Configuration
```sql
UPDATE notification_providers
SET rate_limit_per_minute = 200
WHERE provider_type = 'SENDGRID';
```

---

## 🧪 Common Test Curl Commands

### Send Email
```bash
curl -X POST http://localhost:5000/api/notifications/send \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "EMAIL",
    "recipientEmail": "test@example.com",
    "subject": "Test",
    "message": "Test message"
  }'
```

### Send SMS
```bash
curl -X POST http://localhost:5000/api/notifications/send \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "channel": "SMS",
    "recipientPhone": "+1234567890",
    "message": "Test SMS"
  }'
```

### Get Metrics
```bash
curl -X GET "http://localhost:5000/api/notifications/metrics?days=7" \
  -H "Authorization: Bearer TOKEN"
```

### Check Queue
```bash
curl -X GET http://localhost:5000/api/notifications/queue-status \
  -H "Authorization: Bearer TOKEN"
```

---

## 🔑 Status Values

| Status | Meaning | Next Action |
|--------|---------|------------|
| PENDING | Waiting to send | Worker dispatch |
| SENT | Successfully delivered | Monitor |
| FAILED | Delivery failed | Retry or manual fix |
| CANCELLED | Manually cancelled | None |

---

## 🎯 Performance Targets

| Metric | Target | Critical |
|--------|--------|----------|
| Send response time | < 500ms | > 2s |
| Delivery latency | < 2s | > 5s |
| Success rate | > 95% | < 90% |
| Queue processing | 1000/min | < 500/min |
| DB query (10k records) | < 1s | > 3s |

---

## 📋 Error Codes Reference

### HTTP Status
- `200 OK` - Success
- `201 Created` - Resource created
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - No token
- `403 Forbidden` - No permission
- `429 Too Many Requests` - Rate limited
- `500 Server Error` - Internal error

### Provider Error Codes

**SendGrid**:
- 400: Bad request
- 401: Invalid API key
- 429: Rate limit
- 500+: Server error

**Twilio**:
- 21211: Invalid phone
- 21601: Missing parameter
- 21609: Cannot send (region)
- 429: Rate limit
- 500+: Server error

---

## 🔐 Security Checklist

- ✅ API keys stored in config JSONB (encrypted)
- ✅ No credentials in logs
- ✅ Rate limiting prevents abuse
- ✅ Authorization required (Bearer token)
- ✅ Permission checks (billing:write)
- ✅ Input validation on all fields
- ✅ SQL injection prevention (parameterized queries)

---

## 🚨 Troubleshooting

### "Provider not found"
```
Problem: Channel has no active provider
Solution: POST /api/notifications/providers to configure
```

### "Rate limit exceeded"
```
Problem: Too many requests/minute
Solution: Wait 60 seconds before retrying, or increase rate_limit_per_minute
```

### "Invalid recipient"
```
Problem: Email/phone format invalid
Solution: Validate email format, use E.164 for phones: +1234567890
```

### "Provider returned 500"
```
Problem: External provider down
Solution: Automatic retry with exponential backoff (handled)
```

### "Notification job not found"
```
Problem: Invalid jobId
Solution: Verify jobId from /api/notifications/jobs list
```

---

## 📞 Integration Points

### Bill Confirmation
```javascript
// After bill marked CONFIRMED
if (bill.bill_type === 'SALE') {
  await notificationService.sendNotification({
    channel: 'EMAIL',
    recipient: { email, phone, name },
    subject: `Bill #${bill.bill_number}`,
    message: `Amount due: ₹${bill.grand_total}`,
    jobId: newJobId,
    userId: req.user.id
  });
}
```

### Payment Reminder
```javascript
// Check overdue bills, send reminder
const overdue = await pool.query(
  'SELECT * FROM bills WHERE status = "CONFIRMED" AND due_date < NOW()'
);

for (const bill of overdue.rows) {
  await notificationService.sendNotification({
    channel: 'SMS',
    recipient: { phone: bill.phone },
    message: `Bill #${bill.bill_number} is ${daysOverdue} days overdue. Amount: ₹${outstanding}`,
    jobId: null,
    userId: 1
  });
}
```

---

## 📊 Useful SQL Queries

```sql
-- 1. Queue Status
SELECT COUNT(*) FILTER (WHERE status = 'PENDING') as pending,
       COUNT(*) FILTER (WHERE status = 'SENT') as sent,
       COUNT(*) FILTER (WHERE status = 'FAILED') as failed
FROM notification_jobs
WHERE created_at > NOW() - INTERVAL '24 hours';

-- 2. Failed Jobs Ready to Retry
SELECT id, recipient_email, error_code, retry_count
FROM notification_jobs
WHERE status = 'FAILED'
  AND retry_count < 3
  AND next_retry_at <= NOW()
ORDER BY next_retry_at ASC
LIMIT 20;

-- 3. Provider Performance
SELECT provider_type, COUNT(*) as total,
       COUNT(*) FILTER (WHERE status = 'SENT') as sent
FROM notification_jobs nj
JOIN notification_providers np ON nj.provider_id = np.id
GROUP BY provider_type;

-- 4. Recent Failures
SELECT id, recipient_email, error_code, last_error, created_at
FROM notification_jobs
WHERE status = 'FAILED'
ORDER BY created_at DESC
LIMIT 20;

-- 5. Daily Statistics
SELECT DATE(created_at) as date,
       channel,
       COUNT(*) as total,
       COUNT(*) FILTER (WHERE status = 'SENT') as sent,
       ROUND(100 * COUNT(*) FILTER (WHERE status = 'SENT') / COUNT(*), 2) as rate
FROM notification_delivery_logs
GROUP BY DATE(created_at), channel
ORDER BY date DESC, channel;
```

---

## 🎓 Key Concepts

### FIFO Processing
- Jobs processed in order created
- FOR UPDATE SKIP LOCKED prevents duplicates

### Idempotency
- Same jobId won't create duplicates
- Safe to retry without side effects

### Immutability
- delivery_logs are INSERT-only
- Cannot modify past delivery records
- Audit trail is complete

### Provider Abstraction
- Services handle provider-specific logic
- Notification service routes to correct provider
- Easy to add new providers

---

## ✨ Next Phase Preview

**Phase 8: Voice AI Agent System**
- Inbound call handling
- Speech-to-text (Whisper)
- Intent classification (GPT-4o)
- Voice responses
- Demand logging

---

**Version**: 1.0  
**Last Updated**: April 19, 2026  
**Status**: Production Ready

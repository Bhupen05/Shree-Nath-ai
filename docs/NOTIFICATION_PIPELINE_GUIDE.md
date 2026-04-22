# Notification Pipeline Integration Guide

## Overview

The SIBMS Smart Inventory & Business Management System now includes a comprehensive notification pipeline for bill reminders via SMS, WhatsApp, and Email. This guide explains how to configure and use the notification system.

## Architecture

### Components

1. **Notification Job Creation** (`generateBillReminderJobs()`)
   - Triggered automatically when a SALE bill is confirmed
   - Creates notification_jobs records for bills with due dates and outstanding amounts
   - Avoids duplicate reminders for the same bill and due date

2. **Notification Dispatch Worker** (`dispatchPendingNotificationJobs()`)
   - Runs on a configurable interval (default: 60 seconds)
   - Fetches pending notification jobs
   - Dispatches via configured channels (SMS, WhatsApp, Email)
   - Records delivery status in notification_delivery_logs

3. **Notification Templates** 
   - Stored in `notification_templates` table
   - Can define templates for different channels
   - API endpoints for CRUD operations
   - Supports dynamic template variables

### Database Tables

- `notification_jobs` - Bill reminder jobs to be dispatched
- `notification_templates` - Message templates per channel
- `notification_delivery_logs` - Delivery status audit trail

## Configuration

### Environment Variables

Add these to your `.env` file for production:

```bash
# Notification Worker Settings
NOTIFICATION_WORKER_ENABLED=true
NOTIFICATION_WORKER_INTERVAL_MS=60000

# Twilio SMS/WhatsApp Configuration
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_FROM_NUMBER=+1234567890
TWILIO_WHATSAPP_NUMBER=+1234567890

# SendGrid Email Configuration
SENDGRID_API_KEY=your_api_key
SENDGRID_FROM_EMAIL=noreply@shreenaath.com
```

### Getting Credentials

#### Twilio (SMS & WhatsApp)
1. Go to https://www.twilio.com
2. Sign up for an account
3. Verify a phone number
4. Get your Account SID and Auth Token from the Console
5. Purchase a phone number for SMS
6. Enable WhatsApp on your account (if needed)

#### SendGrid (Email)
1. Go to https://sendgrid.com
2. Sign up for a free account
3. Create an API Key from Settings → API Keys
4. Verify a sender email address
5. Add to `.env` as `SENDGRID_API_KEY`

## API Endpoints

### Notification Templates

#### Get All Templates
```
GET /api/notifications/templates
Authorization: Bearer <token>
Permission: billing:read
```

Response:
```json
{
  "message": "Notification templates fetched successfully",
  "items": [
    {
      "id": 1,
      "name": "Bill Due Reminder",
      "channel": "SMS",
      "subject": null,
      "body": "Your bill is due...",
      "is_active": true,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### Create Template
```
POST /api/notifications/templates
Authorization: Bearer <token>
Permission: billing:write
Content-Type: application/json

{
  "name": "Bill Due Reminder",
  "channel": "SMS",
  "subject": null,
  "body": "Dear {recipientName}, your bill #{billNumber} is due on {dueDate}.",
  "isActive": true
}
```

#### Update Template
```
PUT /api/notifications/templates/:id
Authorization: Bearer <token>
Permission: billing:write
Content-Type: application/json

{
  "isActive": false
}
```

### Notification Jobs

#### Get All Jobs
```
GET /api/notifications/jobs
Authorization: Bearer <token>
Permission: billing:read

Query Parameters:
- status=PENDING|SENT|FAILED
- limit=20
- offset=0
```

Response:
```json
{
  "message": "Notification jobs fetched successfully",
  "items": [
    {
      "id": 1,
      "job_type": "BILL_DUE_REMINDER",
      "bill_id": 123,
      "party_type": "CUSTOMER",
      "recipient_name": "John Doe",
      "recipient_phone": "+919876543210",
      "recipient_email": "john@example.com",
      "due_date": "2024-01-15",
      "outstanding_amount": 5000.00,
      "status": "SENT",
      "scheduled_for": "2024-01-13T10:00:00Z",
      "sent_at": "2024-01-13T10:05:00Z",
      "created_at": "2024-01-13T10:00:00Z"
    }
  ]
}
```

#### Dispatch Pending Jobs Manually
```
POST /api/notifications/dispatch
Authorization: Bearer <token>
Permission: billing:write

{
  "limit": 20
}
```

Response:
```json
{
  "message": "Notification jobs dispatched successfully",
  "summary": {
    "pickedCount": 5,
    "sentCount": 5,
    "failedCount": 0
  }
}
```

### Delivery Logs

#### Get Delivery Logs
```
GET /api/notifications/delivery-logs
Authorization: Bearer <token>
Permission: billing:read

Query Parameters:
- job_id=1
- channel=SMS|WHATSAPP|EMAIL|INTERNAL
- status=SENT|FAILED
- limit=50
```

Response:
```json
{
  "message": "Notification delivery logs fetched successfully",
  "items": [
    {
      "id": 1,
      "job_id": 1,
      "channel": "SMS",
      "status": "SENT",
      "provider_message": "Delivered via twilio",
      "provider_response": {
        "provider": "twilio",
        "messageId": "SM1234567890abcdef",
        "status": "sent"
      },
      "created_at": "2024-01-13T10:05:00Z"
    }
  ]
}
```

## How It Works

### Bill Confirmation Flow

1. User creates a SALE bill (customer bill) with:
   - Line items
   - Due date
   - Customer contact info (phone/email)

2. When bill is confirmed:
   - Bill status changes to CONFIRMED
   - Stock is allocated via FIFO
   - `generateBillReminderJobs()` is called automatically
   - Notification job is created with status PENDING

3. Notification Worker (every 60 seconds):
   - Fetches all PENDING jobs scheduled for NOW or earlier
   - For each job, selects active notification channels
   - Attempts delivery via SMS/WhatsApp/Email
   - Updates job status to SENT or FAILED
   - Records delivery logs for audit trail

### Delivery Channels

#### SMS (Twilio)
- Requires phone number in E.164 format: `+1234567890`
- Cost: ~₹1-2 per message (varies by region)
- Immediate delivery
- 160 characters per message

#### WhatsApp (Twilio)
- Requires phone number in E.164 format: `+1234567890`
- Cost: ~₹2-5 per message (varies by message type)
- Requires customer to opt-in
- Supports up to 4096 characters

#### Email (SendGrid)
- Requires valid email address
- Cost: Free tier up to 100/day
- Slight delay (usually < 1 second)
- Can include HTML formatting

#### INTERNAL (Fallback)
- No external service required
- Messages stored in notification_delivery_logs
- Used when external credentials not configured
- For development/testing

## Scheduling

The notification system schedules reminders at:

1. **T-2 days**: Before due date (upcoming reminders)
2. **Due date**: On the due date
3. **Overdue**: After due date (if enabled)

The worker runs every 60 seconds by default, so reminders are sent within 1 minute of their scheduled time.

## Testing

### Without External Credentials

1. Create notification templates with channel = INTERNAL
2. Create and confirm a bill
3. Check notification_jobs table for PENDING records
4. Manually call POST /api/notifications/dispatch endpoint
5. Verify notification_delivery_logs records with status SENT

### With Twilio/SendGrid

1. Add credentials to .env
2. Restart backend server
3. Create templates with actual channels (SMS/WHATSAPP/EMAIL)
4. Create and confirm a bill
5. Wait for worker to dispatch (default: 60 seconds)
6. Check logs in external provider dashboards

### Example SQL Queries

Check pending jobs:
```sql
SELECT id, bill_id, recipient_name, status, scheduled_for
FROM notification_jobs
WHERE status = 'PENDING'
ORDER BY scheduled_for ASC;
```

Check delivery logs:
```sql
SELECT job_id, channel, status, created_at
FROM notification_delivery_logs
ORDER BY created_at DESC
LIMIT 20;
```

Check failed deliveries:
```sql
SELECT nj.bill_id, nj.recipient_name, ndl.channel, ndl.provider_message
FROM notification_jobs nj
JOIN notification_delivery_logs ndl ON ndl.job_id = nj.id
WHERE nj.status = 'FAILED'
ORDER BY nj.updated_at DESC;
```

## Troubleshooting

### Notifications not being dispatched

1. Check `NOTIFICATION_WORKER_ENABLED=true` in .env
2. Check backend logs for worker errors
3. Manually trigger: POST /api/notifications/dispatch
4. Verify notification_jobs table has PENDING records

### SMS/WhatsApp not sending

1. Verify TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in .env
2. Check phone number format: must be E.164 (e.g., +919876543210)
3. Ensure phone number is in sandbox (development) or verified
4. Check notification_delivery_logs for error message

### Email not sending

1. Verify SENDGRID_API_KEY is valid
2. Ensure SENDGRID_FROM_EMAIL is verified in SendGrid
3. Check recipient email address validity
4. Check SendGrid dashboard for bounced/suppressed addresses

### Duplicate Notifications

1. System prevents duplicates for same bill + due_date combo
2. Check notification_jobs for WHERE NOT EXISTS clause
3. To resend: manually create new job via API or SQL

## Best Practices

1. **Test Credentials First**: Use sandbox/development credentials initially
2. **Start with INTERNAL**: Test the full flow with INTERNAL channel
3. **Gradual Rollout**: Enable one channel at a time
4. **Monitor Delivery**: Check notification_delivery_logs regularly
5. **Template Management**: Create templates for different message types
6. **Rate Limiting**: Default worker processes max 25 jobs per interval
7. **Backup Plan**: INTERNAL channel provides fallback if services fail

## Performance Considerations

- Notification jobs are processed in background worker
- Max 25 jobs processed per 60-second interval
- Does not block bill confirmation
- Delivery logs are immutable for audit trail
- Consider indexing on `status`, `scheduled_for`, `created_at` for large deployments

## Security

1. All endpoints require `billing:read` or `billing:write` permissions
2. Phone numbers and emails are stored in encrypted form recommended
3. Twilio/SendGrid API keys never exposed in logs
4. Delivery audit trail in notification_delivery_logs
5. Use HTTPS in production

## Future Enhancements

- [ ] SMS/WhatsApp delivery confirmation webhooks
- [ ] Custom message templates with variable interpolation
- [ ] Multi-language support
- [ ] Notification preferences per customer
- [ ] Retry logic with exponential backoff
- [ ] Dead letter queue for failed jobs
- [ ] Notification analytics dashboard

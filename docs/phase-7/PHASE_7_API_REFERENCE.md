# Phase 7: Notification Engine API Reference

## 📚 Quick Reference Table

| Endpoint | Method | Purpose | Auth | Status |
|----------|--------|---------|------|--------|
| `/api/notifications/send` | POST | Send notification | ✅ | 201 Created |
| `/api/notifications/status/:jobId` | GET | Get delivery status | ✅ | 200 OK |
| `/api/notifications/retry/:jobId` | POST | Retry failed notification | ✅ | 200 OK |
| `/api/notifications/metrics` | GET | Get performance metrics | ✅ | 200 OK |
| `/api/notifications/jobs` | GET | List notification jobs | ✅ | 200 OK |
| `/api/notifications/providers` | GET | List providers | ✅ | 200 OK |
| `/api/notifications/providers` | POST | Configure provider | ✅ | 201 Created |
| `/api/notifications/delivery-logs/:jobId` | GET | Get delivery logs | ✅ | 200 OK |
| `/api/notifications/provider-status` | GET | Provider health | ✅ | 200 OK |
| `/api/notifications/queue-status` | GET | Queue depth | ✅ | 200 OK |

## 🔌 Detailed Endpoint Documentation

### 1. Send Notification

**Endpoint**: `POST /api/notifications/send`

**Authentication**: Bearer token required

**Description**: Send a notification through specified channel

**Request Body**:
```json
{
  "channel": "EMAIL|SMS|WHATSAPP|INTERNAL",
  "recipientEmail": "user@example.com",
  "recipientPhone": "+1234567890",
  "recipientName": "John Doe",
  "subject": "Bill Payment Reminder",
  "message": "Your bill is due tomorrow",
  "htmlContent": "<p>Your bill is due tomorrow</p>",
  "context": {
    "billId": 123,
    "amount": 500
  }
}
```

**Field Validation**:
- `channel` (required): EMAIL, SMS, WHATSAPP, or INTERNAL
- `recipientEmail` (required if channel=EMAIL): Valid email format
- `recipientPhone` (required if channel=SMS|WHATSAPP): Valid phone (E.164 format)
- `message` (required): Non-empty string
- `subject` (optional): Email subject, required for EMAIL channel

**Success Response (201 Created)**:
```json
{
  "success": true,
  "jobId": 1,
  "status": "SENT",
  "messageId": "SG.7U6erR-NSeQQwKPiMjkgSw.abc123xyz",
  "delivery": {
    "provider": "SENDGRID",
    "timestamp": "2026-04-19T10:30:00Z"
  }
}
```

**Error Response (400 Bad Request)**:
```json
{
  "success": false,
  "message": "recipientEmail is required for EMAIL channel",
  "error": "recipientEmail is required for EMAIL channel"
}
```

**Examples**:

```javascript
// Email Notification
fetch('http://localhost:5000/api/notifications/send', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    channel: 'EMAIL',
    recipientEmail: 'customer@example.com',
    recipientName: 'John Doe',
    subject: 'Payment Reminder',
    message: 'Your invoice #123 is due in 3 days',
    htmlContent: '<h2>Payment Reminder</h2><p>Your invoice #123 is due in 3 days</p>'
  })
});

// SMS Notification
fetch('http://localhost:5000/api/notifications/send', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    channel: 'SMS',
    recipientPhone: '+1-202-555-0134',
    recipientName: 'Jane Smith',
    message: 'Your bill #456 of $500 is due today. Reply PAID to confirm.'
  })
});

// WhatsApp Notification
fetch('http://localhost:5000/api/notifications/send', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    channel: 'WHATSAPP',
    recipientPhone: '+919876543210',
    recipientName: 'Raj Kumar',
    message: 'Order #789 is ready for pickup!'
  })
});
```

---

### 2. Get Delivery Status

**Endpoint**: `GET /api/notifications/status/:jobId`

**Description**: Get current delivery status and attempt history

**Parameters**:
- `jobId` (required): Numeric notification job ID

**Success Response (200 OK)**:
```json
{
  "success": true,
  "job": {
    "id": 1,
    "status": "SENT",
    "provider_status": "SENT",
    "retry_count": 0,
    "sent_at": "2026-04-19T10:31:00Z",
    "successful_attempts": 1
  }
}
```

**Status Values**:
- `PENDING`: Waiting to send
- `SENT`: Successfully delivered
- `FAILED`: Delivery failed, retries exhausted
- `CANCELLED`: Manually cancelled

**Example**:
```javascript
fetch('http://localhost:5000/api/notifications/status/1', {
  headers: { 'Authorization': 'Bearer YOUR_TOKEN' }
})
.then(r => r.json())
.then(data => console.log(`Status: ${data.job.status}`));
```

---

### 3. Retry Failed Notification

**Endpoint**: `POST /api/notifications/retry/:jobId`

**Description**: Manually retry a failed notification

**Parameters**:
- `jobId` (required): Numeric job ID of failed notification

**Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Notification retry initiated",
  "result": {
    "status": "SENT",
    "messageId": "SG.newMessageId123"
  }
}
```

**Constraints**:
- Job must have status = 'FAILED'
- Job retry_count must be < provider.retry_max_attempts
- Cannot retry cancelled jobs

**Example**:
```javascript
fetch('http://localhost:5000/api/notifications/retry/1', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer YOUR_TOKEN' }
})
.then(r => r.json())
.then(data => {
  if (data.success) {
    console.log('Retry sent:', data.result.messageId);
  }
});
```

---

### 4. Get Delivery Metrics

**Endpoint**: `GET /api/notifications/metrics?days=7&channel=EMAIL`

**Description**: Get performance metrics for notification channels

**Query Parameters**:
- `days` (optional): Number of days (default: 7)
- `channel` (optional): Filter by channel (EMAIL, SMS, WHATSAPP)

**Success Response (200 OK)**:
```json
{
  "success": true,
  "metrics": [
    {
      "channel_type": "EMAIL",
      "total": 150,
      "sent": 148,
      "failed": 2,
      "success_rate": 98.67,
      "avg_delivery_ms": 1250
    },
    {
      "channel_type": "SMS",
      "total": 75,
      "sent": 72,
      "failed": 3,
      "success_rate": 96.00,
      "avg_delivery_ms": 850
    }
  ]
}
```

**Metrics Explained**:
- `total`: Total notifications sent in period
- `sent`: Successfully delivered
- `failed`: Delivery failures
- `success_rate`: Percentage of successful deliveries
- `avg_delivery_ms`: Average delivery time in milliseconds

**Examples**:
```javascript
// Get 7-day metrics
fetch('http://localhost:5000/api/notifications/metrics?days=7', {
  headers: { 'Authorization': 'Bearer YOUR_TOKEN' }
});

// Get 30-day SMS metrics only
fetch('http://localhost:5000/api/notifications/metrics?days=30&channel=SMS', {
  headers: { 'Authorization': 'Bearer YOUR_TOKEN' }
});
```

---

### 5. List Notification Jobs

**Endpoint**: `GET /api/notifications/jobs?status=PENDING&channel=EMAIL&limit=50&offset=0`

**Description**: List all notification jobs with filters

**Query Parameters**:
- `status` (optional): PENDING, SENT, FAILED, CANCELLED
- `channel` (optional): EMAIL, SMS, WHATSAPP, INTERNAL
- `limit` (optional): Page size (default: 50, max: 100)
- `offset` (optional): Page offset (default: 0)

**Success Response (200 OK)**:
```json
{
  "success": true,
  "jobs": [
    {
      "id": 1,
      "job_type": "BILL_DUE_REMINDER",
      "status": "SENT",
      "provider_status": "SENT",
      "recipient_name": "John Doe",
      "recipient_email": "john@example.com",
      "recipient_phone": null,
      "sent_at": "2026-04-19T10:31:00Z",
      "retry_count": 0,
      "created_at": "2026-04-19T10:30:00Z"
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 523
  }
}
```

**Examples**:
```javascript
// Get all pending jobs
fetch('http://localhost:5000/api/notifications/jobs?status=PENDING', {
  headers: { 'Authorization': 'Bearer YOUR_TOKEN' }
});

// Get failed SMS jobs
fetch('http://localhost:5000/api/notifications/jobs?status=FAILED&channel=SMS&limit=10', {
  headers: { 'Authorization': 'Bearer YOUR_TOKEN' }
});

// Pagination example
fetch('http://localhost:5000/api/notifications/jobs?limit=25&offset=50', {
  headers: { 'Authorization': 'Bearer YOUR_TOKEN' }
});
```

---

### 6. List Providers

**Endpoint**: `GET /api/notifications/providers`

**Description**: List all configured notification providers

**Success Response (200 OK)**:
```json
{
  "success": true,
  "providers": [
    {
      "id": 1,
      "provider_type": "SENDGRID",
      "display_name": "SendGrid Email",
      "is_active": true,
      "rate_limit_per_minute": 100,
      "retry_max_attempts": 3,
      "channel_count": 1
    },
    {
      "id": 2,
      "provider_type": "TWILIO",
      "display_name": "Twilio SMS",
      "is_active": true,
      "rate_limit_per_minute": 100,
      "retry_max_attempts": 3,
      "channel_count": 2
    }
  ]
}
```

---

### 7. Configure Provider

**Endpoint**: `POST /api/notifications/providers`

**Description**: Create or update a notification provider

**Request Body**:
```json
{
  "providerType": "SENDGRID|TWILIO|WHATSAPP|INTERNAL",
  "displayName": "SendGrid Email",
  "config": {
    "apiKey": "SG.xxxxxxxxxxxxx"
  },
  "isActive": true,
  "rateLimitPerMinute": 100
}
```

**Success Response (201 Created)**:
```json
{
  "success": true,
  "message": "Provider configured successfully",
  "provider": {
    "id": 1,
    "provider_type": "SENDGRID",
    "display_name": "SendGrid Email",
    "is_active": true
  }
}
```

**Provider Configuration Examples**:

```javascript
// SendGrid Configuration
{
  "providerType": "SENDGRID",
  "displayName": "SendGrid Email",
  "config": {
    "apiKey": "SG.xxxxxxxxxxxxxxxxxxxxx"
  },
  "isActive": true,
  "rateLimitPerMinute": 100
}

// Twilio SMS Configuration
{
  "providerType": "TWILIO",
  "displayName": "Twilio SMS",
  "config": {
    "accountSid": "ACxxxxxxxxxxxxxxxxxx",
    "authToken": "your_auth_token",
    "fromNumber": "+1234567890"
  },
  "isActive": true,
  "rateLimitPerMinute": 100
}

// WhatsApp Configuration
{
  "providerType": "WHATSAPP",
  "displayName": "WhatsApp Business",
  "config": {
    "accountSid": "ACxxxxxxxxxxxxxxxxxx",
    "authToken": "your_auth_token",
    "businessPhoneNumberId": "1234567890"
  },
  "isActive": true,
  "rateLimitPerMinute": 60
}
```

---

### 8. Get Delivery Logs

**Endpoint**: `GET /api/notifications/delivery-logs/:jobId`

**Description**: Get all delivery attempt logs for a job

**Parameters**:
- `jobId` (required): Numeric job ID

**Success Response (200 OK)**:
```json
{
  "success": true,
  "logs": [
    {
      "id": 1,
      "job_id": 1,
      "channel": "EMAIL",
      "status": "SENT",
      "delivery_time_ms": 1250,
      "provider_response": {
        "provider_reference_id": "SG.msg123",
        "error_code": null
      },
      "created_at": "2026-04-19T10:31:00Z"
    }
  ]
}
```

---

### 9. Get Provider Status

**Endpoint**: `GET /api/notifications/provider-status`

**Description**: Get current status and performance of all providers

**Success Response (200 OK)**:
```json
{
  "success": true,
  "providers": [
    {
      "id": 1,
      "provider_type": "SENDGRID",
      "display_name": "SendGrid Email",
      "is_active": true,
      "pending_jobs": 3,
      "sent_jobs": 1000,
      "failed_jobs": 5,
      "success_rate": 99.50,
      "last_delivery_at": "2026-04-19T10:35:00Z"
    }
  ]
}
```

---

### 10. Get Queue Status

**Endpoint**: `GET /api/notifications/queue-status`

**Description**: Get current notification queue depth and scheduling info

**Success Response (200 OK)**:
```json
{
  "success": true,
  "queue": [
    {
      "provider_type": "SENDGRID",
      "pending_count": 5,
      "due_count": 3,
      "retryable_failures": 2,
      "next_scheduled_time": "2026-04-19T11:00:00Z",
      "oldest_pending_since": "2026-04-19T10:30:00Z"
    }
  ]
}
```

## 🔑 Authentication

All endpoints require Bearer token in Authorization header:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

## ⚠️ Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

**Common HTTP Status Codes**:
- `200 OK`: Successful GET request
- `201 Created`: Successful POST request (created resource)
- `400 Bad Request`: Invalid input or validation error
- `401 Unauthorized`: Missing or invalid token
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

## 📝 Rate Limiting

Global rate limits per user:
- **1000 requests/minute** for general endpoints
- **100 requests/minute** for send endpoint

Rate limit headers in response:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1713600000
```

## 🧪 JavaScript Client Examples

### Basic Send Example
```javascript
async function sendEmailNotification(email, subject, message) {
  const response = await fetch('http://localhost:5000/api/notifications/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      channel: 'EMAIL',
      recipientEmail: email,
      subject,
      message
    })
  });
  
  return response.json();
}
```

### With Error Handling
```javascript
async function sendNotificationWithRetry(jobData, maxRetries = 3) {
  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(jobData)
      });
      
      if (response.ok) {
        return await response.json();
      } else if (response.status === 429) {
        // Rate limit - wait and retry
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        attempt++;
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      attempt++;
      if (attempt >= maxRetries) throw error;
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}
```

### React Hook Example
```javascript
function useNotification() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const send = async (channel, recipient, message) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${useAuth().token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          channel,
          recipientEmail: recipient.email,
          recipientPhone: recipient.phone,
          message
        })
      });
      
      if (!response.ok) {
        throw new Error(await response.text());
      }
      
      return await response.json();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  return { send, loading, error };
}
```

## 📚 Additional Resources

- Implementation Guide: `docs/phase-7/PHASE_7_IMPLEMENTATION_GUIDE.md`
- Integration Checklist: `docs/phase-7/PHASE_7_INTEGRATION_CHECKLIST.md`
- Quick Reference: `docs/phase-7/PHASE_7_QUICK_REFERENCE.md`

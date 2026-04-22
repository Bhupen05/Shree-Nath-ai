/**
 * Notification Routes
 * REST API endpoints for notification management
 */

const express = require('express');

module.exports = function createNotificationRoutes(pool, notificationService) {
  const router = express.Router();
  const NotificationController = require('../controllers/notification.controller');
  const controller = new NotificationController(notificationService, pool);

  /**
   * Send a notification
   * POST /api/notifications/send
   * 
   * Body:
   * {
   *   "channel": "EMAIL|SMS|WHATSAPP|INTERNAL",
   *   "recipientEmail": "user@example.com",
   *   "recipientPhone": "+1234567890",
   *   "recipientName": "John Doe",
   *   "subject": "Bill Payment Reminder",
   *   "message": "Your bill is due tomorrow",
   *   "htmlContent": "<p>Your bill is due tomorrow</p>",
   *   "context": { "billId": 123 }
   * }
   * 
   * Response: 201 Created
   * {
   *   "success": true,
   *   "jobId": 1,
   *   "status": "SENT",
   *   "messageId": "msg_xyz123",
   *   "delivery": {
   *     "provider": "SENDGRID",
   *     "timestamp": "2026-04-19T10:30:00Z"
   *   }
   * }
   */
  router.post('/send', async (req, res) => {
    await controller.sendNotification(req, res);
  });

  /**
   * Get delivery status for a job
   * GET /api/notifications/status/:jobId
   * 
   * Response: 200 OK
   * {
   *   "success": true,
   *   "job": {
   *     "id": 1,
   *     "status": "SENT",
   *     "provider_status": "SENT",
   *     "sent_at": "2026-04-19T10:31:00Z",
   *     "successful_attempts": 1
   *   }
   * }
   */
  router.get('/status/:jobId', async (req, res) => {
    await controller.getStatus(req, res);
  });

  /**
   * Get delivery metrics
   * GET /api/notifications/metrics?days=7&channel=EMAIL
   * 
   * Response: 200 OK
   * {
   *   "success": true,
   *   "metrics": [
   *     {
   *       "channel_type": "EMAIL",
   *       "total": 150,
   *       "sent": 148,
   *       "failed": 2,
   *       "success_rate": 98.67,
   *       "avg_delivery_ms": 1250
   *     }
   *   ]
   * }
   */
  router.get('/metrics', async (req, res) => {
    await controller.getMetrics(req, res);
  });

  /**
   * Retry a failed notification
   * POST /api/notifications/retry/:jobId
   * 
   * Response: 200 OK
   * {
   *   "success": true,
   *   "message": "Notification retry initiated",
   *   "result": {
   *     "status": "SENT",
   *     "messageId": "msg_xyz456"
   *   }
   * }
   */
  router.post('/retry/:jobId', async (req, res) => {
    await controller.retryNotification(req, res);
  });

  /**
   * List notification jobs
   * GET /api/notifications/jobs?status=PENDING&channel=SMS&limit=50&offset=0
   * 
   * Response: 200 OK
   * {
   *   "success": true,
   *   "jobs": [
   *     {
   *       "id": 1,
   *       "job_type": "BILL_DUE_REMINDER",
   *       "status": "SENT",
   *       "recipient_email": "user@example.com",
   *       "sent_at": "2026-04-19T10:31:00Z"
   *     }
   *   ],
   *   "pagination": {
   *     "limit": 50,
   *     "offset": 0,
   *     "total": 523
   *   }
   * }
   */
  router.get('/jobs', async (req, res) => {
    await controller.listJobs(req, res);
  });

  /**
   * List configured providers
   * GET /api/notifications/providers
   * 
   * Response: 200 OK
   * {
   *   "success": true,
   *   "providers": [
   *     {
   *       "id": 1,
   *       "provider_type": "SENDGRID",
   *       "display_name": "SendGrid Email",
   *       "is_active": true,
   *       "rate_limit_per_minute": 100,
   *       "channel_count": 1
   *     }
   *   ]
   * }
   */
  router.get('/providers', async (req, res) => {
    await controller.listProviders(req, res);
  });

  /**
   * Configure a notification provider
   * POST /api/notifications/providers
   * 
   * Body:
   * {
   *   "providerType": "SENDGRID",
   *   "displayName": "SendGrid Email Service",
   *   "config": {
   *     "apiKey": "SG.xxxxxxxxxxxxx"
   *   },
   *   "isActive": true,
   *   "rateLimitPerMinute": 100
   * }
   * 
   * Response: 201 Created
   * {
   *   "success": true,
   *   "provider": {
   *     "id": 1,
   *     "provider_type": "SENDGRID",
   *     "display_name": "SendGrid Email Service",
   *     "is_active": true
   *   }
   * }
   */
  router.post('/providers', async (req, res) => {
    await controller.configureProvider(req, res);
  });

  /**
   * Get delivery logs for a job
   * GET /api/notifications/delivery-logs/:jobId
   * 
   * Response: 200 OK
   * {
   *   "success": true,
   *   "logs": [
   *     {
   *       "id": 1,
   *       "job_id": 1,
   *       "channel": "EMAIL",
   *       "status": "SENT",
   *       "delivery_time_ms": 1250,
   *       "created_at": "2026-04-19T10:31:00Z"
   *     }
   *   ]
   * }
   */
  router.get('/delivery-logs/:jobId', async (req, res) => {
    await controller.getDeliveryLogs(req, res);
  });

  /**
   * Get provider status and performance
   * GET /api/notifications/provider-status
   * 
   * Response: 200 OK
   * {
   *   "success": true,
   *   "providers": [
   *     {
   *       "id": 1,
   *       "provider_type": "SENDGRID",
   *       "is_active": true,
   *       "pending_jobs": 0,
   *       "sent_jobs": 1000,
   *       "failed_jobs": 5,
   *       "success_rate": 99.50,
   *       "last_delivery_at": "2026-04-19T10:35:00Z"
   *     }
   *   ]
   * }
   */
  router.get('/provider-status', async (req, res) => {
    await controller.getProviderStatus(req, res);
  });

  /**
   * Get current queue status
   * GET /api/notifications/queue-status
   * 
   * Response: 200 OK
   * {
   *   "success": true,
   *   "queue": [
   *     {
   *       "provider_type": "SENDGRID",
   *       "pending_count": 5,
   *       "due_count": 3,
   *       "next_scheduled_time": "2026-04-19T11:00:00Z"
   *     }
   *   ]
   * }
   */
  router.get('/queue-status', async (req, res) => {
    await controller.getQueueStatus(req, res);
  });

  return router;
};

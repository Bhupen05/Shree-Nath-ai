/**
 * Notification Controller
 * HTTP handlers for notification management
 */

class NotificationController {
  constructor(notificationService, pool) {
    this.notificationService = notificationService;
    this.pool = pool;
  }

  /**
   * POST /api/notifications/send
   * Send a notification to recipient
   */
  async sendNotification(req, res) {
    try {
      const { channel, recipientEmail, recipientPhone, recipientName, subject, message, htmlContent, context } = req.body;

      // Validation
      if (!channel) {
        return res.status(400).json({ message: 'channel is required' });
      }

      if (!message) {
        return res.status(400).json({ message: 'message is required' });
      }

      const channelUpper = String(channel).toUpperCase();
      if (!['EMAIL', 'SMS', 'WHATSAPP', 'INTERNAL'].includes(channelUpper)) {
        return res.status(400).json({ message: 'channel must be EMAIL, SMS, WHATSAPP, or INTERNAL' });
      }

      // Validate recipient
      if (channelUpper === 'EMAIL' && !recipientEmail) {
        return res.status(400).json({ message: 'recipientEmail is required for EMAIL channel' });
      }

      if ((channelUpper === 'SMS' || channelUpper === 'WHATSAPP') && !recipientPhone) {
        return res.status(400).json({ message: `recipientPhone is required for ${channelUpper} channel` });
      }

      // Create notification job
      const jobResult = await this.pool.query(`
        INSERT INTO notification_jobs (
          job_type, recipient_email, recipient_phone, recipient_name,
          status, payload, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, status, created_at
      `, [
        'MANUAL_SEND',
        recipientEmail || null,
        recipientPhone || null,
        recipientName || null,
        'PENDING',
        JSON.stringify(context || {}),
        req.user.id
      ]);

      const jobId = jobResult.rows[0].id;

      // Send notification
      const result = await this.notificationService.sendNotification({
        channel: channelUpper,
        recipient: {
          email: recipientEmail,
          phone: recipientPhone,
          name: recipientName
        },
        subject,
        message,
        htmlContent,
        context,
        jobId,
        userId: req.user.id
      });

      return res.status(201).json({
        success: true,
        message: 'Notification sent successfully',
        jobId,
        status: result.status,
        messageId: result.messageId,
        delivery: {
          provider: result.provider,
          timestamp: result.timestamp
        }
      });

    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to send notification',
        error: error.message
      });
    }
  }

  /**
   * GET /api/notifications/status/:jobId
   * Get delivery status for a job
   */
  async getStatus(req, res) {
    try {
      const { jobId } = req.params;

      if (!jobId || isNaN(jobId)) {
        return res.status(400).json({ message: 'Invalid jobId' });
      }

      const status = await this.notificationService.getDeliveryStatus(jobId);

      if (!status) {
        return res.status(404).json({ message: 'Job not found' });
      }

      return res.status(200).json({
        success: true,
        job: status
      });

    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * GET /api/notifications/metrics
   * Get delivery metrics
   */
  async getMetrics(req, res) {
    try {
      const { days = 7, channel } = req.query;

      const metrics = await this.notificationService.getDeliveryMetrics({
        days: parseInt(days) || 7,
        channel: channel || null
      });

      return res.status(200).json({
        success: true,
        metrics
      });

    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * POST /api/notifications/retry/:jobId
   * Retry failed notification
   */
  async retryNotification(req, res) {
    try {
      const { jobId } = req.params;

      if (!jobId || isNaN(jobId)) {
        return res.status(400).json({ message: 'Invalid jobId' });
      }

      const result = await this.notificationService.retryNotification(jobId);

      return res.status(200).json({
        success: true,
        message: 'Notification retry initiated',
        result: {
          status: result.status,
          messageId: result.messageId
        }
      });

    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * GET /api/notifications/jobs
   * List notification jobs with filters
   */
  async listJobs(req, res) {
    try {
      const { status, channel, limit = 50, offset = 0 } = req.query;

      let query = `
        SELECT
          id, job_type, status, provider_status, 
          recipient_name, recipient_email, recipient_phone,
          sent_at, retry_count, last_error, created_at
        FROM notification_jobs
        WHERE 1=1
      `;
      const params = [];

      if (status) {
        query += ` AND status = $${params.length + 1}`;
        params.push(status.toUpperCase());
      }

      if (channel) {
        query += ` AND channel = $${params.length + 1}`;
        params.push(channel.toUpperCase());
      }

      query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const result = await this.pool.query(query, params);

      // Get total count
      let countQuery = 'SELECT COUNT(*) as count FROM notification_jobs WHERE 1=1';
      const countParams = [];

      if (status) {
        countQuery += ` AND status = $${countParams.length + 1}`;
        countParams.push(status.toUpperCase());
      }

      if (channel) {
        countQuery += ` AND channel = $${countParams.length + 1}`;
        countParams.push(channel.toUpperCase());
      }

      const countResult = await this.pool.query(countQuery, countParams);
      const total = countResult.rows[0].count;

      return res.status(200).json({
        success: true,
        jobs: result.rows,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total
        }
      });

    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * GET /api/notifications/providers
   * List configured notification providers
   */
  async listProviders(req, res) {
    try {
      const result = await this.pool.query(`
        SELECT
          np.id,
          np.provider_type,
          np.display_name,
          np.is_active,
          np.rate_limit_per_minute,
          np.retry_max_attempts,
          COUNT(nc.id) as channel_count
        FROM notification_providers np
        LEFT JOIN notification_channels nc ON nc.provider_id = np.id
        GROUP BY np.id, np.provider_type, np.display_name, np.is_active, np.rate_limit_per_minute, np.retry_max_attempts
        ORDER BY np.provider_type
      `);

      return res.status(200).json({
        success: true,
        providers: result.rows
      });

    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * POST /api/notifications/providers
   * Create or update notification provider
   */
  async configureProvider(req, res) {
    try {
      const { providerType, displayName, config, isActive, rateLimitPerMinute } = req.body;

      if (!providerType) {
        return res.status(400).json({ message: 'providerType is required' });
      }

      if (!['SENDGRID', 'TWILIO', 'WHATSAPP', 'INTERNAL'].includes(providerType.toUpperCase())) {
        return res.status(400).json({ message: 'Invalid providerType' });
      }

      if (!config || typeof config !== 'object') {
        return res.status(400).json({ message: 'config must be a valid object' });
      }

      const result = await this.pool.query(`
        INSERT INTO notification_providers (
          provider_type, display_name, config, is_active,
          rate_limit_per_minute, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (provider_type) DO UPDATE SET
          display_name = EXCLUDED.display_name,
          config = EXCLUDED.config,
          is_active = EXCLUDED.is_active,
          rate_limit_per_minute = EXCLUDED.rate_limit_per_minute,
          updated_at = NOW()
        RETURNING id, provider_type, display_name, is_active
      `, [
        providerType.toUpperCase(),
        displayName || providerType,
        JSON.stringify(config),
        isActive !== false,
        rateLimitPerMinute || 100,
        req.user.id
      ]);

      return res.status(201).json({
        success: true,
        message: 'Provider configured successfully',
        provider: result.rows[0]
      });

    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * GET /api/notifications/delivery-logs/:jobId
   * Get all delivery logs for a job
   */
  async getDeliveryLogs(req, res) {
    try {
      const { jobId } = req.params;

      if (!jobId || isNaN(jobId)) {
        return res.status(400).json({ message: 'Invalid jobId' });
      }

      const result = await this.pool.query(`
        SELECT
          id, job_id, channel, status, delivery_time_ms,
          provider_response, created_at
        FROM notification_delivery_logs
        WHERE job_id = $1
        ORDER BY created_at DESC
      `, [jobId]);

      return res.status(200).json({
        success: true,
        logs: result.rows
      });

    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * GET /api/notifications/provider-status
   * Get provider status and performance
   */
  async getProviderStatus(req, res) {
    try {
      const result = await this.pool.query(`
        SELECT * FROM v_notification_provider_status
        ORDER BY provider_type
      `);

      return res.status(200).json({
        success: true,
        providers: result.rows
      });

    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * GET /api/notifications/queue-status
   * Get current queue status
   */
  async getQueueStatus(req, res) {
    try {
      const result = await this.pool.query(`
        SELECT * FROM v_notification_queue_status
      `);

      return res.status(200).json({
        success: true,
        queue: result.rows
      });

    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = NotificationController;

/**
 * Notification Service - Core Orchestration
 * Manages notification delivery across multiple providers
 */

const EmailService = require('./email.service');
const SMSService = require('./sms.service');
const WhatsAppService = require('./whatsapp.service');

class NotificationService {
  constructor(pool, providers = {}) {
    this.pool = pool;
    this.providers = providers; // { SENDGRID: EmailService, TWILIO: SMSService, etc }
    this.rateLimiters = new Map();
    this.deliveryCache = new Map(); // Cache recent deliveries to prevent duplicates
  }

  /**
   * Initialize providers from database configuration
   * @param {Object} pool - Database connection pool
   */
  static async initialize(pool) {
    const client = await pool.connect();
    try {
      // Load active providers from database
      const result = await client.query(`
        SELECT id, provider_type, config, rate_limit_per_minute
        FROM notification_providers
        WHERE is_active = TRUE
      `);

      const providers = {};
      
      for (const row of result.rows) {
        const { provider_type, config, rate_limit_per_minute } = row;
        
        try {
          if (provider_type === 'SENDGRID') {
            providers[provider_type] = new EmailService(config.apiKey);
          } else if (provider_type === 'TWILIO') {
            providers[provider_type] = new SMSService(
              config.accountSid,
              config.authToken,
              config.fromNumber
            );
          } else if (provider_type === 'WHATSAPP') {
            providers[provider_type] = new WhatsAppService(
              config.accountSid,
              config.authToken,
              config.businessPhoneNumberId
            );
          }
        } catch (error) {
          console.error(`Failed to initialize ${provider_type}:`, error.message);
        }
      }

      return new NotificationService(pool, providers);
    } finally {
      client.release();
    }
  }

  /**
   * Send notification with automatic provider selection
   * @param {Object} options - Notification options
   * @param {string} options.channel - Channel type: EMAIL, SMS, WHATSAPP, INTERNAL
   * @param {Object} options.recipient - { email, phone, name }
   * @param {string} options.subject - Subject (for email)
   * @param {string} options.message - Message body
   * @param {Object} options.context - Additional context
   * @param {integer} options.jobId - Database job ID
   * @param {integer} options.userId - User ID for audit
   */
  async sendNotification({
    channel,
    recipient,
    subject,
    message,
    htmlContent,
    context = {},
    jobId,
    userId
  }) {
    const startTime = Date.now();
    let provider = null;
    let result = null;

    try {
      // Select appropriate provider based on channel
      provider = this.selectProvider(channel);
      if (!provider) {
        throw new Error(`No active provider for channel: ${channel}`);
      }

      // Check rate limiting
      await this.checkRateLimit(provider, channel);

      // Send through provider
      result = await this.deliverNotification({
        channel,
        provider,
        recipient,
        subject,
        message,
        htmlContent,
        context
      });

      // Record successful delivery
      await this.recordDelivery({
        jobId,
        provider,
        channel,
        result,
        startTime,
        userId,
        success: result.success
      });

      return result;

    } catch (error) {
      // Record failure
      await this.recordFailure({
        jobId,
        provider,
        channel,
        error,
        startTime,
        userId
      });

      throw error;
    }
  }

  /**
   * Deliver notification through provider
   * @private
   */
  async deliverNotification({
    channel,
    provider,
    recipient,
    subject,
    message,
    htmlContent,
    context
  }) {
    const channelUpper = String(channel || '').toUpperCase();

    if (channelUpper === 'EMAIL') {
      return await provider.sendEmail({
        to: recipient.email,
        from: context.senderEmail || 'noreply@shreenath.local',
        subject,
        htmlContent: htmlContent || this.buildHtmlContent(message),
        textContent: message
      });

    } else if (channelUpper === 'SMS') {
      const formattedPhone = SMSService.formatPhoneNumber(recipient.phone);
      return await provider.sendSMS({
        to: formattedPhone,
        body: this.truncateMessage(message, 160)
      });

    } else if (channelUpper === 'WHATSAPP') {
      const formattedPhone = recipient.phone;
      return await provider.sendWhatsApp({
        to: formattedPhone,
        body: message
      });

    } else if (channelUpper === 'INTERNAL') {
      return {
        success: true,
        provider: 'INTERNAL',
        messageId: `INTERNAL-${Date.now()}`,
        status: 'SENT',
        timestamp: new Date(),
        raw: { recipient, message }
      };

    } else {
      throw new Error(`Unknown channel: ${channel}`);
    }
  }

  /**
   * Select provider for channel
   * @private
   */
  selectProvider(channel) {
    const channelUpper = String(channel || '').toUpperCase();

    if (channelUpper === 'EMAIL') {
      return this.providers['SENDGRID'] || null;
    } else if (channelUpper === 'SMS') {
      return this.providers['TWILIO'] || null;
    } else if (channelUpper === 'WHATSAPP') {
      return this.providers['WHATSAPP'] || null;
    } else if (channelUpper === 'INTERNAL') {
      return {}; // Mock provider for internal
    }

    return null;
  }

  /**
   * Check rate limit for provider
   * @private
   */
  async checkRateLimit(provider, channel) {
    const key = `${provider?.constructor?.name || 'INTERNAL'}_${channel}`;
    
    if (!this.rateLimiters.has(key)) {
      this.rateLimiters.set(key, {
        count: 0,
        window: Date.now()
      });
    }

    const limiter = this.rateLimiters.get(key);
    const now = Date.now();
    const windowDuration = 60000; // 1 minute

    if (now - limiter.window > windowDuration) {
      // Reset window
      limiter.count = 0;
      limiter.window = now;
    }

    // Increment counter
    limiter.count++;

    // Check against limit (default 100/minute per provider)
    if (limiter.count > 100) {
      throw new Error(`Rate limit exceeded for ${channel}`);
    }
  }

  /**
   * Record successful delivery
   * @private
   */
  async recordDelivery({
    jobId,
    provider,
    channel,
    result,
    startTime,
    userId,
    success
  }) {
    const client = await this.pool.connect();
    try {
      const deliveryMs = Date.now() - startTime;

      await client.query('BEGIN');

      // Record delivery log
      await client.query(`
        INSERT INTO notification_delivery_logs (
          job_id, provider_id, channel, status, delivery_time_ms,
          provider_response, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      `, [
        jobId,
        null, // provider_id would come from DB lookup
        channel,
        result.status,
        deliveryMs,
        JSON.stringify(result.raw || {})
      ]);

      // Update job status
      if (success) {
        await client.query(`
          UPDATE notification_jobs
          SET
            status = 'SENT',
            sent_at = NOW(),
            provider_status = 'SENT',
            provider_reference_id = $1,
            attempt_count = attempt_count + 1
          WHERE id = $2
        `, [result.messageId, jobId]);
      } else {
        await client.query(`
          UPDATE notification_jobs
          SET
            status = 'FAILED',
            provider_status = 'FAILED',
            error_code = $1,
            attempt_count = attempt_count + 1,
            retry_count = retry_count + 1,
            last_retry_at = NOW()
          WHERE id = $2
        `, [result.errorCode, jobId]);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Failed to record delivery:', error);
    } finally {
      client.release();
    }
  }

  /**
   * Record failure
   * @private
   */
  async recordFailure({
    jobId,
    provider,
    channel,
    error,
    startTime,
    userId
  }) {
    const client = await this.pool.connect();
    try {
      const deliveryMs = Date.now() - startTime;

      // Record failure
      await client.query(`
        INSERT INTO notification_failures (
          job_id, attempt_number, error_type, error_message, created_at
        ) VALUES ($1, $2, $3, $4, NOW())
      `, [
        jobId,
        1,
        'PROVIDER_ERROR',
        error.message
      ]);

      // Update job with retry schedule
      const nextRetrySeconds = Math.pow(2, 1) * 30; // Exponential backoff
      await client.query(`
        UPDATE notification_jobs
        SET
          status = 'FAILED',
          retry_count = retry_count + 1,
          next_retry_at = NOW() + INTERVAL '1 second' * $1
        WHERE id = $2
      `, [nextRetrySeconds, jobId]);
    } catch (dbError) {
      console.error('Failed to record failure:', dbError);
    } finally {
      client.release();
    }
  }

  /**
   * Retry failed notification
   * @param {integer} jobId - Job ID to retry
   */
  async retryNotification(jobId) {
    const client = await this.pool.connect();
    try {
      // Get job details
      const jobResult = await client.query(`
        SELECT * FROM notification_jobs WHERE id = $1
      `, [jobId]);

      if (jobResult.rows.length === 0) {
        throw new Error(`Job not found: ${jobId}`);
      }

      const job = jobResult.rows[0];

      // Get template
      const templateResult = await client.query(`
        SELECT body, subject FROM notification_templates WHERE id = $1
      `, [job.template_id]);

      if (templateResult.rows.length === 0) {
        throw new Error(`Template not found: ${job.template_id}`);
      }

      const template = templateResult.rows[0];

      // Retry send
      return await this.sendNotification({
        channel: job.channel || 'SMS',
        recipient: {
          email: job.recipient_email,
          phone: job.recipient_phone,
          name: job.recipient_name
        },
        subject: template.subject,
        message: template.body,
        context: job.payload || {},
        jobId,
        userId: null
      });
    } finally {
      client.release();
    }
  }

  /**
   * Get delivery status
   * @param {integer} jobId - Job ID
   */
  async getDeliveryStatus(jobId) {
    const result = await this.pool.query(`
      SELECT
        nj.id,
        nj.job_type,
        nj.status,
        nj.provider_status,
        nj.retry_count,
        nj.sent_at,
        nj.last_error,
        COUNT(ndl.id) as total_attempts,
        COUNT(ndl.id) FILTER (WHERE ndl.status = 'SENT') as successful_attempts
      FROM notification_jobs nj
      LEFT JOIN notification_delivery_logs ndl ON ndl.job_id = nj.id
      WHERE nj.id = $1
      GROUP BY nj.id, nj.job_type, nj.status, nj.provider_status, nj.retry_count, nj.sent_at, nj.last_error
    `, [jobId]);

    return result.rows[0] || null;
  }

  /**
   * Get delivery metrics
   */
  async getDeliveryMetrics({ days = 7, channel = null }) {
    let query = `
      SELECT
        c.channel_type,
        COUNT(ndl.id) as total,
        COUNT(ndl.id) FILTER (WHERE ndl.status = 'SENT') as sent,
        COUNT(ndl.id) FILTER (WHERE ndl.status = 'FAILED') as failed,
        ROUND(100.0 * COUNT(ndl.id) FILTER (WHERE ndl.status = 'SENT') / NULLIF(COUNT(ndl.id), 0), 2) as success_rate,
        ROUND(AVG(ndl.delivery_time_ms)::NUMERIC, 2) as avg_delivery_ms
      FROM notification_channels c
      LEFT JOIN notification_delivery_logs ndl ON ndl.channel = c.channel_type
        AND ndl.created_at > NOW() - INTERVAL '1 day' * $1
    `;

    const params = [days];

    if (channel) {
      query += ` WHERE c.channel_type = $2`;
      params.push(channel);
    }

    query += ` GROUP BY c.channel_type ORDER BY total DESC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  /**
   * Truncate message for SMS
   * @private
   */
  truncateMessage(message, maxLength = 160) {
    if (message.length <= maxLength) {
      return message;
    }
    return message.substring(0, maxLength - 3) + '...';
  }

  /**
   * Build HTML content from plain text
   * @private
   */
  buildHtmlContent(plainText) {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="white-space: pre-wrap; background-color: #f5f5f5; padding: 15px; border-radius: 5px;">
              ${plainText}
            </div>
            <div style="margin-top: 20px; font-size: 12px; color: #999;">
              <p>This is an automated message from Shree-Nath Stock Management System</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }
}

module.exports = NotificationService;

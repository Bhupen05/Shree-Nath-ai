/**
 * Email Notification Service
 * Handles email delivery via SendGrid
 */

const axios = require('axios');

class EmailService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://api.sendgrid.com/v3';
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Send email notification
   * @param {Object} options - Email options
   * @param {string} options.to - Recipient email
   * @param {string} options.from - Sender email
   * @param {string} options.subject - Email subject
   * @param {string} options.htmlContent - HTML email body
   * @param {string} options.textContent - Plain text body
   * @returns {Object} SendGrid response with message ID
   */
  async sendEmail({ to, from, subject, htmlContent, textContent }) {
    try {
      const response = await this.client.post('/mail/send', {
        personalizations: [
          {
            to: [{ email: to }],
            subject
          }
        ],
        from: { email: from },
        content: [
          {
            type: 'text/plain',
            value: textContent || 'See HTML content'
          },
          {
            type: 'text/html',
            value: htmlContent
          }
        ]
      });

      return {
        success: true,
        provider: 'SENDGRID',
        messageId: response.headers['x-message-id'],
        status: 'SENT',
        timestamp: new Date(),
        raw: response.data
      };
    } catch (error) {
      const errorCode = error.response?.status || 'UNKNOWN';
      const errorMessage = error.response?.data?.errors?.[0]?.message || error.message;

      return {
        success: false,
        provider: 'SENDGRID',
        status: 'FAILED',
        errorCode,
        errorMessage,
        timestamp: new Date(),
        raw: error.response?.data || error.message,
        shouldRetry: this.isRetryable(errorCode)
      };
    }
  }

  /**
   * Check if error is retryable
   * @private
   */
  isRetryable(errorCode) {
    const retryableCodes = [408, 429, 500, 502, 503, 504];
    return retryableCodes.includes(parseInt(errorCode));
  }

  /**
   * Validate email address
   * @param {string} email - Email to validate
   * @returns {boolean}
   */
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Get SendGrid account info
   */
  async getAccountInfo() {
    try {
      const response = await this.client.get('/user/account');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = EmailService;

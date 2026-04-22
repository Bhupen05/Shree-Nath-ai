/**
 * WhatsApp Notification Service
 * Handles WhatsApp delivery via Twilio
 */

const twilio = require('twilio');

class WhatsAppService {
  constructor(accountSid, authToken, businessPhoneNumberId) {
    this.accountSid = accountSid;
    this.authToken = authToken;
    this.businessPhoneNumberId = businessPhoneNumberId;
    this.client = twilio(accountSid, authToken);
  }

  /**
   * Send WhatsApp message
   * @param {Object} options - WhatsApp options
   * @param {string} options.to - Recipient WhatsApp phone number
   * @param {string} options.body - Message body
   * @param {string} options.mediaUrl - Optional media URL
   * @returns {Object} Twilio response with message SID
   */
  async sendWhatsApp({ to, body, mediaUrl = null }) {
    try {
      const messagePayload = {
        from: `whatsapp:+${this.businessPhoneNumberId}`,
        body,
        to: this.formatWhatsAppNumber(to)
      };

      // Add media if provided
      if (mediaUrl) {
        messagePayload.mediaUrl = mediaUrl;
      }

      const message = await this.client.messages.create(messagePayload);

      return {
        success: true,
        provider: 'WHATSAPP',
        messageId: message.sid,
        status: message.status,
        timestamp: new Date(),
        raw: {
          sid: message.sid,
          dateCreated: message.dateCreated,
          dateUpdated: message.dateUpdated,
          segments: message.numSegments
        }
      };
    } catch (error) {
      const errorCode = error.code || 'UNKNOWN';
      const errorMessage = error.message;

      return {
        success: false,
        provider: 'WHATSAPP',
        status: 'FAILED',
        errorCode,
        errorMessage,
        timestamp: new Date(),
        raw: error,
        shouldRetry: this.isRetryable(errorCode)
      };
    }
  }

  /**
   * Send WhatsApp template message
   * @param {Object} options - Template options
   * @param {string} options.to - Recipient phone number
   * @param {string} options.template - Template name
   * @param {Array} options.params - Template parameters
   */
  async sendWhatsAppTemplate({ to, template, params = [] }) {
    try {
      const message = await this.client.messages.create({
        from: `whatsapp:+${this.businessPhoneNumberId}`,
        to: this.formatWhatsAppNumber(to),
        contentSid: template,
        contentVariables: JSON.stringify({
          1: params[0] || '',
          2: params[1] || '',
          3: params[2] || ''
        })
      });

      return {
        success: true,
        provider: 'WHATSAPP',
        messageId: message.sid,
        status: message.status,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        provider: 'WHATSAPP',
        status: 'FAILED',
        errorCode: error.code || 'UNKNOWN',
        errorMessage: error.message,
        shouldRetry: this.isRetryable(error.code)
      };
    }
  }

  /**
   * Format WhatsApp number
   * @private
   */
  formatWhatsAppNumber(phoneNumber) {
    // Ensure E.164 format with whatsapp: prefix
    let formatted = phoneNumber.replace(/\D/g, '');
    
    if (!formatted.startsWith('+')) {
      // Assume US number if no country code
      if (formatted.length === 10) {
        formatted = `+1${formatted}`;
      } else if (formatted.length === 11 && formatted.startsWith('1')) {
        formatted = `+${formatted}`;
      } else {
        formatted = `+${formatted}`;
      }
    }
    
    return `whatsapp:${formatted}`;
  }

  /**
   * Check if error is retryable
   * @private
   */
  isRetryable(errorCode) {
    const nonRetryableCodes = [
      21211, // Invalid phone number
      21601, // Missing required parameter
      21609, // Cannot send to region
      21619  // Resource not found
    ];
    
    return !nonRetryableCodes.includes(errorCode);
  }

  /**
   * Validate WhatsApp phone number
   * @param {string} phoneNumber - Phone to validate
   * @returns {boolean}
   */
  static isValidPhoneNumber(phoneNumber) {
    const cleaned = phoneNumber.replace(/\D/g, '');
    return cleaned.length >= 7 && cleaned.length <= 15;
  }

  /**
   * Get provider account info
   */
  async getAccountInfo() {
    try {
      const account = await this.client.api.accounts(this.accountSid).fetch();
      return {
        success: true,
        data: {
          businessPhoneNumberId: this.businessPhoneNumberId,
          status: account.status
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = WhatsAppService;

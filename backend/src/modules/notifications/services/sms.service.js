/**
 * SMS Notification Service
 * Handles SMS delivery via Twilio
 */

const twilio = require('twilio');

class SMSService {
  constructor(accountSid, authToken, fromNumber) {
    this.accountSid = accountSid;
    this.authToken = authToken;
    this.fromNumber = fromNumber;
    this.client = twilio(accountSid, authToken);
  }

  /**
   * Send SMS notification
   * @param {Object} options - SMS options
   * @param {string} options.to - Recipient phone number
   * @param {string} options.body - SMS message body
   * @returns {Object} Twilio response with message SID
   */
  async sendSMS({ to, body }) {
    try {
      const message = await this.client.messages.create({
        body,
        from: this.fromNumber,
        to
      });

      return {
        success: true,
        provider: 'TWILIO',
        messageId: message.sid,
        status: message.status,
        timestamp: new Date(),
        raw: {
          sid: message.sid,
          dateCreated: message.dateCreated,
          dateUpdated: message.dateUpdated,
          price: message.price,
          priceUnit: message.priceUnit,
          segments: message.numSegments
        }
      };
    } catch (error) {
      const errorCode = error.code || 'UNKNOWN';
      const errorMessage = error.message;

      return {
        success: false,
        provider: 'TWILIO',
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
   * Check if error is retryable
   * @private
   */
  isRetryable(errorCode) {
    // Twilio error codes that are retryable
    const retryableCodes = [
      21211, // Invalid phone number
      21601, // Missing required parameter
      21609  // Cannot send to region
    ];
    
    // Retryable if it's a network error or server error
    return !retryableCodes.includes(errorCode) && (
      errorCode >= 50000 || // Server errors
      errorCode === 'ECONNREFUSED' ||
      errorCode === 'ETIMEDOUT'
    );
  }

  /**
   * Validate phone number format
   * @param {string} phoneNumber - Phone to validate
   * @returns {boolean}
   */
  static isValidPhoneNumber(phoneNumber) {
    // E.164 format validation
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phoneNumber.replace(/\D/g, ''));
  }

  /**
   * Format phone number to E.164 format
   * @param {string} phoneNumber - Phone number
   * @param {string} countryCode - Country code (default: +1 for US)
   * @returns {string} Formatted phone number
   */
  static formatPhoneNumber(phoneNumber, countryCode = '+1') {
    const digits = phoneNumber.replace(/\D/g, '');
    
    // If already has country code, return as-is
    if (phoneNumber.startsWith('+')) {
      return phoneNumber;
    }
    
    // Add country code if missing
    if (digits.length === 10) {
      return `${countryCode}${digits}`;
    }
    
    return `+${digits}`;
  }

  /**
   * Get Twilio account balance info
   */
  async getAccountInfo() {
    try {
      const account = await this.client.api.accounts(this.accountSid).fetch();
      return {
        success: true,
        data: {
          accountSid: account.sid,
          status: account.status,
          balance: account.balance,
          type: account.type
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check if number is blacklisted (opt-out)
   * @param {string} phoneNumber - Phone number to check
   */
  async isBlacklisted(phoneNumber) {
    // This would require additional Twilio API calls or external service
    // For now, return false - can be extended
    return false;
  }
}

module.exports = SMSService;

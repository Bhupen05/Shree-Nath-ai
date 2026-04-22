/**
 * Voice Response Service
 * Generates voice responses using text-to-speech
 */

const axios = require('axios');

class VoiceResponseService {
  constructor(openaiApiKey) {
    this.apiKey = openaiApiKey;
    this.baseURL = 'https://api.openai.com/v1';
    this.voiceOptions = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`
      }
    });
  }

  /**
   * Generate voice response from text
   * @param {Object} options - Generation options
   * @param {string} options.text - Text to convert to speech
   * @param {string} options.voice - Voice option (alloy, echo, fable, onyx, nova, shimmer)
   * @param {string} options.speed - Speech speed (0.25 to 4.0, default 1.0)
   */
  async generateVoiceResponse({ text, voice = 'nova', speed = 1.0 }) {
    try {
      if (!this.voiceOptions.includes(voice)) {
        voice = 'nova';
      }

      const response = await this.client.post(
        '/audio/speech',
        {
          model: 'tts-1',
          input: text,
          voice: voice,
          speed: Math.min(Math.max(speed, 0.25), 4.0) // Clamp between 0.25 and 4.0
        },
        {
          responseType: 'arraybuffer',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );

      return {
        success: true,
        audioBuffer: response.data,
        voice,
        speed,
        mimeType: 'audio/mpeg',
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        errorCode: error.response?.status || 'UNKNOWN'
      };
    }
  }

  /**
   * Generate voice response from intent
   * @param {Object} options - Generation options
   * @param {string} options.intent - Intent type
   * @param {Object} options.data - Data for response
   * @param {string} options.voice - Voice option
   */
  async generateIntentResponse({ intent, data = {}, voice = 'nova' }) {
    const responseTemplate = this.getResponseTemplate(intent, data);

    return this.generateVoiceResponse({
      text: responseTemplate,
      voice,
      speed: 1.0
    });
  }

  /**
   * Get response template for intent
   * @private
   */
  getResponseTemplate(intent, data) {
    const templates = {
      'PART_LOOKUP': () => `We found ${data.partName || 'that part'}. It is ${data.description || 'available'}. Would you like more information?`,
      'STOCK_CHECK': () => `We currently have ${data.quantity || 'some'} units of ${data.partName || 'that item'} in stock.`,
      'PRICE_INQUIRY': () => `The price for ${data.partName || 'that item'} is ${data.price || 'available upon request'}. Is there anything else?`,
      'ORDER_STATUS': () => `Your order ${data.orderNumber || 'number'} is ${data.status || 'being processed'}. Estimated delivery is ${data.deliveryDate || 'soon'}.`,
      'PAYMENT_REMINDER': () => `We have a payment due for ${data.amount || 'your account'}. Please let us know if you need more time.`,
      'DEMAND_LOG': () => `Thank you for logging a demand for ${data.partName || 'that item'}. We will keep this in record and notify you when available.`,
      'GENERAL_INQUIRY': () => `${data.response || 'I can help you with information about our products and services.'}`,
      'FEEDBACK': () => `Thank you for your feedback. We appreciate your input and will use it to improve our service.`,
      'COMPLAINT': () => `We apologize for the inconvenience. A supervisor will be contacting you shortly to resolve this matter.`,
      'NONE': () => `I didn't quite understand that. Could you please repeat your request?`
    };

    const templateFunc = templates[intent] || templates['NONE'];
    return templateFunc();
  }

  /**
   * Create fallback response
   * @param {Object} options - Options
   * @param {string} options.reason - Reason for fallback
   * @param {string} options.voice - Voice option
   */
  async createFallbackResponse({ reason, voice = 'nova' }) {
    const fallbackMessages = {
      'ERROR': 'I apologize, we experienced a technical issue. Please try again later.',
      'NO_INTENT': 'I didn\'t understand your request. Please try again.',
      'NO_MATCH': 'I couldn\'t find what you\'re looking for. Would you like to speak with an agent?',
      'SYSTEM_BUSY': 'Our system is temporarily busy. Please try again in a moment.',
      'TIMEOUT': 'I did not receive a response. Please try again.',
      'ESCALATED': 'I am connecting you with a representative who can better assist you.'
    };

    const message = fallbackMessages[reason] || fallbackMessages['ERROR'];

    return this.generateVoiceResponse({
      text: message,
      voice
    });
  }

  /**
   * Create hold message
   * @param {Object} options - Options
   * @param {string} options.message - Hold message
   * @param {string} options.voice - Voice option
   */
  async createHoldMessage({ message, voice = 'nova' }) {
    return this.generateVoiceResponse({
      text: message || 'Thank you for holding. A representative will be with you shortly.',
      voice
    });
  }

  /**
   * Get available voices
   */
  getAvailableVoices() {
    return [
      { name: 'alloy', gender: 'NEUTRAL', description: 'Clear and professional' },
      { name: 'echo', gender: 'MALE', description: 'Deep and resonant' },
      { name: 'fable', gender: 'MALE', description: 'Warm and friendly' },
      { name: 'onyx', gender: 'MALE', description: 'Rich and authoritative' },
      { name: 'nova', gender: 'FEMALE', description: 'Bright and engaging' },
      { name: 'shimmer', gender: 'FEMALE', description: 'Soft and soothing' }
    ];
  }

  /**
   * Validate response text
   * @param {string} text - Text to validate
   */
  static isValidResponseText(text) {
    // Check length (API limit is 4096 characters)
    if (!text || text.length === 0 || text.length > 4096) {
      return false;
    }

    // Check for valid characters
    return /^[\w\s\d.,'!?\-():;\/&%@#$+="<>*~`^\[\]{}]+$/.test(text);
  }

  /**
   * Get estimated generation time
   * @param {string} text - Text to generate
   */
  static estimateGenerationTime(text) {
    // Rough estimate: ~0.15 seconds per word
    const wordCount = text.split(/\s+/).length;
    return Math.max(1, Math.round(wordCount * 0.15));
  }

  /**
   * Create confirmation message
   * @param {string} action - Action being confirmed
   * @param {string} voice - Voice option
   */
  async createConfirmationMessage(action, voice = 'nova') {
    const message = `Confirmed. ${action}`;
    return this.generateVoiceResponse({
      text: message,
      voice
    });
  }

  /**
   * Create error message
   * @param {string} errorType - Type of error
   * @param {string} voice - Voice option
   */
  async createErrorMessage(errorType, voice = 'nova') {
    const messages = {
      'INVALID_INPUT': 'That input was not valid. Please try again.',
      'SYSTEM_ERROR': 'A system error occurred. Please try again later.',
      'TIMEOUT': 'The request timed out. Please try again.',
      'PERMISSION_DENIED': 'You do not have permission for that action.',
      'NOT_FOUND': 'That information could not be found. Please try again.'
    };

    const message = messages[errorType] || messages['SYSTEM_ERROR'];
    return this.generateVoiceResponse({
      text: message,
      voice
    });
  }
}

module.exports = VoiceResponseService;

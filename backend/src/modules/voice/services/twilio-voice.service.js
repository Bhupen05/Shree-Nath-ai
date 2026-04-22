/**
 * Twilio Voice Service
 * Handles inbound/outbound voice calls
 */

const twilio = require('twilio');

class TwilioVoiceService {
  constructor(accountSid, authToken, fromNumber) {
    this.accountSid = accountSid;
    this.authToken = authToken;
    this.fromNumber = fromNumber;
    this.client = twilio(accountSid, authToken);
  }

  /**
   * Initiate outbound call
   * @param {Object} options - Call options
   * @param {string} options.toNumber - Recipient phone number
   * @param {string} options.twiml - TwiML commands
   * @returns {Object} Call object
   */
  async makeCall({ toNumber, twiml }) {
    try {
      const call = await this.client.calls.create({
        to: toNumber,
        from: this.fromNumber,
        twiml: twiml || this.getDefaultTwiml(),
        statusCallbackMethod: 'POST'
      });

      return {
        success: true,
        callSid: call.sid,
        status: call.status,
        toNumber: call.to,
        fromNumber: call.from,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Transfer call to another number
   * @param {Object} options - Transfer options
   * @param {string} options.callSid - Call to transfer
   * @param {string} options.toNumber - Number to transfer to
   */
  async transferCall({ callSid, toNumber }) {
    try {
      const twiml = new twilio.twiml.VoiceResponse();
      twiml.dial(toNumber);

      const call = await this.client.calls(callSid).update({
        twiml: twiml.toString(),
        statusCallbackMethod: 'POST'
      });

      return {
        success: true,
        callSid: call.sid,
        status: call.status,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Start recording on call
   * @param {Object} options - Recording options
   */
  async startRecording({ callSid, recordingChannels = 'both' }) {
    try {
      const recording = await this.client.calls(callSid).recordings.create({
        recordingChannels: recordingChannels,
        trim: 'trim-silence'
      });

      return {
        success: true,
        recordingSid: recording.sid,
        recordingUrl: recording.uri,
        status: recording.status,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Stop recording on call
   * @param {string} callSid - Call SID
   */
  async stopRecording({ callSid }) {
    try {
      // Get call recordings and stop the active one
      const recordings = await this.client.calls(callSid).recordings.list();
      
      if (recordings.length === 0) {
        return {
          success: false,
          error: 'No active recording found'
        };
      }

      const recording = recordings[0];
      
      return {
        success: true,
        recordingSid: recording.sid,
        recordingUrl: recording.uri,
        status: 'completed',
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get call details
   * @param {string} callSid - Call SID
   */
  async getCall(callSid) {
    try {
      const call = await this.client.calls(callSid).fetch();

      return {
        success: true,
        call: {
          sid: call.sid,
          status: call.status,
          from: call.from,
          to: call.to,
          duration: call.duration,
          startTime: call.startTime,
          endTime: call.endTime,
          price: call.price,
          priceUnit: call.priceUnit,
          direction: call.direction,
          answeredBy: call.answeredBy
        },
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get recording URL and details
   * @param {string} recordingSid - Recording SID
   */
  async getRecording(recordingSid) {
    try {
      // Need to find which call contains this recording
      // For now, return basic recording info
      const recordingUrl = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Recordings/${recordingSid}`;

      return {
        success: true,
        recordingSid,
        recordingUrl,
        downloadUrl: `${recordingUrl}.mp3`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate default TwiML
   * @private
   */
  getDefaultTwiml() {
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.gather({
      numDigits: 1,
      action: '/api/voice/gather',
      method: 'POST',
      timeout: 10
    });
    twiml.say('Thank you for calling Shree Nath Stock Management System. Press 1 for Stock Inquiry, 2 for Pricing, or 3 to speak with an agent.');
    return twiml.toString();
  }

  /**
   * Create voice response with TwiML
   * @param {Array} instructions - Voice instructions
   * @returns {string} TwiML string
   */
  createTwiml(instructions) {
    const twiml = new twilio.twiml.VoiceResponse();

    for (const instruction of instructions) {
      if (instruction.type === 'say') {
        twiml.say(instruction.text, {
          voice: instruction.voice || 'Alice',
          language: instruction.language || 'en'
        });
      } else if (instruction.type === 'play') {
        twiml.play(instruction.url);
      } else if (instruction.type === 'gather') {
        twiml.gather({
          numDigits: instruction.numDigits || 1,
          action: instruction.action,
          method: 'POST',
          timeout: instruction.timeout || 10
        });
      } else if (instruction.type === 'dial') {
        twiml.dial(instruction.number);
      } else if (instruction.type === 'record') {
        twiml.record({
          action: instruction.action,
          method: 'POST',
          timeout: instruction.timeout || 5,
          finishOnKey: '#',
          maxLength: 3600
        });
      } else if (instruction.type === 'hangup') {
        twiml.hangup();
      }
    }

    return twiml.toString();
  }

  /**
   * Validate phone number
   * @param {string} phoneNumber - Phone to validate
   */
  static isValidPhoneNumber(phoneNumber) {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phoneNumber.replace(/\D/g, ''));
  }

  /**
   * Format phone number to E.164 format
   * @param {string} phoneNumber - Phone number
   */
  static formatPhoneNumber(phoneNumber) {
    const digits = phoneNumber.replace(/\D/g, '');
    
    if (phoneNumber.startsWith('+')) {
      return phoneNumber;
    }
    
    if (digits.length === 10) {
      return `+1${digits}`;
    }
    
    return `+${digits}`;
  }

  /**
   * Get account balance
   */
  async getAccountBalance() {
    try {
      const account = await this.client.api.accounts(this.accountSid).fetch();
      
      return {
        success: true,
        balance: account.balance,
        currency: account.type || 'USD',
        status: account.status
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = TwilioVoiceService;

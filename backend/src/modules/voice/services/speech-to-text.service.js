/**
 * Speech-to-Text Service
 * Handles audio transcription via OpenAI Whisper API
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

class SpeechToTextService {
  constructor(apiKey, model = 'whisper-1') {
    this.apiKey = apiKey;
    this.model = model;
    this.baseURL = 'https://api.openai.com/v1';
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
  }

  /**
   * Transcribe audio file
   * @param {Object} options - Transcription options
   * @param {Buffer|string} options.audio - Audio buffer or file path
   * @param {string} options.language - Language code (optional)
   * @param {string} options.prompt - Prompt for context (optional)
   * @returns {Object} Transcription result
   */
  async transcribeAudio({ audio, language = 'en', prompt = '' }) {
    try {
      const formData = new FormData();

      // Handle buffer or file path
      if (Buffer.isBuffer(audio)) {
        formData.append('file', audio, 'audio.mp3');
      } else if (typeof audio === 'string') {
        if (audio.startsWith('http')) {
          // Download from URL
          const response = await axios.get(audio, { responseType: 'arraybuffer' });
          formData.append('file', response.data, 'audio.mp3');
        } else {
          // Local file path
          formData.append('file', fs.createReadStream(audio));
        }
      }

      formData.append('model', this.model);
      formData.append('language', language);
      
      if (prompt) {
        formData.append('prompt', prompt);
      }

      // Enable timestamps for word-level detail
      formData.append('response_format', 'verbose_json');

      const response = await axios.post('/audio/transcriptions', formData, {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${this.apiKey}`
        },
        baseURL: this.baseURL
      });

      return {
        success: true,
        provider: 'WHISPER',
        text: response.data.text,
        language: language,
        duration: response.data.duration,
        confidence: response.data.confidence || 0.95,
        segments: response.data.segments || [],
        model: this.model,
        timestamp: new Date(),
        raw: response.data
      };
    } catch (error) {
      return {
        success: false,
        provider: 'WHISPER',
        error: error.message,
        errorCode: error.response?.status || 'UNKNOWN',
        timestamp: new Date()
      };
    }
  }

  /**
   * Transcribe from audio URL
   * @param {Object} options - Options
   * @param {string} options.audioUrl - URL to audio file
   * @param {string} options.language - Language code
   */
  async transcribeFromUrl({ audioUrl, language = 'en' }) {
    return this.transcribeAudio({ audio: audioUrl, language });
  }

  /**
   * Transcribe from file path
   * @param {Object} options - Options
   * @param {string} options.filePath - Local file path
   * @param {string} options.language - Language code
   */
  async transcribeFromFile({ filePath, language = 'en' }) {
    return this.transcribeAudio({ audio: filePath, language });
  }

  /**
   * Transcribe from buffer
   * @param {Buffer} audioBuffer - Audio buffer
   * @param {string} language - Language code
   */
  async transcribeFromBuffer(audioBuffer, language = 'en') {
    return this.transcribeAudio({ audio: audioBuffer, language });
  }

  /**
   * Get supported languages
   */
  static getSupportedLanguages() {
    return {
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese',
      'ru': 'Russian',
      'zh': 'Chinese',
      'ja': 'Japanese',
      'ko': 'Korean',
      'hi': 'Hindi',
      'ar': 'Arabic'
    };
  }

  /**
   * Extract key phrases from transcript
   * @param {string} text - Transcript text
   */
  static extractKeyPhrases(text) {
    const phrases = [];
    
    // Extract numbers (quantities, prices)
    const numbers = text.match(/\b\d+(?:\.\d+)?\b/g) || [];
    phrases.push(...numbers.map(n => ({ type: 'NUMBER', value: n })));

    // Extract currency amounts
    const currency = text.match(/\$?\d+(?:\.\d+)?/g) || [];
    phrases.push(...currency.map(c => ({ type: 'AMOUNT', value: c })));

    // Extract common part indicators
    const partPatterns = [
      /\b(?:part|component|item)\s+(?:number|#|id)?\s*:?\s*([A-Z0-9\-]+)/gi,
      /\b(?:SKU|model)\s*:?\s*([A-Z0-9\-]+)/gi
    ];

    for (const pattern of partPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        phrases.push({ type: 'PART_ID', value: match[1] });
      }
    }

    return phrases;
  }

  /**
   * Calculate transcription confidence
   * @param {Object} transcriptionData - Transcription result
   */
  static calculateConfidence(transcriptionData) {
    if (!transcriptionData.segments || transcriptionData.segments.length === 0) {
      return 0.95; // Default high confidence if no segments
    }

    const avgConfidence = transcriptionData.segments.reduce((sum, seg) => {
      return sum + (seg.confidence || 0.9);
    }, 0) / transcriptionData.segments.length;

    return Math.min(avgConfidence, 1.0);
  }

  /**
   * Validate audio file
   * @param {Buffer} audioBuffer - Audio buffer
   */
  static isValidAudioFile(audioBuffer) {
    // Check for common audio file signatures
    const mp3Sig = Buffer.from([0xff, 0xfb]); // MP3
    const wavSig = Buffer.from([0x52, 0x49, 0x46, 0x46]); // WAV
    const m4aSig = Buffer.from([0x66, 0x74, 0x79, 0x70]); // M4A

    return audioBuffer.length > 4 && (
      audioBuffer.slice(0, 2).equals(mp3Sig) ||
      audioBuffer.slice(0, 4).equals(wavSig) ||
      audioBuffer.slice(4, 8).equals(m4aSig)
    );
  }

  /**
   * Get audio duration in seconds
   * @param {Buffer} audioBuffer - Audio buffer
   */
  static getAudioDuration(audioBuffer) {
    // Approximate calculation (requires actual audio parsing for accuracy)
    // For now, estimate based on MP3 bitrate
    const bitrate = 128; // kbps
    const fileSizeKb = audioBuffer.length / 1024;
    const durationSeconds = (fileSizeKb * 8) / bitrate;
    
    return Math.round(durationSeconds);
  }
}

module.exports = SpeechToTextService;

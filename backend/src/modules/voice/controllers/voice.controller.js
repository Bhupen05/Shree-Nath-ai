/**
 * Voice Controller
 * Handles voice call endpoints
 */

const TwilioVoiceService = require('./services/twilio-voice.service');
const SpeechToTextService = require('./services/speech-to-text.service');
const VoiceIntentService = require('./services/voice-intent.service');
const VoiceResponseService = require('./services/voice-response.service');
const VoiceGuardrailsService = require('./services/voice-guardrails.service');

class VoiceController {
  constructor(pool, config) {
    this.pool = pool;
    this.config = config;
    this.twilioService = new TwilioVoiceService(
      config.twilio.accountSid,
      config.twilio.authToken,
      config.twilio.fromNumber
    );
    this.sttService = new SpeechToTextService(config.openai.apiKey);
    this.intentService = new VoiceIntentService(config.openai.apiKey);
    this.responseService = new VoiceResponseService(config.openai.apiKey);
    this.guardrailsService = new VoiceGuardrailsService(pool);
  }

  /**
   * Handle inbound call
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async handleInboundCall(req, res) {
    try {
      const { From, To, CallSid, AccountSid } = req.body;

      // Log call
      const callResult = await this.pool.query(`
        INSERT INTO voice_calls (
          call_type, direction, from_number, to_number, twilio_call_sid,
          twilio_account_sid, status, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NULL)
        RETURNING id, twilio_call_sid
      `, ['INBOUND', 'INCOMING', From, To, CallSid, AccountSid, 'INITIATED']);

      const callId = callResult.rows[0].id;

      // Start recording
      await this.twilioService.startRecording({ callSid: CallSid });

      // Create TwiML for greeting and gather
      const twiml = this.twilioService.createTwiml([
        {
          type: 'say',
          text: 'Welcome to Shree Nath Stock Management System. Please hold while we connect you.',
          voice: 'Alice',
          language: 'en'
        },
        {
          type: 'record',
          action: '/api/voice/transcribe',
          method: 'POST',
          timeout: 10,
          finishOnKey: '#',
          maxLength: 60
        }
      ]);

      res.type('application/xml');
      res.send(twiml);

      // Update call status
      await this.pool.query(
        'UPDATE voice_calls SET status = $1 WHERE id = $2',
        ['CONNECTED', callId]
      );
    } catch (error) {
      console.error('Error handling inbound call:', error);
      res.status(500).json({ error: 'Failed to handle inbound call' });
    }
  }

  /**
   * Handle call transcription
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async handleTranscription(req, res) {
    try {
      const { CallSid, RecordingUrl, CallDuration } = req.body;

      // Get call ID from database
      const callResult = await this.pool.query(
        'SELECT id FROM voice_calls WHERE twilio_call_sid = $1',
        [CallSid]
      );

      if (callResult.rows.length === 0) {
        return res.status(404).json({ error: 'Call not found' });
      }

      const callId = callResult.rows[0].id;

      // Download and transcribe audio
      const transcriptionResult = await this.sttService.transcribeFromUrl({
        audioUrl: RecordingUrl,
        language: 'en'
      });

      if (!transcriptionResult.success) {
        return res.status(400).json({ error: 'Transcription failed' });
      }

      // Store transcription
      const transcript = transcriptionResult.text;
      const transcriptResult = await this.pool.query(`
        INSERT INTO voice_transcriptions (
          call_id, transcript_text, transcript_confidence,
          transcription_provider, duration_seconds
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, [
        callId,
        transcript,
        transcriptionResult.confidence,
        'WHISPER',
        CallDuration
      ]);

      const transcriptionId = transcriptResult.rows[0].id;

      // Check guardrails
      const violations = await this.guardrailsService.checkTranscriptGuardrails(transcript, 'INBOUND');
      
      if (violations.length > 0 && violations[0].actionRequired === 'BLOCK') {
        // Block and record violation
        for (const violation of violations) {
          await this.guardrailsService.recordViolation(callId, violation.guardrailId, violation);
        }
        
        return res.json({
          success: true,
          blocked: true,
          reason: violations[0].violationType
        });
      }

      // Classify intent
      const intentResult = await this.intentService.classifyIntent(transcript);

      if (!intentResult.success) {
        return res.status(400).json({ error: 'Intent classification failed' });
      }

      // Store intent
      const intent = VoiceIntentService.mapIntentType(intentResult.intentType);
      const intentDbResult = await this.pool.query(`
        INSERT INTO voice_intents (
          call_id, transcription_id, intent_type, intent_confidence,
          primary_entity, classification_model, model_version
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `, [
        callId,
        transcriptionId,
        intent,
        intentResult.confidence,
        intentResult.primaryEntity,
        'GPT-4O',
        '2024-04-01'
      ]);

      const intentId = intentDbResult.rows[0].id;

      // Extract and store entities
      const entityResult = await this.intentService.extractEntities(transcript, intent);
      
      if (entityResult.success) {
        for (const entity of entityResult.entities) {
          await this.pool.query(`
            INSERT INTO voice_entities (intent_id, entity_type, entity_value)
            VALUES ($1, $2, $3)
          `, [intentId, entity.type, entity.value]);
        }
      }

      // Generate response
      const responseResult = await this.intentService.generateResponse(intent, entityResult.entities);

      if (!responseResult.success) {
        return res.status(400).json({ error: 'Response generation failed' });
      }

      // Generate voice response
      const voiceResult = await this.responseService.generateVoiceResponse({
        text: responseResult.responseText,
        voice: 'nova'
      });

      // Store response
      await this.pool.query(`
        INSERT INTO voice_responses (
          call_id, intent_id, response_type, response_text,
          response_audio_url, is_template_based
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        callId,
        intentId,
        'VOICE',
        responseResult.responseText,
        null, // Audio URL would be uploaded to storage
        false
      ]);

      res.json({
        success: true,
        callId,
        transcript,
        intent,
        response: responseResult.responseText,
        audioAvailable: voiceResult.success
      });
    } catch (error) {
      console.error('Error handling transcription:', error);
      res.status(500).json({ error: 'Failed to process transcription' });
    }
  }

  /**
   * Make outbound call
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async makeOutboundCall(req, res) {
    try {
      const { toNumber, message, voice = 'nova' } = req.body;

      // Validate phone number
      if (!TwilioVoiceService.isValidPhoneNumber(toNumber)) {
        return res.status(400).json({ error: 'Invalid phone number' });
      }

      // Log call
      const callResult = await this.pool.query(`
        INSERT INTO voice_calls (
          call_type, direction, from_number, to_number, status
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, [
        'OUTBOUND',
        'OUTGOING',
        this.config.twilio.fromNumber,
        toNumber,
        'INITIATED'
      ]);

      const callId = callResult.rows[0].id;

      // Generate voice response
      const voiceResult = await this.responseService.generateVoiceResponse({
        text: message,
        voice
      });

      if (!voiceResult.success) {
        return res.status(400).json({ error: 'Failed to generate voice message' });
      }

      // Create TwiML
      const twiml = this.twilioService.createTwiml([
        {
          type: 'say',
          text: message,
          voice,
          language: 'en'
        }
      ]);

      // Make call
      const twilio Result = await this.twilioService.makeCall({
        toNumber: TwilioVoiceService.formatPhoneNumber(toNumber),
        twiml
      });

      if (!twilioResult.success) {
        return res.status(400).json({ error: twilioResult.error });
      }

      // Update call with Twilio SID
      await this.pool.query(
        'UPDATE voice_calls SET twilio_call_sid = $1, status = $2 WHERE id = $3',
        [twilioResult.callSid, 'INITIATED', callId]
      );

      res.json({
        success: true,
        callId,
        callSid: twilioResult.callSid,
        status: twilioResult.status
      });
    } catch (error) {
      console.error('Error making outbound call:', error);
      res.status(500).json({ error: 'Failed to make outbound call' });
    }
  }

  /**
   * Get call details
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async getCallDetails(req, res) {
    try {
      const { callId } = req.params;

      const result = await this.pool.query(`
        SELECT
          vc.*,
          vt.transcript_text,
          vt.transcript_confidence,
          vi.intent_type,
          vi.intent_confidence,
          COUNT(ve.id) as entity_count
        FROM voice_calls vc
        LEFT JOIN voice_transcriptions vt ON vt.call_id = vc.id
        LEFT JOIN voice_intents vi ON vi.call_id = vc.id
        LEFT JOIN voice_entities ve ON ve.intent_id = vi.id
        WHERE vc.id = $1
        GROUP BY vc.id, vt.id, vi.id
      `, [callId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Call not found' });
      }

      res.json({
        success: true,
        call: result.rows[0]
      });
    } catch (error) {
      console.error('Error getting call details:', error);
      res.status(500).json({ error: 'Failed to get call details' });
    }
  }

  /**
   * Get call history
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async getCallHistory(req, res) {
    try {
      const { limit = 50, offset = 0 } = req.query;

      const result = await this.pool.query(`
        SELECT
          vc.id,
          vc.from_number,
          vc.to_number,
          vc.call_type,
          vc.status,
          vc.duration_seconds,
          vt.transcript_text,
          vi.intent_type,
          vc.started_at,
          vc.created_at
        FROM voice_calls vc
        LEFT JOIN voice_transcriptions vt ON vt.call_id = vc.id
        LEFT JOIN voice_intents vi ON vi.call_id = vc.id
        ORDER BY vc.created_at DESC
        LIMIT $1 OFFSET $2
      `, [limit, offset]);

      res.json({
        success: true,
        calls: result.rows,
        count: result.rows.length
      });
    } catch (error) {
      console.error('Error getting call history:', error);
      res.status(500).json({ error: 'Failed to get call history' });
    }
  }

  /**
   * Get voice analytics
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async getVoiceAnalytics(req, res) {
    try {
      const { days = 7 } = req.query;

      const result = await this.pool.query(`
        SELECT
          DATE(vc.started_at) as call_date,
          COUNT(*) as total_calls,
          COUNT(*) FILTER (WHERE vc.status = 'COMPLETED') as completed_calls,
          ROUND(100.0 * COUNT(*) FILTER (WHERE vc.status = 'COMPLETED') / NULLIF(COUNT(*), 0), 2) as completion_rate,
          COUNT(DISTINCT vi.intent_type) as unique_intents,
          ROUND(AVG(vi.intent_confidence)::NUMERIC, 3) as avg_intent_confidence
        FROM voice_calls vc
        LEFT JOIN voice_intents vi ON vi.call_id = vc.id
        WHERE vc.started_at > NOW() - INTERVAL '1 day' * $1
        GROUP BY DATE(vc.started_at)
        ORDER BY call_date DESC
      `, [days]);

      res.json({
        success: true,
        analytics: result.rows
      });
    } catch (error) {
      console.error('Error getting voice analytics:', error);
      res.status(500).json({ error: 'Failed to get voice analytics' });
    }
  }
}

module.exports = VoiceController;

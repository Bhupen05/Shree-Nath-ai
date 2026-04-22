/**
 * Voice Routes
 * Defines API endpoints for voice operations
 */

const express = require('express');
const VoiceController = require('../controllers/voice.controller');
const { verifyToken } = require('../../../lib/permission');
const { validateRequest } = require('../../../middleware/validation');

module.exports = function(pool, config) {
  const router = express.Router();
  const voiceController = new VoiceController(pool, config);

  // ==========================================
  // PUBLIC ROUTES (Twilio Webhooks)
  // ==========================================

  /**
   * POST /api/voice/inbound
   * Handle inbound call
   * Twilio webhook endpoint
   */
  router.post('/inbound', (req, res) => voiceController.handleInboundCall(req, res));

  /**
   * POST /api/voice/transcribe
   * Process call transcription and intent
   * Twilio webhook endpoint
   */
  router.post('/transcribe', (req, res) => voiceController.handleTranscription(req, res));

  // ==========================================
  // PROTECTED ROUTES
  // ==========================================

  /**
   * POST /api/voice/call
   * Make outbound call
   * Requires: token, VOICE_MANAGE permission
   */
  router.post('/call', verifyToken, validateRequest('makeOutboundCall'), (req, res) => {
    voiceController.makeOutboundCall(req, res);
  });

  /**
   * GET /api/voice/calls/:callId
   * Get call details
   * Requires: token
   */
  router.get('/calls/:callId', verifyToken, (req, res) => {
    voiceController.getCallDetails(req, res);
  });

  /**
   * GET /api/voice/history
   * Get call history
   * Requires: token
   * Query params:
   *   - limit: 50 (default)
   *   - offset: 0 (default)
   */
  router.get('/history', verifyToken, (req, res) => {
    voiceController.getCallHistory(req, res);
  });

  /**
   * GET /api/voice/analytics
   * Get voice analytics
   * Requires: token
   * Query params:
   *   - days: 7 (default)
   */
  router.get('/analytics', verifyToken, (req, res) => {
    voiceController.getVoiceAnalytics(req, res);
  });

  // ==========================================
  // ERROR HANDLING
  // ==========================================

  router.use((error, req, res, next) => {
    console.error('Voice API Error:', error);
    res.status(error.status || 500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  });

  return router;
};

/**
 * PHASE 8: Voice AI Agent System Database Migration
 * 
 * Implements voice call handling, transcription, and AI-powered intent classification
 * - Inbound/outbound call tracking
 * - Transcription storage
 * - Intent classification and extraction
 * - Voice response templates
 * - Call analytics and quality metrics
 */

-- ==========================================
-- VOICE CALL LOGS TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS voice_calls (
  id SERIAL PRIMARY KEY,
  call_type VARCHAR(20) NOT NULL, -- INBOUND, OUTBOUND
  direction VARCHAR(20) NOT NULL, -- INCOMING, OUTGOING
  from_number VARCHAR(30) NOT NULL,
  to_number VARCHAR(30) NOT NULL,
  caller_id VARCHAR(100),
  caller_name VARCHAR(100),
  twilio_call_sid VARCHAR(100) UNIQUE,
  twilio_account_sid VARCHAR(100),
  status VARCHAR(50) NOT NULL, -- INITIATED, RINGING, CONNECTED, COMPLETED, FAILED, CANCELLED
  status_reason VARCHAR(255),
  duration_seconds INTEGER,
  recording_url VARCHAR(500),
  recording_sid VARCHAR(100),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  connected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by INTEGER REFERENCES users(id),
  CHECK (call_type IN ('INBOUND', 'OUTBOUND')),
  CHECK (direction IN ('INCOMING', 'OUTGOING')),
  CHECK (status IN ('INITIATED', 'RINGING', 'CONNECTED', 'COMPLETED', 'FAILED', 'CANCELLED'))
);

-- ==========================================
-- VOICE TRANSCRIPTION TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS voice_transcriptions (
  id SERIAL PRIMARY KEY,
  call_id INTEGER NOT NULL REFERENCES voice_calls(id) ON DELETE CASCADE,
  transcript_text TEXT NOT NULL,
  transcript_language VARCHAR(10) DEFAULT 'en',
  transcript_confidence NUMERIC(3, 2), -- 0.00 to 1.00
  transcription_provider VARCHAR(50), -- WHISPER, GOOGLE, DEEPGRAM
  provider_request JSONB,
  provider_response JSONB,
  duration_seconds INTEGER,
  word_count INTEGER,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (transcript_confidence >= 0 AND transcript_confidence <= 1),
  CHECK (transcription_provider IN ('WHISPER', 'GOOGLE', 'DEEPGRAM', 'TWILIO'))
);

-- ==========================================
-- VOICE INTENT CLASSIFICATION TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS voice_intents (
  id SERIAL PRIMARY KEY,
  call_id INTEGER NOT NULL REFERENCES voice_calls(id) ON DELETE CASCADE,
  transcription_id INTEGER REFERENCES voice_transcriptions(id) ON DELETE SET NULL,
  intent_type VARCHAR(50) NOT NULL, -- PART_LOOKUP, STOCK_CHECK, PRICE_INQUIRY, ORDER_STATUS, PAYMENT_REMINDER, etc
  intent_confidence NUMERIC(3, 2), -- 0.00 to 1.00
  primary_entity VARCHAR(255),
  secondary_entities JSONB,
  classification_model VARCHAR(50), -- GPT-4O, GPT-3.5, CLAUDE, etc
  model_version VARCHAR(50),
  processing_time_ms INTEGER,
  classified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (intent_confidence >= 0 AND intent_confidence <= 1),
  CHECK (intent_type IN (
    'PART_LOOKUP', 'STOCK_CHECK', 'PRICE_INQUIRY', 'ORDER_STATUS',
    'PAYMENT_REMINDER', 'DEMAND_LOG', 'GENERAL_INQUIRY', 'FEEDBACK',
    'COMPLAINT', 'NONE', 'INVALID'
  ))
);

-- ==========================================
-- VOICE ENTITIES TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS voice_entities (
  id SERIAL PRIMARY KEY,
  intent_id INTEGER NOT NULL REFERENCES voice_intents(id) ON DELETE CASCADE,
  entity_type VARCHAR(50) NOT NULL, -- PART_NAME, PART_NUMBER, QUANTITY, PRICE, etc
  entity_value VARCHAR(255) NOT NULL,
  entity_confidence NUMERIC(3, 2),
  matched_record_type VARCHAR(50), -- PART, PARTY, BILL, LOCATION
  matched_record_id INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- VOICE RESPONSES TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS voice_responses (
  id SERIAL PRIMARY KEY,
  call_id INTEGER NOT NULL REFERENCES voice_calls(id) ON DELETE CASCADE,
  intent_id INTEGER REFERENCES voice_intents(id) ON DELETE SET NULL,
  response_type VARCHAR(50) NOT NULL, -- VOICE, SMS, EMAIL, CALLBACK
  response_text TEXT NOT NULL,
  response_audio_url VARCHAR(500),
  response_audio_sid VARCHAR(100),
  duration_seconds INTEGER,
  is_template_based BOOLEAN DEFAULT FALSE,
  template_id INTEGER,
  generated_at TIMESTAMPTZ,
  played_at TIMESTAMPTZ,
  played_successfully BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (response_type IN ('VOICE', 'SMS', 'EMAIL', 'CALLBACK', 'ESCALATED'))
);

-- ==========================================
-- VOICE CALL ANALYTICS TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS voice_analytics (
  id SERIAL PRIMARY KEY,
  call_id INTEGER REFERENCES voice_calls(id) ON DELETE SET NULL,
  metric_type VARCHAR(50) NOT NULL, -- QUALITY, SENTIMENT, SATISFACTION, RESOLUTION
  metric_value NUMERIC(5, 2),
  metric_unit VARCHAR(50),
  calculated_at TIMESTAMPTZ,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (metric_type IN ('QUALITY', 'SENTIMENT', 'SATISFACTION', 'RESOLUTION', 'DURATION', 'COST'))
);

-- ==========================================
-- VOICE GUARDRAILS TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS voice_guardrails (
  id SERIAL PRIMARY KEY,
  guardrail_type VARCHAR(50) NOT NULL, -- KEYWORD_BLOCK, PATTERN_BLOCK, RATE_LIMIT, CALLER_BLOCK
  pattern VARCHAR(500),
  keyword_list TEXT[], -- Array of blocked keywords
  action VARCHAR(50) NOT NULL, -- BLOCK, ALERT, LOG, ESCALATE
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (guardrail_type IN ('KEYWORD_BLOCK', 'PATTERN_BLOCK', 'RATE_LIMIT', 'CALLER_BLOCK', 'TIME_BASED')),
  CHECK (action IN ('BLOCK', 'ALERT', 'LOG', 'ESCALATE'))
);

-- ==========================================
-- VOICE GUARDRAIL VIOLATIONS TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS voice_guardrail_violations (
  id SERIAL PRIMARY KEY,
  call_id INTEGER NOT NULL REFERENCES voice_calls(id) ON DELETE CASCADE,
  guardrail_id INTEGER NOT NULL REFERENCES voice_guardrails(id) ON DELETE CASCADE,
  violation_type VARCHAR(50) NOT NULL,
  violation_text VARCHAR(500),
  severity VARCHAR(20) NOT NULL, -- LOW, MEDIUM, HIGH, CRITICAL
  action_taken VARCHAR(50),
  blocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  CHECK (action_taken IN ('BLOCKED', 'FLAGGED', 'ESCALATED', 'LOGGED'))
);

-- ==========================================
-- VOICE VOICE TEMPLATES TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS voice_templates (
  id SERIAL PRIMARY KEY,
  template_name VARCHAR(100) NOT NULL UNIQUE,
  template_type VARCHAR(50) NOT NULL, -- GREETING, RESPONSE, CLOSING, FALLBACK
  template_text TEXT NOT NULL,
  template_audio_url VARCHAR(500),
  template_audio_sid VARCHAR(100),
  language VARCHAR(10) DEFAULT 'en',
  voice_gender VARCHAR(20), -- MALE, FEMALE, NEUTRAL
  voice_rate NUMERIC(3, 1), -- Speech rate: 0.5 to 2.0
  is_active BOOLEAN DEFAULT TRUE,
  usage_count INTEGER DEFAULT 0,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (template_type IN ('GREETING', 'RESPONSE', 'CLOSING', 'FALLBACK', 'ERROR', 'HOLD_MESSAGE')),
  CHECK (voice_gender IN ('MALE', 'FEMALE', 'NEUTRAL')),
  CHECK (voice_rate >= 0.5 AND voice_rate <= 2.0)
);

-- ==========================================
-- VOICE CALL TRANSFERS TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS voice_call_transfers (
  id SERIAL PRIMARY KEY,
  from_call_id INTEGER NOT NULL REFERENCES voice_calls(id) ON DELETE CASCADE,
  to_call_id INTEGER REFERENCES voice_calls(id) ON DELETE SET NULL,
  transfer_reason VARCHAR(100),
  transfer_to_number VARCHAR(30),
  transfer_to_user_id INTEGER REFERENCES users(id),
  transfer_type VARCHAR(50) NOT NULL, -- AGENT, QUEUE, EXTERNAL, VOICEMAIL
  initiated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status VARCHAR(50) NOT NULL DEFAULT 'INITIATED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (transfer_type IN ('AGENT', 'QUEUE', 'EXTERNAL', 'VOICEMAIL', 'IVR')),
  CHECK (status IN ('INITIATED', 'RINGING', 'CONNECTED', 'COMPLETED', 'FAILED'))
);

-- ==========================================
-- VIEWS FOR VOICE ANALYTICS
-- ==========================================

-- View: Call summary with transcription and intent
CREATE OR REPLACE VIEW v_voice_call_summary AS
SELECT
  vc.id,
  vc.from_number,
  vc.to_number,
  vc.caller_name,
  vc.call_type,
  vc.status,
  vc.duration_seconds,
  vt.transcript_text,
  vt.transcript_confidence,
  vi.intent_type,
  vi.intent_confidence,
  vc.started_at,
  vc.created_at
FROM voice_calls vc
LEFT JOIN voice_transcriptions vt ON vt.call_id = vc.id
LEFT JOIN voice_intents vi ON vi.call_id = vc.id
ORDER BY vc.created_at DESC;

-- View: Intent classification accuracy
CREATE OR REPLACE VIEW v_voice_intent_accuracy AS
SELECT
  vi.intent_type,
  COUNT(*) as total_intents,
  ROUND(AVG(vi.intent_confidence)::NUMERIC, 3) as avg_confidence,
  MIN(vi.intent_confidence) as min_confidence,
  MAX(vi.intent_confidence) as max_confidence,
  COUNT(*) FILTER (WHERE vi.intent_confidence >= 0.8) as high_confidence,
  COUNT(*) FILTER (WHERE vi.intent_confidence < 0.8) as low_confidence
FROM voice_intents vi
GROUP BY vi.intent_type
ORDER BY total_intents DESC;

-- View: Voice guardrail violations
CREATE OR REPLACE VIEW v_voice_violations_summary AS
SELECT
  vgv.violation_type,
  vgv.severity,
  COUNT(*) as violation_count,
  COUNT(DISTINCT vgv.call_id) as affected_calls,
  MAX(vgv.blocked_at) as latest_violation,
  vg.guardrail_type
FROM voice_guardrail_violations vgv
JOIN voice_guardrails vg ON vg.id = vgv.guardrail_id
GROUP BY vgv.violation_type, vgv.severity, vg.guardrail_type
ORDER BY violation_count DESC;

-- View: Call quality metrics
CREATE OR REPLACE VIEW v_voice_call_quality AS
SELECT
  DATE(vc.started_at) as call_date,
  COUNT(*) as total_calls,
  COUNT(*) FILTER (WHERE vc.status = 'COMPLETED') as completed_calls,
  COUNT(*) FILTER (WHERE vc.status = 'FAILED') as failed_calls,
  ROUND(100.0 * COUNT(*) FILTER (WHERE vc.status = 'COMPLETED') / NULLIF(COUNT(*), 0), 2) as completion_rate,
  ROUND(AVG(vc.duration_seconds)::NUMERIC, 0) as avg_duration_seconds,
  COUNT(*) FILTER (WHERE vt.transcript_confidence >= 0.8) as high_quality_transcriptions
FROM voice_calls vc
LEFT JOIN voice_transcriptions vt ON vt.call_id = vc.id
WHERE vc.started_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(vc.started_at)
ORDER BY call_date DESC;

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_voice_calls_status ON voice_calls(status, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_calls_from_number ON voice_calls(from_number);
CREATE INDEX IF NOT EXISTS idx_voice_calls_to_number ON voice_calls(to_number);
CREATE INDEX IF NOT EXISTS idx_voice_transcriptions_call ON voice_transcriptions(call_id);
CREATE INDEX IF NOT EXISTS idx_voice_intents_call ON voice_intents(call_id);
CREATE INDEX IF NOT EXISTS idx_voice_intents_type ON voice_intents(intent_type);
CREATE INDEX IF NOT EXISTS idx_voice_entities_intent ON voice_entities(intent_id);
CREATE INDEX IF NOT EXISTS idx_voice_responses_call ON voice_responses(call_id);
CREATE INDEX IF NOT EXISTS idx_voice_guardrail_violations_call ON voice_guardrail_violations(call_id);
CREATE INDEX IF NOT EXISTS idx_voice_analytics_call ON voice_analytics(call_id);

-- ==========================================
-- FUNCTIONS FOR VOICE OPERATIONS
-- ==========================================

-- Function: Log voice call
CREATE OR REPLACE FUNCTION log_voice_call(
  p_call_type VARCHAR,
  p_from_number VARCHAR,
  p_to_number VARCHAR,
  p_caller_name VARCHAR,
  p_twilio_call_sid VARCHAR,
  p_created_by INTEGER
)
RETURNS SETOF voice_calls AS $$
BEGIN
  RETURN QUERY
  INSERT INTO voice_calls (
    call_type, direction, from_number, to_number, caller_name,
    twilio_call_sid, status, created_by
  ) VALUES (
    UPPER(p_call_type),
    CASE WHEN UPPER(p_call_type) = 'INBOUND' THEN 'INCOMING' ELSE 'OUTGOING' END,
    p_from_number, p_to_number, p_caller_name,
    p_twilio_call_sid, 'INITIATED', p_created_by
  )
  RETURNING *;
END;
$$ LANGUAGE plpgsql;

-- Function: Update call status
CREATE OR REPLACE FUNCTION update_call_status(
  p_call_id INTEGER,
  p_status VARCHAR,
  p_reason VARCHAR DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE voice_calls
  SET
    status = UPPER(p_status),
    status_reason = p_reason,
    connected_at = CASE WHEN UPPER(p_status) = 'CONNECTED' THEN NOW() ELSE connected_at END,
    ended_at = CASE WHEN UPPER(p_status) IN ('COMPLETED', 'FAILED', 'CANCELLED') THEN NOW() ELSE ended_at END,
    updated_at = NOW()
  WHERE id = p_call_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Record transcription
CREATE OR REPLACE FUNCTION record_voice_transcription(
  p_call_id INTEGER,
  p_transcript_text TEXT,
  p_confidence NUMERIC,
  p_provider VARCHAR
)
RETURNS SETOF voice_transcriptions AS $$
BEGIN
  RETURN QUERY
  INSERT INTO voice_transcriptions (
    call_id, transcript_text, transcript_confidence, transcription_provider
  ) VALUES (
    p_call_id, p_transcript_text, p_confidence, UPPER(p_provider)
  )
  RETURNING *;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- MIGRATION VERIFICATION
-- ==========================================

DO $$
BEGIN
  -- Check if tables exist
  PERFORM 1 FROM information_schema.tables 
    WHERE table_name = 'voice_calls';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Migration failed: voice_calls table not found';
  END IF;

  RAISE NOTICE 'Phase 8 Voice AI Agent Migration completed successfully';
END $$;

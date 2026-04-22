/**
 * PHASE 7: Notification Engine Backend Database Migration
 * 
 * Enhances notification system with real provider integrations:
 * - Email provider configuration (SendGrid)
 * - SMS provider configuration (Twilio)
 * - WhatsApp provider configuration
 * - Enhanced job tracking and retry logic
 * - Provider-specific error handling
 */

-- ==========================================
-- NOTIFICATION PROVIDERS TABLE
-- ==========================================

-- Store provider credentials and configurations
CREATE TABLE IF NOT EXISTS notification_providers (
  id SERIAL PRIMARY KEY,
  provider_type VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(100),
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  config JSONB NOT NULL,
  rate_limit_per_minute INTEGER DEFAULT 100,
  retry_max_attempts INTEGER DEFAULT 3,
  retry_backoff_seconds INTEGER DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by INTEGER REFERENCES users(id),
  CHECK (provider_type IN ('SENDGRID', 'TWILIO', 'WHATSAPP', 'INTERNAL')),
  UNIQUE(provider_type)
);

-- ==========================================
-- NOTIFICATION CHANNELS TABLE
-- ==========================================

-- Map notification channels to providers
CREATE TABLE IF NOT EXISTS notification_channels (
  id SERIAL PRIMARY KEY,
  channel_type VARCHAR(20) NOT NULL,
  provider_id INTEGER NOT NULL REFERENCES notification_providers(id) ON DELETE RESTRICT,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (channel_type IN ('EMAIL', 'SMS', 'WHATSAPP', 'INTERNAL')),
  UNIQUE(channel_type, provider_id)
);

-- ==========================================
-- ENHANCED NOTIFICATION JOBS TABLE
-- ==========================================

-- Enhanced job tracking with provider details
ALTER TABLE notification_jobs
ADD COLUMN IF NOT EXISTS provider_id INTEGER REFERENCES notification_providers(id),
ADD COLUMN IF NOT EXISTS template_id INTEGER REFERENCES notification_templates(id),
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_retry_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS error_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS provider_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS provider_reference_id VARCHAR(255);

-- ==========================================
-- NOTIFICATION DELIVERY LOGS ENHANCEMENTS
-- ==========================================

-- Enhanced delivery logs for comprehensive tracking
ALTER TABLE notification_delivery_logs
ADD COLUMN IF NOT EXISTS template_id INTEGER REFERENCES notification_templates(id),
ADD COLUMN IF NOT EXISTS provider_id INTEGER REFERENCES notification_providers(id),
ADD COLUMN IF NOT EXISTS delivery_time_ms INTEGER,
ADD COLUMN IF NOT EXISTS provider_error_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS provider_request JSONB,
ADD COLUMN IF NOT EXISTS retry_attempt INTEGER DEFAULT 1;

-- ==========================================
-- NOTIFICATION FAILURES TABLE
-- ==========================================

-- Track all notification failures for analysis
CREATE TABLE IF NOT EXISTS notification_failures (
  id SERIAL PRIMARY KEY,
  job_id INTEGER NOT NULL REFERENCES notification_jobs(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL,
  provider_id INTEGER REFERENCES notification_providers(id),
  error_type VARCHAR(50) NOT NULL,
  error_message TEXT,
  error_code VARCHAR(50),
  error_details JSONB,
  should_retry BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (error_type IN ('PROVIDER_ERROR', 'RATE_LIMIT', 'INVALID_RECIPIENT', 'AUTHENTICATION', 'TIMEOUT', 'OTHER'))
);

-- ==========================================
-- NOTIFICATION STATISTICS TABLE
-- ==========================================

-- Track statistics for monitoring
CREATE TABLE IF NOT EXISTS notification_statistics (
  id SERIAL PRIMARY KEY,
  provider_id INTEGER NOT NULL REFERENCES notification_providers(id) ON DELETE CASCADE,
  channel_type VARCHAR(20) NOT NULL,
  date DATE NOT NULL,
  total_jobs INTEGER DEFAULT 0,
  successful_jobs INTEGER DEFAULT 0,
  failed_jobs INTEGER DEFAULT 0,
  pending_jobs INTEGER DEFAULT 0,
  total_attempts INTEGER DEFAULT 0,
  avg_delivery_time_ms NUMERIC(10, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider_id, channel_type, date),
  CHECK (channel_type IN ('EMAIL', 'SMS', 'WHATSAPP', 'INTERNAL'))
);

-- ==========================================
-- VIEWS FOR NOTIFICATION MONITORING
-- ==========================================

-- View: Current provider status
CREATE OR REPLACE VIEW v_notification_provider_status AS
SELECT
  p.id,
  p.provider_type,
  p.display_name,
  p.is_active,
  COUNT(DISTINCT nj.id) FILTER (WHERE nj.status = 'PENDING') as pending_jobs,
  COUNT(DISTINCT nj.id) FILTER (WHERE nj.status = 'SENT') as sent_jobs,
  COUNT(DISTINCT nj.id) FILTER (WHERE nj.status = 'FAILED') as failed_jobs,
  COALESCE(ROUND(100.0 * COUNT(DISTINCT nj.id) FILTER (WHERE nj.status = 'SENT') / NULLIF(COUNT(DISTINCT nj.id), 0), 2), 0) as success_rate,
  MAX(ndl.created_at) as last_delivery_at
FROM notification_providers p
LEFT JOIN notification_jobs nj ON nj.provider_id = p.id
LEFT JOIN notification_delivery_logs ndl ON ndl.job_id = nj.id
GROUP BY p.id, p.provider_type, p.display_name, p.is_active;

-- View: Notification queue status
CREATE OR REPLACE VIEW v_notification_queue_status AS
SELECT
  p.provider_type,
  COUNT(*) FILTER (WHERE nj.status = 'PENDING') as pending_count,
  COUNT(*) FILTER (WHERE nj.status = 'PENDING' AND nj.scheduled_for <= NOW()) as due_count,
  COUNT(*) FILTER (WHERE nj.status = 'FAILED' AND nj.retry_count < p.retry_max_attempts) as retryable_failures,
  MAX(nj.scheduled_for) as next_scheduled_time,
  MIN(nj.created_at) as oldest_pending_since
FROM notification_jobs nj
JOIN notification_providers p ON nj.provider_id = p.id
GROUP BY p.provider_type;

-- View: Delivery performance metrics
CREATE OR REPLACE VIEW v_notification_delivery_metrics AS
SELECT
  p.provider_type,
  c.channel_type,
  COUNT(ndl.id) as total_deliveries,
  COUNT(ndl.id) FILTER (WHERE ndl.status = 'SENT') as successful,
  COUNT(ndl.id) FILTER (WHERE ndl.status = 'FAILED') as failed,
  ROUND(100.0 * COUNT(ndl.id) FILTER (WHERE ndl.status = 'SENT') / NULLIF(COUNT(ndl.id), 0), 2) as success_rate,
  ROUND(AVG(ndl.delivery_time_ms)::NUMERIC, 2) as avg_delivery_ms,
  MAX(ndl.created_at) as last_delivery
FROM notification_providers p
JOIN notification_channels c ON c.provider_id = p.id
LEFT JOIN notification_delivery_logs ndl ON ndl.provider_id = p.id AND ndl.channel = c.channel_type
GROUP BY p.provider_type, c.channel_type;

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_notification_jobs_provider_status 
  ON notification_jobs(provider_id, status, scheduled_for);

CREATE INDEX IF NOT EXISTS idx_notification_jobs_retry_at 
  ON notification_jobs(next_retry_at, status);

CREATE INDEX IF NOT EXISTS idx_notification_delivery_logs_provider 
  ON notification_delivery_logs(provider_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_failures_job 
  ON notification_failures(job_id, attempt_number);

CREATE INDEX IF NOT EXISTS idx_notification_failures_error 
  ON notification_failures(error_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_statistics_date 
  ON notification_statistics(provider_id, date DESC);

-- ==========================================
-- FUNCTIONS FOR NOTIFICATION MANAGEMENT
-- ==========================================

-- Function: Get provider configuration
CREATE OR REPLACE FUNCTION get_notification_provider(p_provider_type VARCHAR)
RETURNS TABLE(
  id INTEGER,
  provider_type VARCHAR,
  is_active BOOLEAN,
  config JSONB,
  rate_limit_per_minute INTEGER,
  retry_max_attempts INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    np.id,
    np.provider_type,
    np.is_active,
    np.config,
    np.rate_limit_per_minute,
    np.retry_max_attempts
  FROM notification_providers np
  WHERE np.provider_type = p_provider_type;
END;
$$ LANGUAGE plpgsql;

-- Function: Get next job to retry
CREATE OR REPLACE FUNCTION get_next_notification_job_to_retry(p_limit INTEGER DEFAULT 10)
RETURNS TABLE(
  id INTEGER,
  provider_id INTEGER,
  job_type VARCHAR,
  recipient_email VARCHAR,
  recipient_phone VARCHAR,
  retry_count INTEGER,
  error_code VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    nj.id,
    nj.provider_id,
    nj.job_type,
    nj.recipient_email,
    nj.recipient_phone,
    nj.retry_count,
    nj.error_code
  FROM notification_jobs nj
  WHERE nj.status = 'FAILED'
    AND nj.retry_count < COALESCE((SELECT np.retry_max_attempts FROM notification_providers np WHERE np.id = nj.provider_id), 3)
    AND (nj.next_retry_at IS NULL OR nj.next_retry_at <= NOW())
  ORDER BY nj.next_retry_at ASC NULLS FIRST, nj.created_at ASC
  LIMIT p_limit
  FOR UPDATE SKIP LOCKED;
END;
$$ LANGUAGE plpgsql;

-- Function: Record delivery attempt
CREATE OR REPLACE FUNCTION record_notification_delivery(
  p_job_id INTEGER,
  p_provider_id INTEGER,
  p_channel VARCHAR,
  p_status VARCHAR,
  p_delivery_ms INTEGER,
  p_provider_reference_id VARCHAR DEFAULT NULL,
  p_provider_error_code VARCHAR DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO notification_delivery_logs (
    job_id, provider_id, channel, status, delivery_time_ms, 
    provider_response, created_at
  ) VALUES (
    p_job_id, p_provider_id, p_channel, p_status, p_delivery_ms,
    jsonb_build_object('provider_reference_id', p_provider_reference_id, 'error_code', p_provider_error_code),
    NOW()
  );
  
  -- Update job status
  UPDATE notification_jobs
  SET
    provider_status = p_status,
    provider_reference_id = p_provider_reference_id,
    error_code = p_provider_error_code,
    last_retry_at = NOW()
  WHERE id = p_job_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Increment delivery statistics
CREATE OR REPLACE FUNCTION increment_notification_statistics(
  p_provider_id INTEGER,
  p_channel_type VARCHAR,
  p_status VARCHAR,
  p_delivery_ms INTEGER
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO notification_statistics (
    provider_id, channel_type, date, 
    total_jobs, successful_jobs, failed_jobs, total_attempts, avg_delivery_time_ms
  ) VALUES (
    p_provider_id, p_channel_type, CURRENT_DATE,
    1,
    CASE WHEN p_status = 'SENT' THEN 1 ELSE 0 END,
    CASE WHEN p_status = 'FAILED' THEN 1 ELSE 0 END,
    1,
    p_delivery_ms
  )
  ON CONFLICT (provider_id, channel_type, date) DO UPDATE SET
    total_jobs = notification_statistics.total_jobs + 1,
    successful_jobs = notification_statistics.successful_jobs + CASE WHEN p_status = 'SENT' THEN 1 ELSE 0 END,
    failed_jobs = notification_statistics.failed_jobs + CASE WHEN p_status = 'FAILED' THEN 1 ELSE 0 END,
    total_attempts = notification_statistics.total_attempts + 1,
    avg_delivery_time_ms = (notification_statistics.avg_delivery_time_ms * notification_statistics.total_attempts + p_delivery_ms) / (notification_statistics.total_attempts + 1),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- MIGRATION VERIFICATION
-- ==========================================

DO $$
BEGIN
  -- Check if tables exist
  PERFORM 1 FROM information_schema.tables 
    WHERE table_name = 'notification_providers';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Migration failed: notification_providers table not found';
  END IF;

  RAISE NOTICE 'Phase 7 Notification Engine Migration completed successfully';
END $$;

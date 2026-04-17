CREATE TABLE IF NOT EXISTS notification_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  channel VARCHAR(20) NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (channel IN ('SMS', 'WHATSAPP', 'EMAIL', 'INTERNAL'))
);

CREATE TABLE IF NOT EXISTS notification_jobs (
  id SERIAL PRIMARY KEY,
  job_type VARCHAR(50) NOT NULL,
  bill_id INTEGER REFERENCES bills(id) ON DELETE CASCADE,
  party_type VARCHAR(20),
  party_id INTEGER,
  recipient_name VARCHAR(150),
  recipient_phone VARCHAR(30),
  recipient_email VARCHAR(255),
  due_date DATE,
  outstanding_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  payload JSONB,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (job_type IN ('BILL_DUE_REMINDER')),
  CHECK (status IN ('PENDING', 'SENT', 'FAILED', 'CANCELLED')),
  CHECK (party_type IS NULL OR party_type IN ('CUSTOMER', 'SUPPLIER'))
);

CREATE TABLE IF NOT EXISTS notification_delivery_logs (
  id SERIAL PRIMARY KEY,
  job_id INTEGER NOT NULL REFERENCES notification_jobs(id) ON DELETE CASCADE,
  channel VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  provider_message TEXT,
  payload JSONB,
  provider_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (channel IN ('SMS', 'WHATSAPP', 'EMAIL', 'INTERNAL')),
  CHECK (status IN ('SENT', 'FAILED'))
);

CREATE INDEX IF NOT EXISTS idx_notification_jobs_status_scheduled ON notification_jobs(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_notification_jobs_bill_id ON notification_jobs(bill_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_job_id ON notification_delivery_logs(job_id);

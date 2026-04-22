/**
 * PHASE 9: Analytics & Reporting Database Migration
 * 
 * Implements comprehensive business intelligence, KPI tracking, and reporting
 * - Real-time dashboard metrics
 * - Historical trend analysis
 * - Business KPI tracking
 * - Audit and compliance reporting
 * - Data warehouse for analytics
 */

-- ==========================================
-- KPI DEFINITIONS TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS kpi_definitions (
  id SERIAL PRIMARY KEY,
  kpi_code VARCHAR(50) NOT NULL UNIQUE,
  kpi_name VARCHAR(200) NOT NULL,
  kpi_category VARCHAR(50) NOT NULL, -- SALES, INVENTORY, CUSTOMER, FINANCIAL, OPERATIONAL
  description TEXT,
  formula TEXT, -- SQL formula for calculation
  target_value NUMERIC(15, 2),
  warning_threshold NUMERIC(5, 2), -- % threshold for yellow alert
  critical_threshold NUMERIC(5, 2), -- % threshold for red alert
  measurement_unit VARCHAR(50), -- units/count/percentage/amount
  measurement_frequency VARCHAR(50) NOT NULL, -- DAILY, WEEKLY, MONTHLY, YEARLY
  is_active BOOLEAN DEFAULT TRUE,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (kpi_category IN ('SALES', 'INVENTORY', 'CUSTOMER', 'FINANCIAL', 'OPERATIONAL', 'QUALITY')),
  CHECK (measurement_frequency IN ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'))
);

-- ==========================================
-- KPI METRICS TABLE (Time Series)
-- ==========================================

CREATE TABLE IF NOT EXISTS kpi_metrics (
  id SERIAL PRIMARY KEY,
  kpi_id INTEGER NOT NULL REFERENCES kpi_definitions(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  metric_value NUMERIC(15, 2) NOT NULL,
  target_value NUMERIC(15, 2),
  actual_vs_target NUMERIC(5, 2), -- percentage difference
  status VARCHAR(20), -- ON_TRACK, AT_RISK, CRITICAL, EXCEEDED
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(kpi_id, metric_date),
  CHECK (status IN ('ON_TRACK', 'AT_RISK', 'CRITICAL', 'EXCEEDED'))
);

-- ==========================================
-- SALES ANALYTICS TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS analytics_sales (
  id SERIAL PRIMARY KEY,
  bill_id INTEGER REFERENCES bills(id) ON DELETE SET NULL,
  sale_date DATE NOT NULL,
  sale_amount NUMERIC(15, 2) NOT NULL,
  party_id INTEGER REFERENCES parties(id),
  party_type VARCHAR(50),
  part_id INTEGER REFERENCES parts(id),
  part_category VARCHAR(100),
  quantity_sold NUMERIC(10, 2),
  unit_price NUMERIC(10, 2),
  discount_given NUMERIC(10, 2),
  tax_amount NUMERIC(10, 2),
  payment_status VARCHAR(50),
  days_to_payment INTEGER,
  customer_segment VARCHAR(50), -- VIP, REGULAR, NEW, DORMANT
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- INVENTORY ANALYTICS TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS analytics_inventory (
  id SERIAL PRIMARY KEY,
  part_id INTEGER NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
  location_id INTEGER REFERENCES locations(id),
  snapshot_date DATE NOT NULL,
  snapshot_time TIMESTAMPTZ NOT NULL,
  quantity_on_hand NUMERIC(10, 2),
  quantity_available NUMERIC(10, 2),
  quantity_reserved NUMERIC(10, 2),
  quantity_sold_30d NUMERIC(10, 2), -- 30-day sales
  quantity_sold_90d NUMERIC(10, 2), -- 90-day sales
  reorder_level NUMERIC(10, 2),
  stock_status VARCHAR(50), -- OVERSTOCK, OPTIMAL, LOWSTOCK, STOCKOUT
  shelf_life_days INTEGER,
  damaged_count NUMERIC(10, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(part_id, location_id, snapshot_date)
);

-- ==========================================
-- CUSTOMER ANALYTICS TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS analytics_customers (
  id SERIAL PRIMARY KEY,
  party_id INTEGER NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
  analytics_date DATE NOT NULL,
  total_purchases_count INTEGER,
  total_purchase_amount NUMERIC(15, 2),
  average_purchase_value NUMERIC(10, 2),
  purchase_frequency_days NUMERIC(8, 2),
  days_since_last_purchase INTEGER,
  customer_lifetime_value NUMERIC(15, 2),
  payment_score NUMERIC(5, 2), -- 0-100, higher is better
  payment_on_time_count INTEGER,
  payment_late_count INTEGER,
  total_outstanding_amount NUMERIC(15, 2),
  preferred_part_category VARCHAR(100),
  customer_status VARCHAR(50), -- ACTIVE, INACTIVE, AT_RISK, VIP
  churn_risk_score NUMERIC(3, 2), -- 0-1.0, higher = more risk
  next_purchase_probability NUMERIC(3, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(party_id, analytics_date)
);

-- ==========================================
-- FINANCIAL ANALYTICS TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS analytics_financial (
  id SERIAL PRIMARY KEY,
  financial_date DATE NOT NULL,
  category VARCHAR(50) NOT NULL, -- REVENUE, EXPENSE, RECEIVABLE, PAYABLE
  total_amount NUMERIC(15, 2),
  pending_amount NUMERIC(15, 2),
  overdue_amount NUMERIC(15, 2),
  settled_amount NUMERIC(15, 2),
  transaction_count INTEGER,
  average_transaction_value NUMERIC(15, 2),
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(financial_date, category)
);

-- ==========================================
-- OPERATIONAL METRICS TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS analytics_operational (
  id SERIAL PRIMARY KEY,
  metric_date DATE NOT NULL,
  metric_type VARCHAR(50) NOT NULL, -- ORDER_FULFILLMENT, CALL_CENTER, RETURNS, DELIVERY
  metric_name VARCHAR(100),
  metric_value NUMERIC(15, 2),
  benchmark_value NUMERIC(15, 2),
  performance_vs_benchmark NUMERIC(5, 2), -- percentage
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(metric_date, metric_type, metric_name)
);

-- ==========================================
-- REPORT DEFINITIONS TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS report_definitions (
  id SERIAL PRIMARY KEY,
  report_code VARCHAR(50) NOT NULL UNIQUE,
  report_name VARCHAR(200) NOT NULL,
  report_type VARCHAR(50) NOT NULL, -- STANDARD, CUSTOM, AUTOMATED
  report_category VARCHAR(100), -- SALES, INVENTORY, CUSTOMER, FINANCIAL, COMPLIANCE
  description TEXT,
  report_query TEXT, -- SQL for report generation
  parameters JSONB, -- Report parameters
  schedule VARCHAR(100), -- Cron expression for automated reports
  delivery_channels TEXT[], -- EMAIL, DOWNLOAD, DASHBOARD, WEBHOOK
  owner_id INTEGER REFERENCES users(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- REPORT EXECUTIONS TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS report_executions (
  id SERIAL PRIMARY KEY,
  report_id INTEGER NOT NULL REFERENCES report_definitions(id) ON DELETE CASCADE,
  execution_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  execution_time_ms INTEGER,
  record_count INTEGER,
  status VARCHAR(50) NOT NULL, -- SUCCESS, FAILED, PARTIAL, QUEUED
  error_message TEXT,
  file_path VARCHAR(500), -- Path to generated file
  file_size_bytes INTEGER,
  executed_by INTEGER REFERENCES users(id),
  scheduled_execution BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- REPORT SUBSCRIPTIONS TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS report_subscriptions (
  id SERIAL PRIMARY KEY,
  report_id INTEGER NOT NULL REFERENCES report_definitions(id) ON DELETE CASCADE,
  subscriber_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_type VARCHAR(50) NOT NULL, -- ONCE, DAILY, WEEKLY, MONTHLY
  last_sent_date TIMESTAMPTZ,
  next_send_date TIMESTAMPTZ,
  delivery_email VARCHAR(255),
  delivery_format VARCHAR(50), -- PDF, EXCEL, JSON, CSV
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(report_id, subscriber_id)
);

-- ==========================================
-- DASHBOARD WIDGETS TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS dashboard_widgets (
  id SERIAL PRIMARY KEY,
  widget_code VARCHAR(50) NOT NULL UNIQUE,
  widget_name VARCHAR(200) NOT NULL,
  widget_type VARCHAR(50) NOT NULL, -- METRIC, CHART, TABLE, GAUGE, MAP
  chart_type VARCHAR(50), -- LINE, BAR, PIE, AREA, SCATTER
  description TEXT,
  data_source VARCHAR(100), -- table/view/query name
  refresh_interval_seconds INTEGER DEFAULT 300,
  default_width INTEGER,
  default_height INTEGER,
  config JSONB, -- Chart configuration
  is_public BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- DASHBOARD LAYOUTS TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS dashboard_layouts (
  id SERIAL PRIMARY KEY,
  dashboard_name VARCHAR(200) NOT NULL,
  dashboard_type VARCHAR(50) NOT NULL, -- EXECUTIVE, MANAGER, TEAM, CUSTOM
  description TEXT,
  owner_id INTEGER NOT NULL REFERENCES users(id),
  layout_config JSONB NOT NULL, -- Positions and sizes of widgets
  is_default BOOLEAN DEFAULT FALSE,
  is_public BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(owner_id, dashboard_name)
);

-- ==========================================
-- DASHBOARD WIDGET MAPPINGS TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS dashboard_widget_mappings (
  id SERIAL PRIMARY KEY,
  dashboard_id INTEGER NOT NULL REFERENCES dashboard_layouts(id) ON DELETE CASCADE,
  widget_id INTEGER NOT NULL REFERENCES dashboard_widgets(id) ON DELETE CASCADE,
  position_x INTEGER,
  position_y INTEGER,
  width INTEGER,
  height INTEGER,
  parameters JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(dashboard_id, widget_id)
);

-- ==========================================
-- AUDIT LOG TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  entity_type VARCHAR(100) NOT NULL, -- PART, BILL, PARTY, etc
  entity_id INTEGER,
  entity_name VARCHAR(255),
  action VARCHAR(50) NOT NULL, -- CREATE, UPDATE, DELETE, EXPORT, APPROVE
  old_values JSONB,
  new_values JSONB,
  changed_by INTEGER REFERENCES users(id),
  change_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address VARCHAR(50),
  user_agent VARCHAR(500),
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- ANALYTICS CACHE TABLE (Performance)
-- ==========================================

CREATE TABLE IF NOT EXISTS analytics_cache (
  id SERIAL PRIMARY KEY,
  cache_key VARCHAR(255) NOT NULL UNIQUE,
  cache_type VARCHAR(50), -- WIDGET, REPORT, KPI, DASHBOARD
  cache_data JSONB NOT NULL,
  cache_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expiry_date TIMESTAMPTZ NOT NULL,
  hit_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- ANALYTICAL VIEWS
-- ==========================================

-- View: Sales Performance Daily
CREATE OR REPLACE VIEW v_sales_daily_performance AS
SELECT
  sales_date,
  COUNT(DISTINCT bill_id) as order_count,
  SUM(sale_amount) as total_sales,
  AVG(sale_amount) as avg_order_value,
  SUM(quantity_sold) as total_quantity,
  COUNT(DISTINCT party_id) as customer_count,
  SUM(discount_given) as total_discount,
  SUM(tax_amount) as total_tax
FROM analytics_sales
GROUP BY sales_date
ORDER BY sales_date DESC;

-- View: Top Customers by Revenue
CREATE OR REPLACE VIEW v_top_customers AS
SELECT
  party_id,
  (SELECT name FROM parties WHERE id = party_id) as customer_name,
  COUNT(*) as purchase_count,
  SUM(sale_amount) as total_revenue,
  AVG(sale_amount) as avg_purchase_value,
  MAX(sale_date) as last_purchase_date
FROM analytics_sales
GROUP BY party_id
ORDER BY total_revenue DESC;

-- View: Inventory Status Summary
CREATE OR REPLACE VIEW v_inventory_status_summary AS
SELECT
  part_id,
  stock_status,
  COUNT(*) as location_count,
  SUM(quantity_on_hand) as total_quantity,
  AVG(quantity_on_hand) as avg_per_location,
  SUM(quantity_sold_30d) as total_sold_30d,
  AVG(quantity_sold_90d) as avg_sold_per_location_90d
FROM analytics_inventory
WHERE snapshot_date = CURRENT_DATE
GROUP BY part_id, stock_status;

-- View: Customer Segmentation
CREATE OR REPLACE VIEW v_customer_segmentation AS
SELECT
  customer_status,
  COUNT(*) as customer_count,
  SUM(total_purchase_amount) as segment_revenue,
  AVG(customer_lifetime_value) as avg_ltv,
  AVG(payment_score) as avg_payment_score,
  AVG(churn_risk_score) as avg_churn_risk
FROM analytics_customers
WHERE analytics_date = CURRENT_DATE
GROUP BY customer_status;

-- View: KPI Dashboard Summary
CREATE OR REPLACE VIEW v_kpi_dashboard AS
SELECT
  kd.kpi_code,
  kd.kpi_name,
  kd.kpi_category,
  km.metric_date,
  km.metric_value,
  km.target_value,
  km.actual_vs_target,
  km.status
FROM kpi_definitions kd
LEFT JOIN kpi_metrics km ON km.kpi_id = kd.id AND km.metric_date >= CURRENT_DATE - INTERVAL '30 days'
WHERE kd.is_active = TRUE
ORDER BY kd.kpi_category, km.metric_date DESC;

-- View: Financial Summary
CREATE OR REPLACE VIEW v_financial_summary AS
SELECT
  financial_date,
  category,
  SUM(total_amount) as total,
  SUM(pending_amount) as pending,
  SUM(overdue_amount) as overdue,
  SUM(settled_amount) as settled,
  SUM(transaction_count) as transaction_count
FROM analytics_financial
GROUP BY financial_date, category
ORDER BY financial_date DESC;

-- View: Operational Performance
CREATE OR REPLACE VIEW v_operational_summary AS
SELECT
  metric_date,
  metric_type,
  AVG(metric_value) as avg_value,
  MIN(metric_value) as min_value,
  MAX(metric_value) as max_value,
  AVG(performance_vs_benchmark) as avg_vs_benchmark,
  COUNT(*) as metric_count
FROM analytics_operational
GROUP BY metric_date, metric_type
ORDER BY metric_date DESC;

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_kpi_metrics_date ON kpi_metrics(metric_date DESC, kpi_id);
CREATE INDEX IF NOT EXISTS idx_kpi_metrics_status ON kpi_metrics(status, metric_date);
CREATE INDEX IF NOT EXISTS idx_analytics_sales_date ON analytics_sales(sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_sales_party ON analytics_sales(party_id, sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_sales_part ON analytics_sales(part_id, sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_inventory_date ON analytics_inventory(snapshot_date DESC, part_id);
CREATE INDEX IF NOT EXISTS idx_analytics_inventory_status ON analytics_inventory(stock_status, snapshot_date);
CREATE INDEX IF NOT EXISTS idx_analytics_customers_status ON analytics_customers(customer_status, analytics_date);
CREATE INDEX IF NOT EXISTS idx_analytics_customers_risk ON analytics_customers(churn_risk_score, analytics_date DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_financial_date ON analytics_financial(financial_date DESC, category);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id, change_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_changed_by ON audit_logs(changed_by, change_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_report_executions_date ON report_executions(execution_date DESC, report_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_type ON dashboard_widgets(widget_type, is_active);

-- ==========================================
-- FUNCTIONS FOR ANALYTICS
-- ==========================================

-- Function: Calculate KPI metrics
CREATE OR REPLACE FUNCTION calculate_kpi(
  p_kpi_id INTEGER,
  p_metric_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  kpi_id INTEGER,
  metric_date DATE,
  metric_value NUMERIC,
  target_value NUMERIC,
  status VARCHAR
) AS $$
DECLARE
  v_kpi_record RECORD;
  v_metric_value NUMERIC;
  v_target_value NUMERIC;
  v_status VARCHAR;
BEGIN
  SELECT * INTO v_kpi_record FROM kpi_definitions WHERE id = p_kpi_id;
  
  IF v_kpi_record.formula IS NULL THEN
    RETURN;
  END IF;

  -- Execute formula dynamically (simplified example)
  EXECUTE v_kpi_record.formula INTO v_metric_value;
  
  v_target_value := v_kpi_record.target_value;
  
  -- Determine status based on thresholds
  IF v_metric_value >= v_target_value * (1 - v_kpi_record.warning_threshold / 100) THEN
    v_status := 'ON_TRACK';
  ELSIF v_metric_value >= v_target_value * (1 - v_kpi_record.critical_threshold / 100) THEN
    v_status := 'AT_RISK';
  ELSE
    v_status := 'CRITICAL';
  END IF;

  RETURN QUERY SELECT p_kpi_id, p_metric_date, v_metric_value, v_target_value, v_status;
END;
$$ LANGUAGE plpgsql;

-- Function: Record audit log
CREATE OR REPLACE FUNCTION record_audit_log(
  p_entity_type VARCHAR,
  p_entity_id INTEGER,
  p_action VARCHAR,
  p_changed_by INTEGER,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL
)
RETURNS SETOF audit_logs AS $$
BEGIN
  RETURN QUERY
  INSERT INTO audit_logs (
    entity_type, entity_id, action, changed_by, 
    old_values, new_values, change_timestamp
  ) VALUES (
    p_entity_type, p_entity_id, UPPER(p_action), p_changed_by,
    p_old_values, p_new_values, NOW()
  )
  RETURNING *;
END;
$$ LANGUAGE plpgsql;

-- Function: Clean up old analytics data
CREATE OR REPLACE FUNCTION cleanup_old_analytics(p_days_to_keep INTEGER DEFAULT 365)
RETURNS TABLE (
  table_name VARCHAR,
  rows_deleted BIGINT
) AS $$
DECLARE
  v_deleted BIGINT;
BEGIN
  -- Clean old KPI metrics
  DELETE FROM kpi_metrics WHERE metric_date < CURRENT_DATE - (p_days_to_keep || ' days')::INTERVAL;
  v_deleted := ROW_COUNT;
  RETURN QUERY SELECT 'kpi_metrics'::VARCHAR, v_deleted;

  -- Clean old analytics data
  DELETE FROM analytics_sales WHERE sale_date < CURRENT_DATE - (p_days_to_keep || ' days')::INTERVAL;
  v_deleted := ROW_COUNT;
  RETURN QUERY SELECT 'analytics_sales'::VARCHAR, v_deleted;

  -- Clean old audit logs
  DELETE FROM audit_logs WHERE change_timestamp < NOW() - (p_days_to_keep || ' days')::INTERVAL;
  v_deleted := ROW_COUNT;
  RETURN QUERY SELECT 'audit_logs'::VARCHAR, v_deleted;

  -- Clean old cache
  DELETE FROM analytics_cache WHERE expiry_date < NOW();
  v_deleted := ROW_COUNT;
  RETURN QUERY SELECT 'analytics_cache'::VARCHAR, v_deleted;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- MIGRATION VERIFICATION
-- ==========================================

DO $$
BEGIN
  -- Check if tables exist
  PERFORM 1 FROM information_schema.tables 
    WHERE table_name = 'kpi_definitions';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Migration failed: kpi_definitions table not found';
  END IF;

  RAISE NOTICE 'Phase 9 Analytics & Reporting Migration completed successfully';
END $$;

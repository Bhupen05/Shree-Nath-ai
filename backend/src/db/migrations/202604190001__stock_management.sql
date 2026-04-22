-- ============================================================================
-- PHASE 5: Stock Management Foundation
-- Migration: Stock Entries and Logs Tables
-- Created: April 19, 2026
-- ============================================================================

-- ===========================================================================
-- LOCATIONS TABLE (Enhanced with hierarchy support)
-- ===========================================================================
CREATE TABLE IF NOT EXISTS locations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('ROOM', 'CABINET', 'SECTION')),
  parent_id INTEGER REFERENCES locations(id) ON DELETE CASCADE,
  capacity_units INTEGER,
  current_usage_units INTEGER DEFAULT 0,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by INTEGER,
  CONSTRAINT unique_location_hierarchy UNIQUE (name, parent_id, type)
);

-- Create indexes for location queries
CREATE INDEX IF NOT EXISTS idx_locations_parent_id ON locations(parent_id);
CREATE INDEX IF NOT EXISTS idx_locations_type ON locations(type);
CREATE INDEX IF NOT EXISTS idx_locations_is_active ON locations(is_active);

-- ===========================================================================
-- STOCK_ENTRIES TABLE (Batch-level stock tracking)
-- ===========================================================================
CREATE TABLE IF NOT EXISTS stock_entries (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  location_id INTEGER NOT NULL REFERENCES locations(id),
  quantity INTEGER NOT NULL CHECK (quantity >= 0),
  batch_number VARCHAR(100) NOT NULL,
  supplier_id INTEGER REFERENCES suppliers(id),
  incoming_bill_id INTEGER,
  expiry_date DATE,
  unit_cost NUMERIC(12, 2),
  added_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT unique_batch_per_product_location UNIQUE (product_id, location_id, batch_number)
);

-- Create indexes for stock queries
CREATE INDEX IF NOT EXISTS idx_stock_entries_product_id ON stock_entries(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_entries_location_id ON stock_entries(location_id);
CREATE INDEX IF NOT EXISTS idx_stock_entries_batch_number ON stock_entries(batch_number);
CREATE INDEX IF NOT EXISTS idx_stock_entries_expiry_date ON stock_entries(expiry_date);
CREATE INDEX IF NOT EXISTS idx_stock_entries_deleted_at ON stock_entries(deleted_at);
CREATE INDEX IF NOT EXISTS idx_stock_entries_supplier_id ON stock_entries(supplier_id);

-- ===========================================================================
-- STOCK_LOGS TABLE (Immutable audit trail - INSERT ONLY)
-- ===========================================================================
CREATE TABLE IF NOT EXISTS stock_logs (
  id SERIAL PRIMARY KEY,
  entry_id INTEGER NOT NULL REFERENCES stock_entries(id),
  action VARCHAR(50) NOT NULL CHECK (action IN ('ADD', 'REMOVE', 'TRANSFER', 'ADJUST')),
  quantity_before INTEGER,
  quantity_after INTEGER NOT NULL,
  location_from INTEGER REFERENCES locations(id),
  location_to INTEGER REFERENCES locations(id),
  related_bill_id INTEGER,
  bill_type VARCHAR(50),
  reason TEXT,
  reference_id INTEGER,
  performed_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_location_transfer CHECK (
    (action != 'TRANSFER') OR (location_from IS NOT NULL AND location_to IS NOT NULL)
  )
);

-- Create indexes for audit queries
CREATE INDEX IF NOT EXISTS idx_stock_logs_entry_id ON stock_logs(entry_id);
CREATE INDEX IF NOT EXISTS idx_stock_logs_action ON stock_logs(action);
CREATE INDEX IF NOT EXISTS idx_stock_logs_created_at ON stock_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_stock_logs_performed_by ON stock_logs(performed_by);
CREATE INDEX IF NOT EXISTS idx_stock_logs_related_bill ON stock_logs(related_bill_id);

-- ===========================================================================
-- LOW_STOCK_ALERTS TABLE
-- ===========================================================================
CREATE TABLE IF NOT EXISTS low_stock_alerts (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id),
  minimum_quantity INTEGER NOT NULL,
  alert_threshold INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id)
);

CREATE INDEX IF NOT EXISTS idx_low_stock_product ON low_stock_alerts(product_id);
CREATE INDEX IF NOT EXISTS idx_low_stock_is_active ON low_stock_alerts(is_active);

-- ===========================================================================
-- LOCATION_TRANSFER_HISTORY TABLE (For tracking movements)
-- ===========================================================================
CREATE TABLE IF NOT EXISTS location_transfer_history (
  id SERIAL PRIMARY KEY,
  entry_id INTEGER NOT NULL REFERENCES stock_entries(id),
  from_location_id INTEGER NOT NULL REFERENCES locations(id),
  to_location_id INTEGER NOT NULL REFERENCES locations(id),
  quantity INTEGER NOT NULL,
  reason TEXT,
  transferred_at TIMESTAMPTZ DEFAULT NOW(),
  transferred_by INTEGER NOT NULL REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_transfer_entry ON location_transfer_history(entry_id);
CREATE INDEX IF NOT EXISTS idx_transfer_from_location ON location_transfer_history(from_location_id);
CREATE INDEX IF NOT EXISTS idx_transfer_to_location ON location_transfer_history(to_location_id);
CREATE INDEX IF NOT EXISTS idx_transfer_date ON location_transfer_history(transferred_at);

-- ===========================================================================
-- STOCK_RESERVATION TABLE (For bill processing)
-- ===========================================================================
CREATE TABLE IF NOT EXISTS stock_reservations (
  id SERIAL PRIMARY KEY,
  bill_id INTEGER NOT NULL,
  entry_id INTEGER NOT NULL REFERENCES stock_entries(id),
  quantity INTEGER NOT NULL,
  reserved_at TIMESTAMPTZ DEFAULT NOW(),
  released_at TIMESTAMPTZ,
  status VARCHAR(50) DEFAULT 'RESERVED' CHECK (status IN ('RESERVED', 'RELEASED', 'FULFILLED')),
  UNIQUE(bill_id, entry_id)
);

CREATE INDEX IF NOT EXISTS idx_reservations_bill ON stock_reservations(bill_id);
CREATE INDEX IF NOT EXISTS idx_reservations_entry ON stock_reservations(entry_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON stock_reservations(status);

-- ===========================================================================
-- Create helpful views for stock queries
-- ===========================================================================

-- View: Current stock by product
CREATE OR REPLACE VIEW v_product_stock AS
SELECT 
  p.id as product_id,
  p.name as product_name,
  COALESCE(SUM(se.quantity), 0) as total_quantity,
  COUNT(DISTINCT se.batch_number) as batch_count,
  MIN(se.expiry_date) as earliest_expiry,
  COUNT(DISTINCT se.location_id) as location_count
FROM products p
LEFT JOIN stock_entries se ON p.id = se.product_id AND se.deleted_at IS NULL
GROUP BY p.id, p.name;

-- View: Stock by location hierarchy
CREATE OR REPLACE VIEW v_stock_by_location AS
SELECT 
  l.id,
  l.name,
  l.type,
  l.parent_id,
  p.name as product_name,
  COALESCE(SUM(se.quantity), 0) as quantity,
  COUNT(DISTINCT se.batch_number) as batches
FROM locations l
LEFT JOIN stock_entries se ON l.id = se.location_id AND se.deleted_at IS NULL
LEFT JOIN products p ON se.product_id = p.id
GROUP BY l.id, l.name, l.type, l.parent_id, p.name;

-- View: Expiring stock within 30 days
CREATE OR REPLACE VIEW v_expiring_stock_soon AS
SELECT 
  se.id,
  p.name as product_name,
  l.name as location_name,
  se.batch_number,
  se.quantity,
  se.expiry_date,
  (se.expiry_date - CURRENT_DATE) as days_until_expiry
FROM stock_entries se
JOIN products p ON se.product_id = p.id
JOIN locations l ON se.location_id = l.id
WHERE se.deleted_at IS NULL
  AND se.expiry_date IS NOT NULL
  AND se.expiry_date <= (CURRENT_DATE + INTERVAL '30 days')
  AND se.quantity > 0
ORDER BY se.expiry_date ASC;

-- View: Low stock alerts
CREATE OR REPLACE VIEW v_low_stock_current AS
SELECT 
  p.id,
  p.name,
  COALESCE(SUM(se.quantity), 0) as current_quantity,
  lsa.minimum_quantity,
  lsa.alert_threshold,
  (COALESCE(SUM(se.quantity), 0) <= lsa.alert_threshold) as is_below_threshold
FROM products p
LEFT JOIN stock_entries se ON p.id = se.product_id AND se.deleted_at IS NULL
LEFT JOIN low_stock_alerts lsa ON p.id = lsa.product_id AND lsa.is_active = TRUE
WHERE lsa.id IS NOT NULL
GROUP BY p.id, p.name, lsa.minimum_quantity, lsa.alert_threshold;

-- ===========================================================================
-- Create trigger for updating stock_entries.updated_at
-- ===========================================================================
CREATE OR REPLACE FUNCTION update_stock_entries_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_stock_entries_update_timestamp ON stock_entries;
CREATE TRIGGER trigger_stock_entries_update_timestamp
BEFORE UPDATE ON stock_entries
FOR EACH ROW
EXECUTE FUNCTION update_stock_entries_timestamp();

-- ===========================================================================
-- Create function to add stock entry with audit log
-- ===========================================================================
CREATE OR REPLACE FUNCTION add_stock_entry(
  p_product_id INTEGER,
  p_location_id INTEGER,
  p_quantity INTEGER,
  p_batch_number VARCHAR,
  p_supplier_id INTEGER,
  p_bill_id INTEGER,
  p_expiry_date DATE,
  p_unit_cost NUMERIC,
  p_created_by INTEGER,
  p_reason TEXT DEFAULT 'Manual entry'
)
RETURNS TABLE (entry_id INTEGER, log_id INTEGER, success BOOLEAN) AS $$
DECLARE
  v_entry_id INTEGER;
  v_log_id INTEGER;
BEGIN
  -- Insert stock entry
  INSERT INTO stock_entries (
    product_id, location_id, quantity, batch_number,
    supplier_id, incoming_bill_id, expiry_date, unit_cost, created_by
  )
  VALUES (p_product_id, p_location_id, p_quantity, p_batch_number,
          p_supplier_id, p_bill_id, p_expiry_date, p_unit_cost, p_created_by)
  RETURNING stock_entries.id INTO v_entry_id;

  -- Insert audit log
  INSERT INTO stock_logs (
    entry_id, action, quantity_before, quantity_after,
    location_to, reason, performed_by
  )
  VALUES (v_entry_id, 'ADD', 0, p_quantity, p_location_id, p_reason, p_created_by)
  RETURNING stock_logs.id INTO v_log_id;

  RETURN QUERY SELECT v_entry_id, v_log_id, true;
END;
$$ LANGUAGE plpgsql;

-- ===========================================================================
-- Create function to remove stock entry
-- ===========================================================================
CREATE OR REPLACE FUNCTION remove_stock_entry(
  p_entry_id INTEGER,
  p_quantity_to_remove INTEGER,
  p_reason TEXT,
  p_bill_id INTEGER,
  p_performed_by INTEGER
)
RETURNS TABLE (success BOOLEAN, remaining_quantity INTEGER) AS $$
DECLARE
  v_current_quantity INTEGER;
  v_remaining INTEGER;
BEGIN
  -- Get current quantity
  SELECT quantity INTO v_current_quantity
  FROM stock_entries
  WHERE id = p_entry_id;

  IF v_current_quantity IS NULL THEN
    RETURN QUERY SELECT false, 0;
    RETURN;
  END IF;

  IF v_current_quantity < p_quantity_to_remove THEN
    RETURN QUERY SELECT false, v_current_quantity;
    RETURN;
  END IF;

  v_remaining := v_current_quantity - p_quantity_to_remove;

  -- Update stock entry
  UPDATE stock_entries
  SET quantity = v_remaining
  WHERE id = p_entry_id;

  -- Log the removal
  INSERT INTO stock_logs (
    entry_id, action, quantity_before, quantity_after,
    location_from, related_bill_id, reason, performed_by
  )
  SELECT 
    p_entry_id, 'REMOVE', v_current_quantity, v_remaining,
    location_id, p_bill_id, p_reason, p_performed_by
  FROM stock_entries
  WHERE id = p_entry_id;

  RETURN QUERY SELECT true, v_remaining;
END;
$$ LANGUAGE plpgsql;

-- ===========================================================================
-- Create function to transfer stock between locations
-- ===========================================================================
CREATE OR REPLACE FUNCTION transfer_stock(
  p_entry_id INTEGER,
  p_to_location_id INTEGER,
  p_quantity INTEGER,
  p_reason TEXT,
  p_performed_by INTEGER
)
RETURNS TABLE (success BOOLEAN, message VARCHAR) AS $$
DECLARE
  v_current_location_id INTEGER;
  v_current_quantity INTEGER;
BEGIN
  SELECT location_id, quantity INTO v_current_location_id, v_current_quantity
  FROM stock_entries
  WHERE id = p_entry_id;

  IF v_current_location_id IS NULL THEN
    RETURN QUERY SELECT false, 'Stock entry not found';
    RETURN;
  END IF;

  IF v_current_quantity < p_quantity THEN
    RETURN QUERY SELECT false, 'Insufficient quantity for transfer';
    RETURN;
  END IF;

  -- Update location
  UPDATE stock_entries
  SET location_id = p_to_location_id
  WHERE id = p_entry_id;

  -- Log transfer
  INSERT INTO location_transfer_history (
    entry_id, from_location_id, to_location_id, quantity,
    reason, transferred_by
  )
  VALUES (p_entry_id, v_current_location_id, p_to_location_id, p_quantity,
          p_reason, p_performed_by);

  INSERT INTO stock_logs (
    entry_id, action, quantity_before, quantity_after,
    location_from, location_to, reason, performed_by
  )
  VALUES (p_entry_id, 'TRANSFER', v_current_quantity, v_current_quantity,
          v_current_location_id, p_to_location_id, p_reason, p_performed_by);

  RETURN QUERY SELECT true, 'Stock transferred successfully';
END;
$$ LANGUAGE plpgsql;

/**
 * PHASE 6: Bill-to-Stock Integration Database Migration
 * 
 * This migration enhances the stock_entries and related tables to support
 * bidirectional integration between bills and stock management.
 * 
 * Changes:
 * - Add columns to link stock_entries to bills
 * - Create stock_reservations table for bill items
 * - Update triggers and functions
 * - Add views for bill-stock reconciliation
 */

-- ==========================================
-- STOCK_ENTRIES TABLE ENHANCEMENTS
-- ==========================================

-- Add bill-related columns to stock_entries
ALTER TABLE stock_entries
ADD COLUMN IF NOT EXISTS incoming_bill_id INTEGER,
ADD COLUMN IF NOT EXISTS outgoing_bill_id INTEGER,
ADD COLUMN IF NOT EXISTS bill_item_id INTEGER,
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE',
ADD CONSTRAINT fk_stock_entries_incoming_bill 
  FOREIGN KEY (incoming_bill_id) REFERENCES bills(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_stock_entries_outgoing_bill 
  FOREIGN KEY (outgoing_bill_id) REFERENCES bills(id) ON DELETE SET NULL;

-- ==========================================
-- STOCK_RESERVATIONS TABLE ENHANCEMENT
-- ==========================================

-- Ensure stock_reservations has all required columns
ALTER TABLE stock_reservations
ADD COLUMN IF NOT EXISTS bill_item_id INTEGER,
ADD COLUMN IF NOT EXISTS fulfilled_from_entry_id INTEGER,
ADD COLUMN IF NOT EXISTS fulfilled_quantity INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS fulfilled_at TIMESTAMP,
ADD CONSTRAINT fk_stock_reservations_bill_item 
  FOREIGN KEY (bill_item_id) REFERENCES bill_items(id) ON DELETE CASCADE,
ADD CONSTRAINT fk_stock_reservations_fulfilled_entry 
  FOREIGN KEY (fulfilled_from_entry_id) REFERENCES stock_entries(id) ON DELETE SET NULL;

-- ==========================================
-- BILL_ITEMS TABLE ENHANCEMENTS
-- ==========================================

-- Add stock tracking to bill_items
ALTER TABLE bill_items
ADD COLUMN IF NOT EXISTS stock_fulfilled INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS stock_reserved INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS fulfillment_status VARCHAR(50) DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS notes TEXT;

-- ==========================================
-- VIEWS FOR BILL-STOCK INTEGRATION
-- ==========================================

-- View: Bill items with stock status
CREATE OR REPLACE VIEW v_bill_stock_status AS
SELECT
  bi.id AS bill_item_id,
  bi.bill_id,
  b.bill_type,
  b.bill_number,
  b.status AS bill_status,
  p.id AS product_id,
  p.sku,
  p.name,
  bi.quantity AS ordered_quantity,
  COALESCE(bi.stock_fulfilled, 0) AS fulfilled_quantity,
  COALESCE(bi.stock_reserved, 0) AS reserved_quantity,
  CASE
    WHEN bi.quantity = COALESCE(bi.stock_fulfilled, 0) THEN 'FULFILLED'
    WHEN COALESCE(bi.stock_reserved, 0) > 0 THEN 'RESERVED'
    ELSE 'PENDING'
  END AS fulfillment_status,
  bi.quantity - COALESCE(bi.stock_fulfilled, 0) AS pending_quantity,
  bi.unit_price,
  bi.line_total
FROM bill_items bi
JOIN bills b ON bi.bill_id = b.id
JOIN parts p ON bi.part_id = p.id
WHERE b.deleted_at IS NULL;

-- View: Stock entries linked to bills
CREATE OR REPLACE VIEW v_stock_from_bills AS
SELECT
  se.id AS stock_entry_id,
  se.part_id,
  p.sku,
  p.name,
  se.location_id,
  l.name AS location_name,
  se.quantity,
  se.batch_number,
  se.expiry_date,
  se.unit_cost,
  b.id AS related_bill_id,
  b.bill_number,
  b.bill_type,
  CASE
    WHEN se.incoming_bill_id IS NOT NULL THEN 'FROM_PURCHASE'
    WHEN se.outgoing_bill_id IS NOT NULL THEN 'FROM_SALE'
    ELSE 'MANUAL'
  END AS stock_source,
  se.created_at,
  se.created_by
FROM stock_entries se
JOIN parts p ON se.part_id = p.id
JOIN locations l ON se.location_id = l.id
LEFT JOIN bills b ON (se.incoming_bill_id = b.id OR se.outgoing_bill_id = b.id)
WHERE se.deleted_at IS NULL;

-- View: Pending bill items needing stock allocation
CREATE OR REPLACE VIEW v_pending_bill_allocations AS
SELECT
  bi.id AS bill_item_id,
  bi.bill_id,
  b.bill_number,
  b.bill_type,
  b.bill_date,
  p.id AS product_id,
  p.sku,
  p.name,
  bi.quantity,
  COALESCE(bi.stock_fulfilled, 0) AS fulfilled,
  COALESCE(bi.stock_reserved, 0) AS reserved,
  bi.quantity - COALESCE(bi.stock_fulfilled, 0) - COALESCE(bi.stock_reserved, 0) AS needed,
  COALESCE(SUM(se.quantity), 0) AS available_stock
FROM bill_items bi
JOIN bills b ON bi.bill_id = b.id
JOIN parts p ON bi.part_id = p.id
LEFT JOIN stock_entries se ON (
  se.part_id = p.id
  AND se.quantity > 0
  AND se.outgoing_bill_id IS NULL
  AND se.deleted_at IS NULL
)
WHERE b.status IN ('CONFIRMED', 'PARTIALLY_PAID', 'PAID')
  AND bi.fulfillment_status != 'FULFILLED'
  AND b.deleted_at IS NULL
GROUP BY bi.id, bi.bill_id, b.bill_number, b.bill_type, b.bill_date, 
         p.id, p.sku, p.name, bi.quantity, bi.stock_fulfilled, bi.stock_reserved;

-- ==========================================
-- FUNCTIONS FOR BILL-STOCK INTEGRATION
-- ==========================================

-- Function: Allocate stock to bill item (FIFO)
CREATE OR REPLACE FUNCTION allocate_stock_to_bill_item(
  p_bill_item_id INTEGER,
  p_part_id INTEGER,
  p_quantity INTEGER,
  p_location_id INTEGER DEFAULT NULL
)
RETURNS TABLE(
  allocated_quantity INTEGER,
  entries_used INTEGER,
  total_cost NUMERIC
) AS $$
DECLARE
  v_remaining INTEGER := p_quantity;
  v_entries_used INTEGER := 0;
  v_total_cost NUMERIC := 0;
  v_entry RECORD;
  v_allocate_qty INTEGER;
  v_allocated_cost NUMERIC;
BEGIN
  -- Allocate stock using FIFO (oldest first)
  FOR v_entry IN
    SELECT
      id,
      quantity,
      unit_cost,
      location_id
    FROM stock_entries
    WHERE part_id = p_part_id
      AND deleted_at IS NULL
      AND outgoing_bill_id IS NULL
      AND quantity > 0
      AND (p_location_id IS NULL OR location_id = p_location_id)
    ORDER BY created_at ASC, id ASC
  LOOP
    IF v_remaining <= 0 THEN
      EXIT;
    END IF;

    v_allocate_qty := LEAST(v_remaining, v_entry.quantity);
    v_allocated_cost := v_allocate_qty * COALESCE(v_entry.unit_cost, 0);

    -- Create reservation
    INSERT INTO stock_reservations (
      stock_entry_id, bill_item_id, reserved_quantity, status
    ) VALUES (
      v_entry.id, p_bill_item_id, v_allocate_qty, 'RESERVED'
    );

    -- Update stock entry
    UPDATE stock_entries
    SET quantity = quantity - v_allocate_qty
    WHERE id = v_entry.id;

    -- Update bill item reservation
    UPDATE bill_items
    SET stock_reserved = COALESCE(stock_reserved, 0) + v_allocate_qty
    WHERE id = p_bill_item_id;

    v_remaining := v_remaining - v_allocate_qty;
    v_entries_used := v_entries_used + 1;
    v_total_cost := v_total_cost + v_allocated_cost;
  END LOOP;

  RETURN QUERY SELECT v_remaining, v_entries_used, v_total_cost;
END;
$$ LANGUAGE plpgsql;

-- Function: Fulfill bill item from reserved stock
CREATE OR REPLACE FUNCTION fulfill_bill_item_from_reservations(
  p_bill_item_id INTEGER,
  p_quantity INTEGER
)
RETURNS TABLE(
  fulfilled_quantity INTEGER,
  reservations_used INTEGER
) AS $$
DECLARE
  v_remaining INTEGER := p_quantity;
  v_reservations_used INTEGER := 0;
  v_reservation RECORD;
  v_fulfill_qty INTEGER;
BEGIN
  -- Fulfill using reserved stock (FIFO)
  FOR v_reservation IN
    SELECT
      id,
      stock_entry_id,
      reserved_quantity
    FROM stock_reservations
    WHERE bill_item_id = p_bill_item_id
      AND status = 'RESERVED'
    ORDER BY created_at ASC
  LOOP
    IF v_remaining <= 0 THEN
      EXIT;
    END IF;

    v_fulfill_qty := LEAST(v_remaining, v_reservation.reserved_quantity);

    -- Update reservation
    UPDATE stock_reservations
    SET
      status = CASE
        WHEN reserved_quantity - v_fulfill_qty = 0 THEN 'FULFILLED'
        ELSE 'PARTIALLY_FULFILLED'
      END,
      fulfilled_quantity = COALESCE(fulfilled_quantity, 0) + v_fulfill_qty,
      fulfilled_at = NOW()
    WHERE id = v_reservation.id;

    -- Update bill item
    UPDATE bill_items
    SET
      stock_fulfilled = COALESCE(stock_fulfilled, 0) + v_fulfill_qty,
      stock_reserved = stock_reserved - v_fulfill_qty,
      fulfillment_status = CASE
        WHEN stock_fulfilled + v_fulfill_qty >= quantity THEN 'FULFILLED'
        ELSE 'PARTIALLY_FULFILLED'
      END
    WHERE id = p_bill_item_id;

    v_remaining := v_remaining - v_fulfill_qty;
    v_reservations_used := v_reservations_used + 1;
  END LOOP;

  RETURN QUERY SELECT v_remaining, v_reservations_used;
END;
$$ LANGUAGE plpgsql;

-- Function: Create stock from purchase bill
CREATE OR REPLACE FUNCTION create_stock_from_bill(
  p_bill_id INTEGER,
  p_location_id INTEGER DEFAULT 1
)
RETURNS TABLE(
  entries_created INTEGER,
  total_quantity INTEGER,
  total_cost NUMERIC
) AS $$
DECLARE
  v_entries_created INTEGER := 0;
  v_total_quantity INTEGER := 0;
  v_total_cost NUMERIC := 0;
  v_bill_item RECORD;
  v_new_entry_id INTEGER;
BEGIN
  -- Only process PURCHASE bills
  IF NOT EXISTS(
    SELECT 1 FROM bills WHERE id = p_bill_id AND bill_type = 'PURCHASE'
  ) THEN
    RETURN QUERY SELECT 0, 0, 0;
    RETURN;
  END IF;

  -- Create stock_entries for each bill item
  FOR v_bill_item IN
    SELECT
      bi.id,
      bi.part_id,
      bi.quantity,
      bi.unit_price,
      b.party_id AS supplier_id,
      b.created_by
    FROM bill_items bi
    JOIN bills b ON bi.bill_id = b.id
    WHERE bi.bill_id = p_bill_id
  LOOP
    -- Create batch number
    INSERT INTO stock_entries (
      part_id,
      location_id,
      quantity,
      batch_number,
      supplier_id,
      unit_cost,
      incoming_bill_id,
      bill_item_id,
      created_by
    ) VALUES (
      v_bill_item.part_id,
      p_location_id,
      v_bill_item.quantity,
      'BILL-' || p_bill_id || '-ITEM-' || v_bill_item.id,
      v_bill_item.supplier_id,
      v_bill_item.unit_price,
      p_bill_id,
      v_bill_item.id,
      v_bill_item.created_by
    ) RETURNING id INTO v_new_entry_id;

    v_entries_created := v_entries_created + 1;
    v_total_quantity := v_total_quantity + v_bill_item.quantity;
    v_total_cost := v_total_cost + (v_bill_item.quantity * v_bill_item.unit_price);
  END LOOP;

  RETURN QUERY SELECT v_entries_created, v_total_quantity, v_total_cost;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_stock_entries_incoming_bill 
  ON stock_entries(incoming_bill_id);

CREATE INDEX IF NOT EXISTS idx_stock_entries_outgoing_bill 
  ON stock_entries(outgoing_bill_id);

CREATE INDEX IF NOT EXISTS idx_stock_entries_bill_item 
  ON stock_entries(bill_item_id);

CREATE INDEX IF NOT EXISTS idx_stock_reservations_bill_item 
  ON stock_reservations(bill_item_id);

CREATE INDEX IF NOT EXISTS idx_bill_items_fulfillment 
  ON bill_items(fulfillment_status, stock_fulfilled);

-- ==========================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ==========================================

-- Trigger: Update bill_items fulfillment status when stock_fulfilled changes
CREATE OR REPLACE FUNCTION update_bill_item_fulfillment_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stock_fulfilled >= NEW.quantity THEN
    NEW.fulfillment_status := 'FULFILLED';
  ELSIF NEW.stock_fulfilled > 0 THEN
    NEW.fulfillment_status := 'PARTIALLY_FULFILLED';
  ELSE
    NEW.fulfillment_status := 'PENDING';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF NOT EXISTS trigger_bill_items_fulfillment ON bill_items;
CREATE TRIGGER trigger_bill_items_fulfillment
BEFORE UPDATE ON bill_items
FOR EACH ROW
EXECUTE FUNCTION update_bill_item_fulfillment_status();

-- ==========================================
-- MIGRATION VERIFICATION
-- ==========================================

-- Verify schema is updated
DO $$
BEGIN
  -- Check if columns exist
  PERFORM 1 FROM information_schema.columns 
    WHERE table_name = 'stock_entries' 
    AND column_name = 'incoming_bill_id';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Migration failed: incoming_bill_id column not found';
  END IF;

  RAISE NOTICE 'Phase 6 Migration completed successfully';
END $$;

/**
 * Bill-Stock Integration Service
 * 
 * Handles integration between billing and stock management systems:
 * - Auto-create stock from purchase bills
 * - Auto-allocate and reserve stock for sales bills
 * - Fulfill bill items from reserved stock
 * - Track bill-stock linkage
 */

const { pool } = require('../../../db');

class BillStockService {
  /**
   * Create stock entries from a purchase bill
   * When a purchase bill is confirmed, create corresponding stock_entries
   * @param {number} billId - Purchase bill ID
   * @param {number} locationId - Warehouse location for incoming stock (default: 1)
   * @param {number} userId - User performing operation
   * @returns {Object} Creation result
   */
  async createStockFromPurchaseBill(billId, locationId = 1, userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Verify bill exists and is purchase type
      const billResult = await client.query(
        'SELECT id, bill_type, bill_number, status FROM bills WHERE id = $1',
        [billId]
      );

      if (billResult.rowCount === 0) {
        throw new Error('Bill not found');
      }

      const bill = billResult.rows[0];
      if (bill.bill_type !== 'PURCHASE') {
        throw new Error('Only PURCHASE bills can create stock entries');
      }

      if (bill.status !== 'CONFIRMED') {
        throw new Error('Bill must be CONFIRMED to create stock');
      }

      // Get bill items
      const itemsResult = await client.query(
        `SELECT bi.id, bi.part_id, bi.quantity, bi.unit_price
         FROM bill_items bi WHERE bi.bill_id = $1`,
        [billId]
      );

      if (itemsResult.rowCount === 0) {
        throw new Error('Bill has no items');
      }

      // Verify location exists
      const locationResult = await client.query(
        'SELECT id FROM locations WHERE id = $1',
        [locationId]
      );

      if (locationResult.rowCount === 0) {
        throw new Error(`Location ${locationId} not found`);
      }

      let entriesCreated = 0;
      let totalQuantity = 0;
      let totalCost = 0;

      // Create stock entry for each bill item
      for (const item of itemsResult.rows) {
        const batchNumber = `BILL-${billId}-ITEM-${item.id}-${Date.now()}`;

        const entryResult = await client.query(
          `INSERT INTO stock_entries (
            product_id, location_id, quantity, batch_number,
            supplier_id, unit_cost, incoming_bill_id, bill_item_id,
            created_by, reason
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING id, quantity, unit_cost`,
          [
            item.part_id,
            locationId,
            item.quantity,
            batchNumber,
            bill.party_id, // Supplier ID from bill
            item.unit_price,
            billId,
            item.id,
            userId,
            `Stock from purchase bill ${bill.bill_number}`
          ]
        );

        const entry = entryResult.rows[0];
        entriesCreated += 1;
        totalQuantity += entry.quantity;
        totalCost += entry.quantity * entry.unit_cost;

        // Create audit log
        await client.query(
          `INSERT INTO stock_logs (entry_id, action, quantity_delta, reference_id, performed_by, reason)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [entry.id, 'ADD', entry.quantity, billId, userId, `From purchase bill ${bill.bill_number}`]
        );

        // Check and create low stock alert if needed
        await this.checkAndCreateLowStockAlert(client, item.part_id);
      }

      // Update bill with stock creation status
      await client.query(
        `UPDATE bills SET stock_created = TRUE WHERE id = $1`,
        [billId]
      );

      await client.query('COMMIT');

      return {
        success: true,
        billId,
        entriesCreated,
        totalQuantity,
        totalCost,
        message: `Created ${entriesCreated} stock entries from bill ${bill.bill_number}`
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Allocate and reserve stock for a sales bill item
   * Uses FIFO (First In, First Out) strategy
   * @param {number} billItemId - Bill item ID
   * @param {number} productId - Product to allocate
   * @param {number} quantity - Quantity to allocate
   * @param {number} locationId - Preferred location (optional)
   * @param {number} userId - User performing operation
   * @returns {Object} Allocation result
   */
  async allocateStockToBillItem(billItemId, productId, quantity, locationId = null, userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Verify bill item exists
      const itemResult = await client.query(
        'SELECT id, bill_id, part_id, quantity FROM bill_items WHERE id = $1',
        [billItemId]
      );

      if (itemResult.rowCount === 0) {
        throw new Error('Bill item not found');
      }

      const billItem = itemResult.rows[0];
      if (billItem.part_id !== productId) {
        throw new Error('Product ID does not match bill item');
      }

      // Check available stock
      const availableResult = await client.query(
        `SELECT COALESCE(SUM(quantity), 0) as available
         FROM stock_entries
         WHERE product_id = $1
           AND deleted_at IS NULL
           AND outgoing_bill_id IS NULL
           AND quantity > 0
           ${locationId ? 'AND location_id = $2' : ''}`,
        locationId ? [productId, locationId] : [productId]
      );

      const available = availableResult.rows[0].available;
      if (available < quantity) {
        throw new Error(
          `Insufficient stock: available=${available}, needed=${quantity}`
        );
      }

      // Allocate using FIFO (oldest first)
      let allocated = 0;
      let entries = [];

      const stockResult = await client.query(
        `SELECT id, quantity, unit_cost, location_id
         FROM stock_entries
         WHERE product_id = $1
           AND deleted_at IS NULL
           AND outgoing_bill_id IS NULL
           AND quantity > 0
           ${locationId ? 'AND location_id = $2' : ''}
         ORDER BY created_at ASC, id ASC`,
        locationId ? [productId, locationId] : [productId]
      );

      for (const entry of stockResult.rows) {
        if (allocated >= quantity) break;

        const toAllocate = Math.min(quantity - allocated, entry.quantity);

        // Create reservation
        const reservationResult = await client.query(
          `INSERT INTO stock_reservations (
            stock_entry_id, bill_item_id, reserved_quantity, status
          ) VALUES ($1, $2, $3, 'RESERVED')
          RETURNING id`,
          [entry.id, billItemId, toAllocate]
        );

        // Update stock entry quantity
        await client.query(
          'UPDATE stock_entries SET quantity = quantity - $1 WHERE id = $2',
          [toAllocate, entry.id]
        );

        allocated += toAllocate;
        entries.push({
          stockEntryId: entry.id,
          allocatedQuantity: toAllocate,
          reservationId: reservationResult.rows[0].id
        });

        // Log allocation
        await client.query(
          `INSERT INTO stock_logs (entry_id, action, quantity_delta, reference_id, performed_by, reason)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            entry.id,
            'RESERVE',
            -toAllocate,
            billItemId,
            userId,
            `Reserved for bill item ${billItemId}`
          ]
        );
      }

      // Update bill item with reservation info
      await client.query(
        `UPDATE bill_items 
         SET stock_reserved = COALESCE(stock_reserved, 0) + $1
         WHERE id = $2`,
        [allocated, billItemId]
      );

      await client.query('COMMIT');

      return {
        success: true,
        billItemId,
        allocated,
        requested: quantity,
        shortage: Math.max(0, quantity - allocated),
        entries,
        message: allocated === quantity
          ? `Successfully allocated ${allocated} units`
          : `Allocated ${allocated} of ${quantity} requested units`
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Fulfill a bill item from its reserved stock
   * Converts reservations to actual fulfillment
   * @param {number} billItemId - Bill item ID
   * @param {number} quantity - Quantity to fulfill
   * @param {number} userId - User performing operation
   * @returns {Object} Fulfillment result
   */
  async fulfillBillItem(billItemId, quantity = null, userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get bill item details
      const itemResult = await client.query(
        'SELECT id, bill_id, quantity, stock_reserved FROM bill_items WHERE id = $1',
        [billItemId]
      );

      if (itemResult.rowCount === 0) {
        throw new Error('Bill item not found');
      }

      const billItem = itemResult.rows[0];
      const fulfillQuantity = quantity || billItem.stock_reserved;

      if (fulfillQuantity > billItem.stock_reserved) {
        throw new Error(
          `Cannot fulfill ${fulfillQuantity} units, only ${billItem.stock_reserved} reserved`
        );
      }

      // Get reservations for this bill item (FIFO)
      const reservationsResult = await client.query(
        `SELECT sr.id, sr.stock_entry_id, sr.reserved_quantity
         FROM stock_reservations sr
         WHERE sr.bill_item_id = $1 AND sr.status = 'RESERVED'
         ORDER BY sr.created_at ASC`,
        [billItemId]
      );

      let fulfilled = 0;
      let fulfillmentRecords = [];

      for (const reservation of reservationsResult.rows) {
        if (fulfilled >= fulfillQuantity) break;

        const toFulfill = Math.min(fulfillQuantity - fulfilled, reservation.reserved_quantity);

        // Update reservation
        await client.query(
          `UPDATE stock_reservations
           SET status = 'FULFILLED',
               fulfilled_quantity = $1,
               fulfilled_at = NOW()
           WHERE id = $2`,
          [toFulfill, reservation.id]
        );

        // Link to stock entry as outgoing
        const billResult = await client.query(
          'SELECT id FROM bills WHERE id IN (SELECT bill_id FROM bill_items WHERE id = $1)',
          [billItemId]
        );

        if (billResult.rowCount > 0) {
          const billId = billResult.rows[0].id;
          await client.query(
            `UPDATE stock_entries SET outgoing_bill_id = $1 WHERE id = $2`,
            [billId, reservation.stock_entry_id]
          );
        }

        fulfilled += toFulfill;
        fulfillmentRecords.push({
          reservationId: reservation.id,
          stockEntryId: reservation.stock_entry_id,
          fulfilledQuantity: toFulfill
        });

        // Log fulfillment
        await client.query(
          `INSERT INTO stock_logs (entry_id, action, quantity_delta, reference_id, performed_by, reason)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            reservation.stock_entry_id,
            'FULFILL',
            -toFulfill,
            billItemId,
            userId,
            `Fulfilled for bill item ${billItemId}`
          ]
        );
      }

      // Update bill item fulfillment status
      const newFulfilled = (billItem.stock_fulfilled || 0) + fulfilled;
      const fulfillmentStatus = newFulfilled >= billItem.quantity
        ? 'FULFILLED'
        : newFulfilled > 0 ? 'PARTIALLY_FULFILLED' : 'PENDING';

      await client.query(
        `UPDATE bill_items
         SET stock_fulfilled = $1,
             stock_reserved = stock_reserved - $2,
             fulfillment_status = $3
         WHERE id = $4`,
        [newFulfilled, fulfilled, fulfillmentStatus, billItemId]
      );

      await client.query('COMMIT');

      return {
        success: true,
        billItemId,
        fulfilled,
        requested: fulfillQuantity,
        totalFulfilled: newFulfilled,
        fulfillmentStatus,
        records: fulfillmentRecords,
        message: `Fulfilled ${fulfilled} units for bill item ${billItemId}`
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get bill-stock status for a specific bill
   * Shows stock allocation status for all items
   * @param {number} billId - Bill ID
   * @returns {Object} Bill stock status
   */
  async getBillStockStatus(billId) {
    try {
      const result = await pool.query(
        `SELECT
          b.id,
          b.bill_number,
          b.bill_type,
          b.status,
          COUNT(bi.id) as total_items,
          SUM(CASE WHEN bi.fulfillment_status = 'FULFILLED' THEN 1 ELSE 0 END) as fulfilled_items,
          SUM(CASE WHEN bi.fulfillment_status = 'PARTIALLY_FULFILLED' THEN 1 ELSE 0 END) as partial_items,
          SUM(CASE WHEN bi.fulfillment_status = 'PENDING' THEN 1 ELSE 0 END) as pending_items,
          json_agg(
            json_build_object(
              'billItemId', bi.id,
              'productId', p.id,
              'productName', p.name,
              'ordered', bi.quantity,
              'fulfilled', COALESCE(bi.stock_fulfilled, 0),
              'reserved', COALESCE(bi.stock_reserved, 0),
              'pending', bi.quantity - COALESCE(bi.stock_fulfilled, 0),
              'fulfillmentStatus', bi.fulfillment_status
            )
          ) as items
        FROM bills b
        LEFT JOIN bill_items bi ON b.id = bi.bill_id
        LEFT JOIN parts p ON bi.part_id = p.id
        WHERE b.id = $1
        GROUP BY b.id, b.bill_number, b.bill_type, b.status`,
        [billId]
      );

      if (result.rowCount === 0) {
        throw new Error('Bill not found');
      }

      return {
        success: true,
        data: result.rows[0]
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get pending stock allocations for a bill
   * Shows what stock needs to be allocated
   * @param {number} billId - Bill ID
   * @returns {Array} Pending allocations
   */
  async getPendingAllocations(billId) {
    try {
      const result = await pool.query(
        `SELECT
          bi.id as bill_item_id,
          b.bill_number,
          p.id as product_id,
          p.sku,
          p.name,
          bi.quantity as needed,
          COALESCE(bi.stock_reserved, 0) as reserved,
          COALESCE(bi.stock_fulfilled, 0) as fulfilled,
          bi.quantity - COALESCE(bi.stock_fulfilled, 0) - COALESCE(bi.stock_reserved, 0) as pending,
          (SELECT COALESCE(SUM(quantity), 0) FROM stock_entries
           WHERE product_id = p.id AND deleted_at IS NULL AND outgoing_bill_id IS NULL) as available
        FROM bill_items bi
        JOIN bills b ON bi.bill_id = b.id
        JOIN parts p ON bi.part_id = p.id
        WHERE b.id = $1
          AND bi.fulfillment_status != 'FULFILLED'
        ORDER BY p.name`,
        [billId]
      );

      return {
        success: true,
        data: result.rows
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check and create low stock alert if threshold exceeded
   * @param {Object} client - Database client
   * @param {number} productId - Product to check
   * @private
   */
  async checkAndCreateLowStockAlert(client, productId) {
    try {
      const alertResult = await client.query(
        `SELECT id, threshold FROM low_stock_alerts
         WHERE product_id = $1 AND deleted_at IS NULL`,
        [productId]
      );

      if (alertResult.rowCount > 0) {
        const alert = alertResult.rows[0];

        const stockResult = await client.query(
          `SELECT COALESCE(SUM(quantity), 0) as total
           FROM stock_entries
           WHERE product_id = $1 AND deleted_at IS NULL AND outgoing_bill_id IS NULL`,
          [productId]
        );

        const currentStock = stockResult.rows[0].total;

        if (currentStock <= alert.threshold) {
          await client.query(
            `UPDATE low_stock_alerts
             SET current_stock = $1, last_notified_at = NOW()
             WHERE id = $2`,
            [currentStock, alert.id]
          );
        }
      }
    } catch (error) {
      // Non-critical: Don't throw, just log
      console.error('Error checking low stock alert:', error);
    }
  }

  /**
   * Get bill-to-stock linkage summary
   * Shows relationship between bills and stock
   * @param {number} billType - PURCHASE or SALE (optional)
   * @param {number} days - Last N days (optional)
   * @returns {Array} Bill-stock linkages
   */
  async getBillStockLinkage(billType = null, days = 30) {
    try {
      let query = `
        SELECT
          b.id as bill_id,
          b.bill_number,
          b.bill_type,
          b.status,
          b.created_at,
          COUNT(DISTINCT se.id) as linked_stock_entries,
          SUM(se.quantity) as total_quantity,
          SUM(se.quantity * COALESCE(se.unit_cost, 0)) as total_value,
          CASE
            WHEN b.bill_type = 'PURCHASE' THEN 'Incoming Stock'
            WHEN b.bill_type = 'SALE' THEN 'Outgoing Stock'
          END as stock_direction
        FROM bills b
        LEFT JOIN stock_entries se ON (
          (se.incoming_bill_id = b.id AND b.bill_type = 'PURCHASE')
          OR (se.outgoing_bill_id = b.id AND b.bill_type = 'SALE')
        )
        WHERE b.deleted_at IS NULL
          AND b.status IN ('CONFIRMED', 'PARTIALLY_PAID', 'PAID')
          AND b.created_at > NOW() - INTERVAL '1 day' * $1
          ${billType ? 'AND b.bill_type = $2' : ''}
        GROUP BY b.id, b.bill_number, b.bill_type, b.status, b.created_at
        ORDER BY b.created_at DESC
      `;

      const params = [days];
      if (billType) params.push(billType);

      const result = await pool.query(query, params);

      return {
        success: true,
        data: result.rows
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new BillStockService();

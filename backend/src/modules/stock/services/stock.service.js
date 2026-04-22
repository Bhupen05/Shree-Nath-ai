/**
 * Stock Service - Core Business Logic
 * Handles all stock operations with transaction support and audit logging
 */

const { pool } = require('../../../db');

class StockService {
  /**
   * Add stock entry with validation and audit logging
   * @param {Object} data - Stock entry data
   * @param {Integer} userId - User ID performing action
   * @returns {Promise<Object>} - Created entry with log
   */
  async addStockEntry(data, userId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Validate input
      this.validateAddStockInput(data);

      // Check if product exists
      const productResult = await client.query(
        'SELECT id FROM products WHERE id = $1',
        [data.product_id]
      );

      if (productResult.rows.length === 0) {
        throw new Error('Product not found');
      }

      // Check if location exists
      const locationResult = await client.query(
        'SELECT id, type FROM locations WHERE id = $1',
        [data.location_id]
      );

      if (locationResult.rows.length === 0) {
        throw new Error('Location not found');
      }

      // Check for duplicate batch number at same location
      const duplicateResult = await client.query(
        `SELECT id FROM stock_entries 
         WHERE product_id = $1 AND location_id = $2 
         AND batch_number = $3 AND deleted_at IS NULL`,
        [data.product_id, data.location_id, data.batch_number]
      );

      if (duplicateResult.rows.length > 0) {
        throw new Error('Batch number already exists at this location');
      }

      // Insert stock entry
      const entryResult = await client.query(
        `INSERT INTO stock_entries (
          product_id, location_id, quantity, batch_number,
          supplier_id, incoming_bill_id, expiry_date, unit_cost, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, product_id, location_id, quantity, batch_number, created_at`,
        [
          data.product_id,
          data.location_id,
          data.quantity,
          data.batch_number,
          data.supplier_id || null,
          data.incoming_bill_id || null,
          data.expiry_date || null,
          data.unit_cost || null,
          userId
        ]
      );

      const entryId = entryResult.rows[0].id;

      // Create audit log
      const logResult = await client.query(
        `INSERT INTO stock_logs (
          entry_id, action, quantity_before, quantity_after,
          location_to, reason, performed_by
        ) VALUES ($1, 'ADD', 0, $2, $3, $4, $5)
        RETURNING id, created_at`,
        [entryId, data.quantity, data.location_id, data.reason || 'Stock added', userId]
      );

      // Check for low stock and create alert if needed
      await this.checkAndCreateLowStockAlert(client, data.product_id);

      await client.query('COMMIT');

      return {
        entry: entryResult.rows[0],
        log: logResult.rows[0],
        success: true
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Failed to add stock: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Get all stock entries with pagination and filtering
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} - Stock entries
   */
  async getAllStockEntries(filters = {}) {
    const { 
      product_id, 
      location_id, 
      limit = 50, 
      offset = 0,
      batch_number,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = filters;

    let query = `
      SELECT se.*, p.name as product_name, l.name as location_name
      FROM stock_entries se
      JOIN products p ON se.product_id = p.id
      JOIN locations l ON se.location_id = l.id
      WHERE se.deleted_at IS NULL
    `;

    const params = [];
    let paramCount = 1;

    if (product_id) {
      query += ` AND se.product_id = $${paramCount}`;
      params.push(product_id);
      paramCount++;
    }

    if (location_id) {
      query += ` AND se.location_id = $${paramCount}`;
      params.push(location_id);
      paramCount++;
    }

    if (batch_number) {
      query += ` AND se.batch_number ILIKE $${paramCount}`;
      params.push(`%${batch_number}%`);
      paramCount++;
    }

    // Validate sort_by to prevent SQL injection
    const allowedSortFields = ['created_at', 'quantity', 'batch_number', 'expiry_date'];
    const safeSortBy = allowedSortFields.includes(sort_by) ? sort_by : 'created_at';
    const safeSortOrder = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    query += ` ORDER BY se.${safeSortBy} ${safeSortOrder}`;
    query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Get single stock entry with full history
   * @param {Integer} entryId - Stock entry ID
   * @returns {Promise<Object>} - Entry with history
   */
  async getStockEntryById(entryId) {
    const entryResult = await pool.query(
      `SELECT se.*, p.name as product_name, l.name as location_name
       FROM stock_entries se
       JOIN products p ON se.product_id = p.id
       JOIN locations l ON se.location_id = l.id
       WHERE se.id = $1 AND se.deleted_at IS NULL`,
      [entryId]
    );

    if (entryResult.rows.length === 0) {
      throw new Error('Stock entry not found');
    }

    // Get audit history
    const historyResult = await pool.query(
      `SELECT sl.*, u.name as performed_by_name
       FROM stock_logs sl
       JOIN users u ON sl.performed_by = u.id
       WHERE sl.entry_id = $1
       ORDER BY sl.created_at DESC`,
      [entryId]
    );

    return {
      entry: entryResult.rows[0],
      history: historyResult.rows
    };
  }

  /**
   * Get stock by product (all batches)
   * @param {Integer} productId - Product ID
   * @returns {Promise<Array>} - All batches for product
   */
  async getStockByProduct(productId) {
    const result = await pool.query(
      `SELECT se.*, l.name as location_name, l.type as location_type
       FROM stock_entries se
       JOIN locations l ON se.location_id = l.id
       WHERE se.product_id = $1 AND se.deleted_at IS NULL
       ORDER BY se.created_at DESC`,
      [productId]
    );

    return result.rows;
  }

  /**
   * Get stock by location
   * @param {Integer} locationId - Location ID
   * @returns {Promise<Array>} - Stock at location
   */
  async getStockByLocation(locationId) {
    const result = await pool.query(
      `SELECT se.*, p.name as product_name
       FROM stock_entries se
       JOIN products p ON se.product_id = p.id
       WHERE se.location_id = $1 AND se.deleted_at IS NULL
       ORDER BY p.name, se.batch_number`,
      [locationId]
    );

    return result.rows;
  }

  /**
   * Get low stock items
   * @returns {Promise<Array>} - Low stock items
   */
  async getLowStockItems() {
    const result = await pool.query(
      `SELECT 
        p.id, p.name, 
        COALESCE(SUM(se.quantity), 0) as current_quantity,
        lsa.alert_threshold,
        lsa.minimum_quantity
      FROM products p
      LEFT JOIN stock_entries se ON p.id = se.product_id AND se.deleted_at IS NULL
      LEFT JOIN low_stock_alerts lsa ON p.id = lsa.product_id AND lsa.is_active = TRUE
      WHERE lsa.id IS NOT NULL
      GROUP BY p.id, p.name, lsa.alert_threshold, lsa.minimum_quantity
      HAVING COALESCE(SUM(se.quantity), 0) <= lsa.alert_threshold`
    );

    return result.rows;
  }

  /**
   * Get expiring stock
   * @returns {Promise<Array>} - Expiring items
   */
  async getExpiringStock() {
    const result = await pool.query(
      `SELECT se.*, p.name as product_name, l.name as location_name,
              (se.expiry_date - CURRENT_DATE) as days_until_expiry
       FROM stock_entries se
       JOIN products p ON se.product_id = p.id
       JOIN locations l ON se.location_id = l.id
       WHERE se.deleted_at IS NULL
         AND se.expiry_date IS NOT NULL
         AND se.expiry_date <= (CURRENT_DATE + INTERVAL '30 days')
         AND se.quantity > 0
       ORDER BY se.expiry_date ASC`
    );

    return result.rows;
  }

  /**
   * Remove stock entry
   * @param {Integer} entryId - Stock entry ID
   * @param {Integer} quantityToRemove - Quantity to remove
   * @param {String} reason - Reason for removal
   * @param {Integer} billId - Related bill ID
   * @param {Integer} userId - User ID
   * @returns {Promise<Object>} - Result
   */
  async removeStock(entryId, quantityToRemove, reason, billId, userId) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get current entry
      const entryResult = await client.query(
        'SELECT * FROM stock_entries WHERE id = $1 AND deleted_at IS NULL',
        [entryId]
      );

      if (entryResult.rows.length === 0) {
        throw new Error('Stock entry not found');
      }

      const entry = entryResult.rows[0];

      if (entry.quantity < quantityToRemove) {
        throw new Error(`Insufficient quantity. Available: ${entry.quantity}`);
      }

      const newQuantity = entry.quantity - quantityToRemove;

      // Update stock
      await client.query(
        'UPDATE stock_entries SET quantity = $1 WHERE id = $2',
        [newQuantity, entryId]
      );

      // Log removal
      await client.query(
        `INSERT INTO stock_logs (
          entry_id, action, quantity_before, quantity_after,
          location_from, related_bill_id, reason, performed_by
        ) VALUES ($1, 'REMOVE', $2, $3, $4, $5, $6, $7)`,
        [entryId, entry.quantity, newQuantity, entry.location_id, billId, reason, userId]
      );

      await client.query('COMMIT');

      return {
        success: true,
        entry_id: entryId,
        quantity_removed: quantityToRemove,
        remaining_quantity: newQuantity
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Failed to remove stock: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Transfer stock between locations
   * @param {Integer} entryId - Stock entry ID
   * @param {Integer} toLocationId - Destination location ID
   * @param {String} reason - Reason for transfer
   * @param {Integer} userId - User ID
   * @returns {Promise<Object>} - Result
   */
  async transferStock(entryId, toLocationId, reason, userId) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get entry
      const entryResult = await client.query(
        'SELECT * FROM stock_entries WHERE id = $1 AND deleted_at IS NULL',
        [entryId]
      );

      if (entryResult.rows.length === 0) {
        throw new Error('Stock entry not found');
      }

      const entry = entryResult.rows[0];
      const fromLocationId = entry.location_id;

      // Validate destination location
      const locResult = await client.query(
        'SELECT id FROM locations WHERE id = $1',
        [toLocationId]
      );

      if (locResult.rows.length === 0) {
        throw new Error('Destination location not found');
      }

      // Update location
      await client.query(
        'UPDATE stock_entries SET location_id = $1 WHERE id = $2',
        [toLocationId, entryId]
      );

      // Log transfer
      await client.query(
        `INSERT INTO stock_logs (
          entry_id, action, quantity_before, quantity_after,
          location_from, location_to, reason, performed_by
        ) VALUES ($1, 'TRANSFER', $2, $3, $4, $5, $6, $7)`,
        [entryId, entry.quantity, entry.quantity, fromLocationId, toLocationId, reason, userId]
      );

      // Log transfer history
      await client.query(
        `INSERT INTO location_transfer_history (
          entry_id, from_location_id, to_location_id, quantity, reason, transferred_by
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [entryId, fromLocationId, toLocationId, entry.quantity, reason, userId]
      );

      await client.query('COMMIT');

      return {
        success: true,
        entry_id: entryId,
        from_location_id: fromLocationId,
        to_location_id: toLocationId,
        quantity: entry.quantity
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Failed to transfer stock: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Get audit log for entry
   * @param {Integer} entryId - Stock entry ID
   * @returns {Promise<Array>} - Audit logs
   */
  async getAuditLog(entryId) {
    const result = await pool.query(
      `SELECT sl.*, u.name as performed_by_name, p.name as product_name
       FROM stock_logs sl
       JOIN users u ON sl.performed_by = u.id
       JOIN stock_entries se ON sl.entry_id = se.id
       JOIN products p ON se.product_id = p.id
       WHERE sl.entry_id = $1
       ORDER BY sl.created_at DESC`,
      [entryId]
    );

    return result.rows;
  }

  /**
   * Helper: Validate add stock input
   */
  validateAddStockInput(data) {
    if (!data.product_id) throw new Error('product_id is required');
    if (!data.location_id) throw new Error('location_id is required');
    if (!data.quantity || data.quantity <= 0) throw new Error('quantity must be > 0');
    if (!data.batch_number) throw new Error('batch_number is required');
    if (typeof data.quantity !== 'number') throw new Error('quantity must be a number');
  }

  /**
   * Helper: Check and create low stock alert
   */
  async checkAndCreateLowStockAlert(client, productId) {
    const result = await client.query(
      `SELECT * FROM low_stock_alerts WHERE product_id = $1`,
      [productId]
    );

    if (result.rows.length === 0) {
      // Create default alert (to be set by admin later)
      await client.query(
        `INSERT INTO low_stock_alerts (product_id, minimum_quantity, alert_threshold, is_active)
         VALUES ($1, 10, 5, FALSE)
         ON CONFLICT (product_id) DO NOTHING`,
        [productId]
      );
    }
  }

  /**
   * Get total stock value
   */
  async getTotalStockValue() {
    const result = await pool.query(
      `SELECT COALESCE(SUM(quantity * unit_cost), 0) as total_value
       FROM stock_entries
       WHERE deleted_at IS NULL AND unit_cost IS NOT NULL`
    );

    return result.rows[0].total_value;
  }
}

module.exports = new StockService();

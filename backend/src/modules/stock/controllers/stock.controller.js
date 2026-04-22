/**
 * Stock Controller - API Endpoint Handlers
 * Handles HTTP requests for stock management
 */

const stockService = require('../services/stock.service');

class StockController {
  /**
   * POST /api/inventory/stock/entries
   * Add new stock entry
   */
  async addStockEntry(req, res) {
    try {
      const { product_id, location_id, quantity, batch_number, supplier_id, incoming_bill_id, expiry_date, unit_cost, reason } = req.body;
      const userId = req.user.id;

      const result = await stockService.addStockEntry({
        product_id,
        location_id,
        quantity,
        batch_number,
        supplier_id,
        incoming_bill_id,
        expiry_date,
        unit_cost,
        reason
      }, userId);

      res.status(201).json({
        success: true,
        data: result,
        message: 'Stock entry added successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/inventory/stock/entries
   * Get all stock entries with pagination
   */
  async getAllStockEntries(req, res) {
    try {
      const { product_id, location_id, batch_number, limit, offset, sort_by, sort_order } = req.query;

      const entries = await stockService.getAllStockEntries({
        product_id: product_id ? parseInt(product_id) : undefined,
        location_id: location_id ? parseInt(location_id) : undefined,
        batch_number,
        limit: limit ? parseInt(limit) : 50,
        offset: offset ? parseInt(offset) : 0,
        sort_by: sort_by || 'created_at',
        sort_order: sort_order || 'DESC'
      });

      res.json({
        success: true,
        data: entries,
        count: entries.length
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/inventory/stock/entries/:id
   * Get single stock entry with history
   */
  async getStockEntryById(req, res) {
    try {
      const { id } = req.params;
      const result = await stockService.getStockEntryById(parseInt(id));

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * PUT /api/inventory/stock/entries/:id
   * Update stock entry (location/quantity)
   */
  async updateStockEntry(req, res) {
    try {
      const { id } = req.params;
      const { quantity, location_id, batch_number, unit_cost, reason } = req.body;
      const userId = req.user.id;

      // Validate that at least one field is being updated
      if (!quantity && !location_id && !batch_number && !unit_cost) {
        return res.status(400).json({
          success: false,
          error: 'At least one field must be updated'
        });
      }

      const entryId = parseInt(id);

      // Get current entry
      const current = await stockService.getStockEntryById(entryId);

      // Update the entry (simplified - in production use transaction)
      const { pool } = require('../../../db');
      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        // Build update query
        let updateFields = [];
        let params = [];
        let paramCount = 1;

        if (quantity !== undefined) {
          updateFields.push(`quantity = $${paramCount}`);
          params.push(quantity);
          paramCount++;
        }

        if (location_id !== undefined) {
          updateFields.push(`location_id = $${paramCount}`);
          params.push(location_id);
          paramCount++;
        }

        if (batch_number) {
          updateFields.push(`batch_number = $${paramCount}`);
          params.push(batch_number);
          paramCount++;
        }

        if (unit_cost !== undefined) {
          updateFields.push(`unit_cost = $${paramCount}`);
          params.push(unit_cost);
          paramCount++;
        }

        updateFields.push('updated_at = NOW()');

        params.push(entryId);

        if (updateFields.length > 0) {
          await client.query(
            `UPDATE stock_entries SET ${updateFields.join(', ')} WHERE id = $${paramCount}`,
            params
          );

          // Log the update
          await client.query(
            `INSERT INTO stock_logs (entry_id, action, quantity_before, quantity_after, reason, performed_by)
             VALUES ($1, 'ADJUST', $2, $3, $4, $5)`,
            [entryId, current.entry.quantity, quantity || current.entry.quantity, reason || 'Manual update', userId]
          );
        }

        await client.query('COMMIT');

        const updated = await stockService.getStockEntryById(entryId);

        res.json({
          success: true,
          data: updated,
          message: 'Stock entry updated successfully'
        });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * DELETE /api/inventory/stock/entries/:id
   * Soft delete stock entry
   */
  async deleteStockEntry(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { reason } = req.body;

      const { pool } = require('../../../db');

      await pool.query(
        `UPDATE stock_entries SET deleted_at = NOW() WHERE id = $1`,
        [parseInt(id)]
      );

      // Log deletion
      await pool.query(
        `INSERT INTO stock_logs (entry_id, action, quantity_before, quantity_after, reason, performed_by)
         SELECT id, 'REMOVE', quantity, 0, $1, $2 FROM stock_entries WHERE id = $3`,
        [reason || 'Deleted', userId, parseInt(id)]
      );

      res.json({
        success: true,
        message: 'Stock entry deleted successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/inventory/stock/product/:id
   * Get all batches of a product
   */
  async getStockByProduct(req, res) {
    try {
      const { id } = req.params;
      const entries = await stockService.getStockByProduct(parseInt(id));

      const totalQuantity = entries.reduce((sum, e) => sum + (e.quantity || 0), 0);

      res.json({
        success: true,
        data: {
          entries,
          total_quantity: totalQuantity,
          batch_count: entries.length
        }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/inventory/stock/location/:id
   * Get all stock at a location
   */
  async getStockByLocation(req, res) {
    try {
      const { id } = req.params;
      const entries = await stockService.getStockByLocation(parseInt(id));

      res.json({
        success: true,
        data: entries,
        count: entries.length
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/inventory/stock/low
   * Get low stock items
   */
  async getLowStockItems(req, res) {
    try {
      const items = await stockService.getLowStockItems();

      res.json({
        success: true,
        data: items,
        count: items.length
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/inventory/stock/expiring
   * Get expiring stock
   */
  async getExpiringStock(req, res) {
    try {
      const items = await stockService.getExpiringStock();

      res.json({
        success: true,
        data: items,
        count: items.length
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * POST /api/inventory/stock/transfer
   * Transfer stock between locations
   */
  async transferStock(req, res) {
    try {
      const { entry_id, to_location_id, reason } = req.body;
      const userId = req.user.id;

      if (!entry_id || !to_location_id) {
        return res.status(400).json({
          success: false,
          error: 'entry_id and to_location_id are required'
        });
      }

      const result = await stockService.transferStock(entry_id, to_location_id, reason || 'Location transfer', userId);

      res.json({
        success: true,
        data: result,
        message: 'Stock transferred successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * POST /api/inventory/stock/adjust
   * Adjust stock quantity
   */
  async adjustStock(req, res) {
    try {
      const { entry_id, quantity_to_remove, reason, bill_id } = req.body;
      const userId = req.user.id;

      if (!entry_id || !quantity_to_remove) {
        return res.status(400).json({
          success: false,
          error: 'entry_id and quantity_to_remove are required'
        });
      }

      const result = await stockService.removeStock(entry_id, quantity_to_remove, reason || 'Adjustment', bill_id || null, userId);

      res.json({
        success: true,
        data: result,
        message: 'Stock adjusted successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/inventory/stock/logs
   * Get all stock logs with filtering
   */
  async getStockLogs(req, res) {
    try {
      const { entry_id, action, limit, offset } = req.query;
      const { pool } = require('../../../db');

      let query = 'SELECT sl.*, u.name as performed_by_name FROM stock_logs sl JOIN users u ON sl.performed_by = u.id WHERE 1=1';
      const params = [];

      if (entry_id) {
        query += ` AND sl.entry_id = $${params.length + 1}`;
        params.push(parseInt(entry_id));
      }

      if (action) {
        query += ` AND sl.action = $${params.length + 1}`;
        params.push(action);
      }

      query += ` ORDER BY sl.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(parseInt(limit) || 100, parseInt(offset) || 0);

      const result = await pool.query(query, params);

      res.json({
        success: true,
        data: result.rows,
        count: result.rows.length
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/inventory/stock/logs/:id
   * Get logs for specific entry
   */
  async getEntryLogs(req, res) {
    try {
      const { id } = req.params;
      const logs = await stockService.getAuditLog(parseInt(id));

      res.json({
        success: true,
        data: logs,
        count: logs.length
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/inventory/stock/value
   * Get total stock value
   */
  async getTotalStockValue(req, res) {
    try {
      const value = await stockService.getTotalStockValue();

      res.json({
        success: true,
        data: {
          total_value: value
        }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new StockController();

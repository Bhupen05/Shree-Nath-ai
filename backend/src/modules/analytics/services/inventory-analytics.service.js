/**
 * Inventory Analytics Service
 * Tracks inventory metrics and optimization
 */

class InventoryAnalyticsService {
  constructor(pool) {
    this.pool = pool;
  }

  /**
   * Record inventory snapshot
   * @param {Object} inventoryData - Inventory metrics
   */
  async recordInventorySnapshot({
    partId,
    locationId,
    snapshotDate,
    quantityOnHand,
    quantityAvailable,
    quantityReserved,
    quantitySold30d,
    quantitySold90d,
    reorderLevel,
    damagedCount
  }) {
    try {
      // Determine stock status
      let stockStatus = 'OPTIMAL';
      if (quantityOnHand === 0) {
        stockStatus = 'STOCKOUT';
      } else if (quantityOnHand <= reorderLevel) {
        stockStatus = 'LOWSTOCK';
      } else if (quantityOnHand > reorderLevel * 3) {
        stockStatus = 'OVERSTOCK';
      }

      const result = await this.pool.query(`
        INSERT INTO analytics_inventory (
          part_id, location_id, snapshot_date, snapshot_time,
          quantity_on_hand, quantity_available, quantity_reserved,
          quantity_sold_30d, quantity_sold_90d, reorder_level,
          stock_status, damaged_count
        ) VALUES ($1, $2, $3, NOW(), $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (part_id, location_id, snapshot_date) DO UPDATE SET
          quantity_on_hand = $4,
          stock_status = $10
        RETURNING id, stock_status
      `, [
        partId,
        locationId,
        snapshotDate,
        quantityOnHand,
        quantityAvailable,
        quantityReserved,
        quantitySold30d,
        quantitySold90d,
        reorderLevel,
        stockStatus,
        damagedCount
      ]);

      return {
        success: true,
        analyticsId: result.rows[0].id,
        stockStatus: result.rows[0].stock_status
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get inventory status summary
   */
  async getInventoryStatusSummary() {
    try {
      const result = await this.pool.query(`
        SELECT
          stock_status,
          COUNT(*) as part_count,
          SUM(quantity_on_hand) as total_quantity,
          AVG(quantity_on_hand) as avg_per_part,
          COUNT(DISTINCT part_id) as unique_parts
        FROM analytics_inventory
        WHERE snapshot_date = CURRENT_DATE
        GROUP BY stock_status
        ORDER BY part_count DESC
      `);

      return {
        success: true,
        summary: result.rows
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get low stock alerts
   * @param {integer} limit - Number to return
   */
  async getLowStockAlerts(limit = 20) {
    try {
      const result = await this.pool.query(`
        SELECT
          ai.part_id,
          (SELECT name FROM parts WHERE id = ai.part_id) as part_name,
          ai.location_id,
          ai.quantity_on_hand,
          ai.reorder_level,
          ai.quantity_sold_30d,
          ai.stock_status,
          CASE 
            WHEN ai.quantity_on_hand = 0 THEN 'CRITICAL'
            WHEN ai.quantity_on_hand < ai.reorder_level * 0.5 THEN 'HIGH'
            ELSE 'MEDIUM'
          END as alert_severity
        FROM analytics_inventory ai
        WHERE ai.snapshot_date = CURRENT_DATE
          AND ai.stock_status IN ('LOWSTOCK', 'STOCKOUT')
        ORDER BY alert_severity DESC, ai.quantity_on_hand ASC
        LIMIT $1
      `, [limit]);

      return {
        success: true,
        alerts: result.rows
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get overstock analysis
   * @param {integer} limit - Number to return
   */
  async getOverstockItems(limit = 20) {
    try {
      const result = await this.pool.query(`
        SELECT
          part_id,
          (SELECT name FROM parts WHERE id = analytics_inventory.part_id) as part_name,
          SUM(quantity_on_hand) as total_quantity,
          AVG(quantity_sold_30d) as avg_monthly_sales,
          ROUND(CAST(SUM(quantity_on_hand) AS DECIMAL) / 
            NULLIF(AVG(quantity_sold_30d), 0), 1) as months_of_inventory
        FROM analytics_inventory
        WHERE snapshot_date = CURRENT_DATE
          AND stock_status = 'OVERSTOCK'
        GROUP BY part_id
        ORDER BY total_quantity DESC
        LIMIT $1
      `, [limit]);

      return {
        success: true,
        overstockItems: result.rows
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Calculate inventory turnover
   * @param {integer} partId - Part ID
   * @param {integer} days - Period in days
   */
  async calculateTurnover(partId, days = 90) {
    try {
      const result = await this.pool.query(`
        SELECT
          part_id,
          (SELECT name FROM parts WHERE id = $1) as part_name,
          SUM(quantity_sold_90d) as total_sold,
          AVG(quantity_on_hand) as avg_inventory,
          ROUND(
            CASE 
              WHEN AVG(quantity_on_hand) = 0 THEN 0
              ELSE CAST(SUM(quantity_sold_90d) AS DECIMAL) / 
                   NULLIF(AVG(quantity_on_hand), 0)
            END, 2
          ) as turnover_ratio,
          ROUND(
            CAST(90 AS DECIMAL) / 
            NULLIF(CAST(SUM(quantity_sold_90d) AS DECIMAL) / 
                   NULLIF(AVG(quantity_on_hand), 0), 0), 
            0
          ) as days_to_sell
        FROM analytics_inventory
        WHERE part_id = $1
          AND snapshot_date >= CURRENT_DATE - INTERVAL '90 days'
        GROUP BY part_id
      `, [partId]);

      if (result.rows.length === 0) {
        return {
          success: false,
          error: 'No inventory data found for part'
        };
      }

      return {
        success: true,
        turnover: result.rows[0]
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get inventory value analysis
   */
  async getInventoryValue() {
    try {
      const result = await this.pool.query(`
        SELECT
          SUM(ai.quantity_on_hand * p.purchase_price) as total_inventory_value,
          COUNT(DISTINCT ai.part_id) as unique_parts,
          COUNT(DISTINCT ai.location_id) as locations,
          AVG(ai.quantity_on_hand * p.purchase_price) as avg_value_per_part
        FROM analytics_inventory ai
        JOIN parts p ON p.id = ai.part_id
        WHERE ai.snapshot_date = CURRENT_DATE
      `);

      return {
        success: true,
        inventoryValue: result.rows[0]
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get slow-moving items
   * @param {integer} limit - Number to return
   */
  async getSlowMovingItems(limit = 20) {
    try {
      const result = await this.pool.query(`
        SELECT
          part_id,
          (SELECT name FROM parts WHERE id = analytics_inventory.part_id) as part_name,
          quantity_on_hand,
          quantity_sold_90d,
          quantity_sold_30d,
          CASE 
            WHEN quantity_sold_90d = 0 THEN 'OBSOLETE'
            WHEN quantity_sold_90d < 5 THEN 'SLOW'
            ELSE 'NORMAL'
          END as movement_status
        FROM analytics_inventory
        WHERE snapshot_date = CURRENT_DATE
          AND quantity_sold_90d < 10
          AND quantity_on_hand > 0
        ORDER BY quantity_sold_90d ASC
        LIMIT $1
      `, [limit]);

      return {
        success: true,
        slowMovingItems: result.rows
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = InventoryAnalyticsService;

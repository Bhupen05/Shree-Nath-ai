/**
 * Sales Analytics Service
 * Generates sales reports and metrics
 */

class SalesAnalyticsService {
  constructor(pool) {
    this.pool = pool;
  }

  /**
   * Record sale transaction for analytics
   * @param {Object} saleData - Sale information
   */
  async recordSale({
    billId,
    saleDate,
    saleAmount,
    partyId,
    partId,
    quantitySold,
    unitPrice,
    discountGiven,
    taxAmount,
    paymentStatus
  }) {
    try {
      const result = await this.pool.query(`
        INSERT INTO analytics_sales (
          bill_id, sale_date, sale_amount, party_id, part_id,
          quantity_sold, unit_price, discount_given, tax_amount,
          payment_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id, sale_date, sale_amount
      `, [
        billId,
        saleDate,
        saleAmount,
        partyId,
        partId,
        quantitySold,
        unitPrice,
        discountGiven,
        taxAmount,
        paymentStatus
      ]);

      return {
        success: true,
        analyticsId: result.rows[0].id
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get daily sales summary
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   */
  async getDailySalesSummary(startDate, endDate) {
    try {
      const result = await this.pool.query(`
        SELECT
          sales_date,
          COUNT(DISTINCT bill_id) as order_count,
          SUM(sale_amount) as total_sales,
          AVG(sale_amount) as avg_order_value,
          SUM(quantity_sold) as total_quantity,
          COUNT(DISTINCT party_id) as unique_customers,
          SUM(discount_given) as total_discounts,
          SUM(tax_amount) as total_tax
        FROM analytics_sales
        WHERE sale_date BETWEEN $1 AND $2
        GROUP BY sales_date
        ORDER BY sales_date DESC
      `, [startDate, endDate]);

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
   * Get top selling products
   * @param {integer} limit - Number of products to return
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   */
  async getTopProducts(limit = 10, startDate = null, endDate = null) {
    try {
      let query = `
        SELECT
          part_id,
          (SELECT name FROM parts WHERE id = analytics_sales.part_id) as part_name,
          SUM(quantity_sold) as total_quantity,
          SUM(sale_amount) as total_revenue,
          COUNT(*) as transaction_count,
          AVG(unit_price) as avg_price
        FROM analytics_sales
      `;

      const params = [];
      
      if (startDate && endDate) {
        query += ` WHERE sale_date BETWEEN $1 AND $2`;
        params.push(startDate, endDate);
      }

      query += `
        GROUP BY part_id
        ORDER BY total_revenue DESC
        LIMIT $${params.length + 1}
      `;

      params.push(limit);

      const result = await this.pool.query(query, params);

      return {
        success: true,
        topProducts: result.rows
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get top customers
   * @param {integer} limit - Number of customers to return
   */
  async getTopCustomers(limit = 10) {
    try {
      const result = await this.pool.query(`
        SELECT
          party_id,
          (SELECT name FROM parties WHERE id = analytics_sales.party_id) as customer_name,
          COUNT(*) as purchase_count,
          SUM(sale_amount) as total_revenue,
          AVG(sale_amount) as avg_purchase_value,
          MAX(sale_date) as last_purchase_date
        FROM analytics_sales
        GROUP BY party_id
        ORDER BY total_revenue DESC
        LIMIT $1
      `, [limit]);

      return {
        success: true,
        topCustomers: result.rows
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get sales by category
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   */
  async getSalesByCategory(startDate, endDate) {
    try {
      const result = await this.pool.query(`
        SELECT
          (SELECT category FROM parts WHERE id = analytics_sales.part_id) as category,
          COUNT(DISTINCT bill_id) as order_count,
          SUM(sale_amount) as total_sales,
          SUM(quantity_sold) as total_quantity,
          COUNT(DISTINCT party_id) as unique_customers
        FROM analytics_sales
        WHERE sale_date BETWEEN $1 AND $2
        GROUP BY category
        ORDER BY total_sales DESC
      `, [startDate, endDate]);

      return {
        success: true,
        byCategory: result.rows
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get sales trend
   * @param {integer} periods - Number of periods
   */
  async getSalesTrend(periods = 30) {
    try {
      const result = await this.pool.query(`
        SELECT
          sales_date,
          SUM(sale_amount) as daily_sales,
          COUNT(DISTINCT bill_id) as daily_orders,
          LAG(SUM(sale_amount)) OVER (ORDER BY sales_date) as previous_day_sales
        FROM analytics_sales
        WHERE sales_date >= CURRENT_DATE - INTERVAL '1 day' * $1
        GROUP BY sales_date
        ORDER BY sales_date ASC
      `, [periods]);

      const metrics = result.rows;
      let trend = 'STABLE';

      if (metrics.length >= 2) {
        const latest = metrics[metrics.length - 1];
        const previous = metrics[metrics.length - 2];
        
        if (latest.daily_sales > previous.daily_sales * 1.1) {
          trend = 'INCREASING';
        } else if (latest.daily_sales < previous.daily_sales * 0.9) {
          trend = 'DECREASING';
        }
      }

      return {
        success: true,
        trend,
        metrics
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get customer payment statistics
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   */
  async getPaymentStats(startDate, endDate) {
    try {
      const result = await this.pool.query(`
        SELECT
          payment_status,
          COUNT(*) as transaction_count,
          SUM(sale_amount) as total_amount,
          AVG(sale_amount) as avg_amount,
          ROUND(CAST(100 * COUNT(*) AS DECIMAL) / 
            (SELECT COUNT(*) FROM analytics_sales 
             WHERE sale_date BETWEEN $1 AND $2), 2) as percentage
        FROM analytics_sales
        WHERE sale_date BETWEEN $1 AND $2
        GROUP BY payment_status
      `, [startDate, endDate]);

      return {
        success: true,
        paymentStats: result.rows
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Calculate sales metrics
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   */
  async calculateMetrics(startDate, endDate) {
    try {
      const result = await this.pool.query(`
        SELECT
          COUNT(DISTINCT bill_id) as total_orders,
          COUNT(DISTINCT party_id) as unique_customers,
          SUM(sale_amount) as total_revenue,
          AVG(sale_amount) as avg_order_value,
          MAX(sale_amount) as max_order_value,
          MIN(sale_amount) as min_order_value,
          SUM(quantity_sold) as total_quantity,
          SUM(discount_given) as total_discounts,
          SUM(tax_amount) as total_tax,
          ROUND(CAST(SUM(discount_given) AS DECIMAL) / NULLIF(SUM(sale_amount), 0) * 100, 2) as discount_percentage
        FROM analytics_sales
        WHERE sale_date BETWEEN $1 AND $2
      `, [startDate, endDate]);

      return {
        success: true,
        metrics: result.rows[0]
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = SalesAnalyticsService;

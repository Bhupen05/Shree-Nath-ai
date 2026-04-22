/**
 * Report Generation Service
 * Creates and manages reports
 */

class ReportService {
  constructor(pool) {
    this.pool = pool;
    this.reportCache = new Map();
  }

  /**
   * Define a new report
   * @param {Object} reportData - Report configuration
   */
  async defineReport({
    reportCode,
    reportName,
    reportType,
    reportCategory,
    reportQuery,
    parameters,
    schedule,
    deliveryChannels,
    ownerId,
    description
  }) {
    try {
      const result = await this.pool.query(`
        INSERT INTO report_definitions (
          report_code, report_name, report_type, report_category,
          report_query, parameters, schedule, delivery_channels,
          owner_id, description
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id, report_code, report_name, created_at
      `, [
        reportCode,
        reportName,
        reportType,
        reportCategory,
        reportQuery,
        JSON.stringify(parameters),
        schedule,
        deliveryChannels,
        ownerId,
        description
      ]);

      const report = result.rows[0];
      this.reportCache.set(report.id, report);

      return {
        success: true,
        report,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Execute report
   * @param {integer} reportId - Report ID
   * @param {Object} parameters - Report parameters
   */
  async executeReport(reportId, parameters = {}) {
    try {
      const startTime = Date.now();

      // Get report definition
      const reportResult = await this.pool.query(
        'SELECT * FROM report_definitions WHERE id = $1',
        [reportId]
      );

      if (reportResult.rows.length === 0) {
        return {
          success: false,
          error: 'Report not found'
        };
      }

      const report = reportResult.rows[0];
      
      // Execute report query
      const queryResult = await this.pool.query(report.report_query);
      const executionTime = Date.now() - startTime;

      // Record execution
      const execResult = await this.pool.query(`
        INSERT INTO report_executions (
          report_id, execution_time_ms, record_count, status
        ) VALUES ($1, $2, $3, $4)
        RETURNING id, execution_date
      `, [
        reportId,
        executionTime,
        queryResult.rows.length,
        'SUCCESS'
      ]);

      return {
        success: true,
        reportId,
        executionId: execResult.rows[0].id,
        data: queryResult.rows,
        recordCount: queryResult.rows.length,
        executionTime,
        executedAt: execResult.rows[0].execution_date
      };
    } catch (error) {
      // Record failed execution
      await this.pool.query(`
        INSERT INTO report_executions (
          report_id, status, error_message
        ) VALUES ($1, $2, $3)
      `, [reportId, 'FAILED', error.message]);

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get available reports
   * @param {string} category - Report category filter
   */
  async getAvailableReports(category = null) {
    try {
      let query = `
        SELECT
          id, report_code, report_name, report_type, report_category,
          description, is_active, created_at
        FROM report_definitions
        WHERE is_active = TRUE
      `;

      const params = [];
      if (category) {
        query += ` AND report_category = $1`;
        params.push(category);
      }

      query += ` ORDER BY report_category, report_name`;

      const result = await this.pool.query(query, params);

      return {
        success: true,
        reports: result.rows
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get report execution history
   * @param {integer} reportId - Report ID
   * @param {integer} limit - Number of records
   */
  async getExecutionHistory(reportId, limit = 20) {
    try {
      const result = await this.pool.query(`
        SELECT
          id, execution_date, execution_time_ms, record_count,
          status, error_message, scheduled_execution
        FROM report_executions
        WHERE report_id = $1
        ORDER BY execution_date DESC
        LIMIT $2
      `, [reportId, limit]);

      return {
        success: true,
        history: result.rows
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Subscribe user to report
   * @param {integer} reportId - Report ID
   * @param {integer} userId - User ID
   * @param {Object} subscriptionData - Subscription info
   */
  async subscribeToReport(reportId, userId, {
    subscriptionType = 'MONTHLY',
    deliveryEmail = null,
    deliveryFormat = 'PDF'
  }) {
    try {
      const result = await this.pool.query(`
        INSERT INTO report_subscriptions (
          report_id, subscriber_id, subscription_type,
          delivery_email, delivery_format
        ) VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (report_id, subscriber_id) DO UPDATE SET
          subscription_type = $3,
          delivery_format = $5
        RETURNING id, created_at
      `, [
        reportId,
        userId,
        subscriptionType,
        deliveryEmail,
        deliveryFormat
      ]);

      return {
        success: true,
        subscriptionId: result.rows[0].id,
        createdAt: result.rows[0].created_at
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get user subscriptions
   * @param {integer} userId - User ID
   */
  async getUserSubscriptions(userId) {
    try {
      const result = await this.pool.query(`
        SELECT
          rs.id,
          rs.report_id,
          rd.report_name,
          rd.report_category,
          rs.subscription_type,
          rs.delivery_format,
          rs.last_sent_date,
          rs.next_send_date,
          rs.is_active
        FROM report_subscriptions rs
        JOIN report_definitions rd ON rd.id = rs.report_id
        WHERE rs.subscriber_id = $1
          AND rs.is_active = TRUE
        ORDER BY rd.report_category, rd.report_name
      `, [userId]);

      return {
        success: true,
        subscriptions: result.rows
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get standard report templates
   */
  getStandardReports() {
    return [
      {
        code: 'DAILY_SALES',
        name: 'Daily Sales Summary',
        category: 'SALES',
        description: 'Daily sales transactions and metrics'
      },
      {
        code: 'INVENTORY_STATUS',
        name: 'Inventory Status Report',
        category: 'INVENTORY',
        description: 'Current stock levels and reorder alerts'
      },
      {
        code: 'CUSTOMER_AGING',
        name: 'Customer Payment Aging',
        category: 'FINANCIAL',
        description: 'Outstanding receivables by age'
      },
      {
        code: 'TOP_PRODUCTS',
        name: 'Top Selling Products',
        category: 'SALES',
        description: 'Best performing products by revenue'
      },
      {
        code: 'INACTIVE_CUSTOMERS',
        name: 'Inactive Customers',
        category: 'CUSTOMER',
        description: 'Customers with no recent purchases'
      }
    ];
  }

  /**
   * Export report data
   * @param {Array} data - Report data
   * @param {string} format - Export format (PDF, EXCEL, CSV, JSON)
   */
  async exportReport(data, format = 'CSV') {
    try {
      let exported;

      switch (format.toUpperCase()) {
        case 'CSV':
          exported = this.convertToCSV(data);
          break;
        case 'JSON':
          exported = JSON.stringify(data, null, 2);
          break;
        case 'EXCEL':
          exported = this.convertToExcel(data);
          break;
        default:
          exported = this.convertToCSV(data);
      }

      return {
        success: true,
        data: exported,
        format
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Convert to CSV
   * @private
   */
  convertToCSV(data) {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csv = [headers.join(',')];

    for (const row of data) {
      const values = headers.map(h => {
        const val = row[h];
        if (typeof val === 'string' && val.includes(',')) {
          return `"${val}"`;
        }
        return val;
      });
      csv.push(values.join(','));
    }

    return csv.join('\n');
  }

  /**
   * Convert to Excel
   * @private
   */
  convertToExcel(data) {
    // Would use library like xlsx
    return JSON.stringify(data);
  }
}

module.exports = ReportService;

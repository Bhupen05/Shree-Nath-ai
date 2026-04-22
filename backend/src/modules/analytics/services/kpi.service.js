/**
 * KPI Service
 * Manages KPI definitions and metric calculations
 */

class KPIService {
  constructor(pool) {
    this.pool = pool;
    this.kpiCache = new Map();
  }

  /**
   * Create KPI definition
   * @param {Object} kpiData - KPI configuration
   */
  async createKPI({
    kpiCode,
    kpiName,
    kpiCategory,
    formula,
    targetValue,
    warningThreshold,
    criticalThreshold,
    measurementUnit,
    measurementFrequency,
    description,
    createdBy
  }) {
    try {
      const result = await this.pool.query(`
        INSERT INTO kpi_definitions (
          kpi_code, kpi_name, kpi_category, formula, target_value,
          warning_threshold, critical_threshold, measurement_unit,
          measurement_frequency, description, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id, kpi_code, kpi_name, created_at
      `, [
        kpiCode,
        kpiName,
        kpiCategory,
        formula,
        targetValue,
        warningThreshold,
        criticalThreshold,
        measurementUnit,
        measurementFrequency,
        description,
        createdBy
      ]);

      const kpi = result.rows[0];
      this.kpiCache.set(kpi.id, kpi);

      return {
        success: true,
        kpi,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Record KPI metric value
   * @param {integer} kpiId - KPI ID
   * @param {Date} metricDate - Date of metric
   * @param {number} metricValue - Actual value
   */
  async recordMetric(kpiId, metricDate, metricValue) {
    try {
      // Get KPI definition
      const kpiResult = await this.pool.query(
        'SELECT * FROM kpi_definitions WHERE id = $1',
        [kpiId]
      );

      if (kpiResult.rows.length === 0) {
        return {
          success: false,
          error: 'KPI not found'
        };
      }

      const kpi = kpiResult.rows[0];
      const targetValue = kpi.target_value;

      // Calculate status
      const variance = ((metricValue - targetValue) / targetValue * 100);
      const warningThreshold = kpi.warning_threshold || -10;
      const criticalThreshold = kpi.critical_threshold || -25;

      let status = 'ON_TRACK';
      if (variance <= criticalThreshold) {
        status = 'CRITICAL';
      } else if (variance <= warningThreshold) {
        status = 'AT_RISK';
      } else if (metricValue > targetValue) {
        status = 'EXCEEDED';
      }

      // Insert or update metric
      const result = await this.pool.query(`
        INSERT INTO kpi_metrics (
          kpi_id, metric_date, metric_value, target_value,
          actual_vs_target, status
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (kpi_id, metric_date) DO UPDATE SET
          metric_value = $3,
          target_value = $4,
          actual_vs_target = $5,
          status = $6
        RETURNING id, kpi_id, metric_date, metric_value, status
      `, [
        kpiId,
        metricDate,
        metricValue,
        targetValue,
        variance,
        status
      ]);

      return {
        success: true,
        metric: result.rows[0],
        status,
        variance
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get KPI metrics for date range
   * @param {integer} kpiId - KPI ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   */
  async getMetricsForRange(kpiId, startDate, endDate) {
    try {
      const result = await this.pool.query(`
        SELECT
          km.metric_date,
          km.metric_value,
          km.target_value,
          km.actual_vs_target,
          km.status,
          kd.kpi_name,
          kd.measurement_unit
        FROM kpi_metrics km
        JOIN kpi_definitions kd ON kd.id = km.kpi_id
        WHERE km.kpi_id = $1
          AND km.metric_date BETWEEN $2 AND $3
        ORDER BY km.metric_date DESC
      `, [kpiId, startDate, endDate]);

      return {
        success: true,
        metrics: result.rows
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get KPI dashboard summary
   * @param {string} category - KPI category filter
   */
  async getDashboardSummary(category = null) {
    try {
      let query = `
        SELECT
          kd.id,
          kd.kpi_code,
          kd.kpi_name,
          kd.kpi_category,
          kd.measurement_unit,
          km.metric_date,
          km.metric_value,
          km.target_value,
          km.actual_vs_target,
          km.status
        FROM kpi_definitions kd
        LEFT JOIN kpi_metrics km ON km.kpi_id = kd.id
          AND km.metric_date >= CURRENT_DATE - INTERVAL '30 days'
        WHERE kd.is_active = TRUE
      `;

      const params = [];
      if (category) {
        query += ` AND kd.kpi_category = $1`;
        params.push(category);
      }

      query += ` ORDER BY kd.kpi_category, km.metric_date DESC`;

      const result = await this.pool.query(query, params);

      // Group by KPI
      const grouped = {};
      for (const row of result.rows) {
        if (!grouped[row.kpi_code]) {
          grouped[row.kpi_code] = {
            id: row.id,
            code: row.kpi_code,
            name: row.kpi_name,
            category: row.kpi_category,
            unit: row.measurement_unit,
            metrics: []
          };
        }
        if (row.metric_date) {
          grouped[row.kpi_code].metrics.push({
            date: row.metric_date,
            value: row.metric_value,
            target: row.target_value,
            variance: row.actual_vs_target,
            status: row.status
          });
        }
      }

      return {
        success: true,
        kpis: Object.values(grouped)
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get alert-level KPIs (AT_RISK or CRITICAL)
   */
  async getAlertsKPIs() {
    try {
      const result = await this.pool.query(`
        SELECT
          kd.id,
          kd.kpi_code,
          kd.kpi_name,
          kd.kpi_category,
          km.metric_date,
          km.metric_value,
          km.target_value,
          km.actual_vs_target,
          km.status
        FROM kpi_definitions kd
        JOIN kpi_metrics km ON km.kpi_id = kd.id
        WHERE kd.is_active = TRUE
          AND km.status IN ('AT_RISK', 'CRITICAL')
          AND km.metric_date >= CURRENT_DATE - INTERVAL '7 days'
        ORDER BY km.status DESC, km.metric_date DESC
      `);

      return {
        success: true,
        alerts: result.rows,
        alertCount: result.rows.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get KPI trend analysis
   * @param {integer} kpiId - KPI ID
   * @param {integer} periods - Number of periods to analyze
   */
  async getTrendAnalysis(kpiId, periods = 12) {
    try {
      const result = await this.pool.query(`
        SELECT
          km.metric_date,
          km.metric_value,
          km.target_value,
          km.actual_vs_target,
          km.status,
          LAG(km.metric_value) OVER (ORDER BY km.metric_date) as previous_value,
          LEAD(km.metric_value) OVER (ORDER BY km.metric_date) as next_value
        FROM kpi_metrics km
        WHERE km.kpi_id = $1
        ORDER BY km.metric_date DESC
        LIMIT $2
      `, [kpiId, periods]);

      // Calculate trend
      const metrics = result.rows.reverse();
      let trend = 'STABLE';
      
      if (metrics.length >= 2) {
        const latestValue = metrics[metrics.length - 1].metric_value;
        const previousValue = metrics[metrics.length - 2].metric_value;
        
        if (latestValue > previousValue * 1.05) {
          trend = 'IMPROVING';
        } else if (latestValue < previousValue * 0.95) {
          trend = 'DECLINING';
        }
      }

      return {
        success: true,
        metrics,
        trend,
        dataPoints: metrics.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Compare multiple KPIs
   * @param {Array} kpiIds - Array of KPI IDs
   * @param {Date} comparisonDate - Date to compare
   */
  async compareKPIs(kpiIds, comparisonDate = new Date()) {
    try {
      const placeholders = kpiIds.map((_, i) => `$${i + 1}`).join(',');
      const params = [...kpiIds, comparisonDate];

      const result = await this.pool.query(`
        SELECT
          kd.id,
          kd.kpi_code,
          kd.kpi_name,
          kd.target_value,
          km.metric_value,
          km.actual_vs_target,
          km.status
        FROM kpi_definitions kd
        LEFT JOIN kpi_metrics km ON km.kpi_id = kd.id
          AND km.metric_date = $${kpiIds.length + 1}
        WHERE kd.id IN (${placeholders})
        ORDER BY kd.kpi_code
      `, params);

      return {
        success: true,
        comparison: result.rows
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get KPI categories
   */
  async getCategories() {
    return [
      'SALES',
      'INVENTORY',
      'CUSTOMER',
      'FINANCIAL',
      'OPERATIONAL',
      'QUALITY'
    ];
  }

  /**
   * Get measurement frequencies
   */
  async getFrequencies() {
    return [
      'DAILY',
      'WEEKLY',
      'MONTHLY',
      'YEARLY'
    ];
  }
}

module.exports = KPIService;

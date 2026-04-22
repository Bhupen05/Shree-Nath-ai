/**
 * Customer Analytics Service
 * Generates customer insights and segmentation
 */

class CustomerAnalyticsService {
  constructor(pool) {
    this.pool = pool;
  }

  /**
   * Record customer analytics snapshot
   * @param {Object} customerData - Customer analytics
   */
  async recordCustomerMetrics({
    partyId,
    analyticsDate,
    totalPurchasesCount,
    totalPurchaseAmount,
    averagePurchaseValue,
    daysSinceLastPurchase,
    customerLifetimeValue,
    paymentScore,
    paymentOnTimeCount,
    paymentLateCount,
    totalOutstandingAmount,
    customerStatus
  }) {
    try {
      // Calculate churn risk
      let churnRiskScore = 0;
      
      if (daysSinceLastPurchase > 180) churnRiskScore += 0.5;
      if (daysSinceLastPurchase > 90) churnRiskScore += 0.3;
      if (paymentScore < 50) churnRiskScore += 0.4;
      if (paymentLateCount > 3) churnRiskScore += 0.3;
      
      churnRiskScore = Math.min(churnRiskScore, 1.0);

      const result = await this.pool.query(`
        INSERT INTO analytics_customers (
          party_id, analytics_date, total_purchases_count,
          total_purchase_amount, average_purchase_value,
          days_since_last_purchase, customer_lifetime_value,
          payment_score, payment_on_time_count, payment_late_count,
          total_outstanding_amount, customer_status, churn_risk_score
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (party_id, analytics_date) DO UPDATE SET
          total_purchases_count = $3,
          total_purchase_amount = $4,
          customer_status = $12,
          churn_risk_score = $13
        RETURNING id, party_id, customer_status, churn_risk_score
      `, [
        partyId,
        analyticsDate,
        totalPurchasesCount,
        totalPurchaseAmount,
        averagePurchaseValue,
        daysSinceLastPurchase,
        customerLifetimeValue,
        paymentScore,
        paymentOnTimeCount,
        paymentLateCount,
        totalOutstandingAmount,
        customerStatus,
        churnRiskScore
      ]);

      return {
        success: true,
        analyticsId: result.rows[0].id,
        churnRiskScore
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get customer segmentation
   */
  async getCustomerSegmentation() {
    try {
      const result = await this.pool.query(`
        SELECT
          customer_status,
          COUNT(*) as customer_count,
          SUM(total_purchase_amount) as segment_revenue,
          AVG(customer_lifetime_value) as avg_ltv,
          AVG(payment_score) as avg_payment_score,
          AVG(churn_risk_score) as avg_churn_risk
        FROM analytics_customers
        WHERE analytics_date = CURRENT_DATE
        GROUP BY customer_status
        ORDER BY segment_revenue DESC
      `);

      return {
        success: true,
        segments: result.rows
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get high-risk customers (churn risk)
   * @param {number} threshold - Churn risk threshold (0-1.0)
   * @param {integer} limit - Number to return
   */
  async getAtRiskCustomers(threshold = 0.7, limit = 20) {
    try {
      const result = await this.pool.query(`
        SELECT
          ac.party_id,
          (SELECT name FROM parties WHERE id = ac.party_id) as customer_name,
          ac.total_purchase_amount,
          ac.customer_lifetime_value,
          ac.days_since_last_purchase,
          ac.payment_score,
          ac.churn_risk_score
        FROM analytics_customers ac
        WHERE ac.analytics_date = CURRENT_DATE
          AND ac.churn_risk_score > $1
        ORDER BY ac.churn_risk_score DESC
        LIMIT $2
      `, [threshold, limit]);

      return {
        success: true,
        atRiskCustomers: result.rows
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get VIP customers
   * @param {integer} limit - Number to return
   */
  async getVIPCustomers(limit = 10) {
    try {
      const result = await this.pool.query(`
        SELECT
          party_id,
          (SELECT name FROM parties WHERE id = analytics_customers.party_id) as customer_name,
          total_purchase_amount,
          customer_lifetime_value,
          average_purchase_value,
          payment_score,
          days_since_last_purchase
        FROM analytics_customers
        WHERE analytics_date = CURRENT_DATE
          AND customer_status = 'VIP'
        ORDER BY customer_lifetime_value DESC
        LIMIT $1
      `, [limit]);

      return {
        success: true,
        vipCustomers: result.rows
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get customer health score
   * @param {integer} partyId - Party/Customer ID
   */
  async getCustomerHealthScore(partyId) {
    try {
      const result = await this.pool.query(`
        SELECT
          party_id,
          (SELECT name FROM parties WHERE id = $1) as customer_name,
          total_purchase_amount,
          customer_lifetime_value,
          payment_score,
          churn_risk_score,
          days_since_last_purchase,
          customer_status,
          CASE 
            WHEN payment_score >= 80 AND churn_risk_score < 0.3 THEN 'EXCELLENT'
            WHEN payment_score >= 60 AND churn_risk_score < 0.5 THEN 'GOOD'
            WHEN payment_score >= 40 THEN 'FAIR'
            ELSE 'POOR'
          END as health_status
        FROM analytics_customers
        WHERE party_id = $1
          AND analytics_date = CURRENT_DATE
      `, [partyId]);

      if (result.rows.length === 0) {
        return {
          success: false,
          error: 'Customer analytics not found'
        };
      }

      return {
        success: true,
        healthScore: result.rows[0]
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get inactive customers
   * @param {integer} daysInactive - Days without purchase
   * @param {integer} limit - Number to return
   */
  async getInactiveCustomers(daysInactive = 180, limit = 20) {
    try {
      const result = await this.pool.query(`
        SELECT
          party_id,
          (SELECT name FROM parties WHERE id = analytics_customers.party_id) as customer_name,
          total_purchase_amount,
          days_since_last_purchase,
          customer_lifetime_value,
          customer_status
        FROM analytics_customers
        WHERE analytics_date = CURRENT_DATE
          AND days_since_last_purchase > $1
          AND customer_status != 'VIP'
        ORDER BY days_since_last_purchase DESC
        LIMIT $2
      `, [daysInactive, limit]);

      return {
        success: true,
        inactiveCustomers: result.rows
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get payment behavior analysis
   */
  async getPaymentBehavior() {
    try {
      const result = await this.pool.query(`
        SELECT
          ROUND(AVG(payment_score), 2) as avg_payment_score,
          ROUND(AVG(churn_risk_score), 3) as avg_churn_risk,
          SUM(CASE WHEN payment_on_time_count > payment_late_count THEN 1 ELSE 0 END) as on_time_payers,
          COUNT(*) as total_customers,
          SUM(payment_late_count) as total_late_payments,
          SUM(total_outstanding_amount) as total_receivables
        FROM analytics_customers
        WHERE analytics_date = CURRENT_DATE
      `);

      return {
        success: true,
        behavior: result.rows[0]
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Predict next purchase date
   * @param {integer} partyId - Party ID
   */
  async predictNextPurchase(partyId) {
    try {
      const result = await this.pool.query(`
        SELECT
          CURRENT_DATE + INTERVAL '1 day' * 
            ROUND(AVG(EXTRACT(DAY FROM (MAX(sale_date) - LAG(MAX(sale_date)) 
            OVER ()))))
          as predicted_purchase_date,
          ROUND(
            COUNT(DISTINCT DATE(sale_date))::NUMERIC /
            ((EXTRACT(DAY FROM MAX(sale_date) - MIN(sale_date)) + 1) / 365),
            2
          ) as purchase_frequency_per_year
        FROM analytics_sales
        WHERE party_id = $1
      `, [partyId]);

      return {
        success: true,
        prediction: result.rows[0]
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = CustomerAnalyticsService;

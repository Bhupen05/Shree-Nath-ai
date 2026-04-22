/**
 * Analytics Controller
 * Orchestrates analytics services and coordinates requests
 */

const KPIService = require('../services/kpi.service');
const SalesAnalyticsService = require('../services/sales-analytics.service');
const CustomerAnalyticsService = require('../services/customer-analytics.service');
const InventoryAnalyticsService = require('../services/inventory-analytics.service');
const ReportService = require('../services/report.service');
const DashboardService = require('../services/dashboard.service');

class AnalyticsController {
  constructor(pool) {
    this.pool = pool;
    this.kpiService = new KPIService(pool);
    this.salesService = new SalesAnalyticsService(pool);
    this.customerService = new CustomerAnalyticsService(pool);
    this.inventoryService = new InventoryAnalyticsService(pool);
    this.reportService = new ReportService(pool);
    this.dashboardService = new DashboardService(pool);
  }

  /**
   * KPI endpoints
   */

  // Create KPI
  async createKPI(req, res) {
    try {
      const result = await this.kpiService.createKPI(req.body);
      if (!result.success) {
        return res.status(400).json(result);
      }
      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Record KPI metric
  async recordKPIMetric(req, res) {
    try {
      const { kpiId, metricDate, metricValue } = req.body;
      const result = await this.kpiService.recordMetric(kpiId, metricDate, metricValue);
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Get KPI dashboard
  async getKPIDashboard(req, res) {
    try {
      const { category } = req.query;
      const result = await this.kpiService.getDashboardSummary(category);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Get KPI alerts
  async getKPIAlerts(req, res) {
    try {
      const result = await this.kpiService.getAlertsKPIs();
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Get KPI trend
  async getKPITrend(req, res) {
    try {
      const { kpiId } = req.params;
      const { periods = 12 } = req.query;
      const result = await this.kpiService.getTrendAnalysis(kpiId, parseInt(periods));
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Sales Analytics endpoints
   */

  // Get daily sales summary
  async getDailySalesSummary(req, res) {
    try {
      const { startDate, endDate } = req.query;
      const result = await this.salesService.getDailySalesSummary(
        new Date(startDate),
        new Date(endDate)
      );
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Get top products
  async getTopProducts(req, res) {
    try {
      const { limit = 10, startDate, endDate } = req.query;
      const result = await this.salesService.getTopProducts(
        parseInt(limit),
        startDate ? new Date(startDate) : null,
        endDate ? new Date(endDate) : null
      );
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Get top customers
  async getTopCustomers(req, res) {
    try {
      const { limit = 10 } = req.query;
      const result = await this.salesService.getTopCustomers(parseInt(limit));
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Get sales by category
  async getSalesByCategory(req, res) {
    try {
      const { startDate, endDate } = req.query;
      const result = await this.salesService.getSalesByCategory(
        new Date(startDate),
        new Date(endDate)
      );
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Get sales metrics
  async getSalesMetrics(req, res) {
    try {
      const { startDate, endDate } = req.query;
      const result = await this.salesService.calculateMetrics(
        new Date(startDate),
        new Date(endDate)
      );
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Customer Analytics endpoints
   */

  // Get customer segmentation
  async getCustomerSegmentation(req, res) {
    try {
      const result = await this.customerService.getCustomerSegmentation();
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Get at-risk customers
  async getAtRiskCustomers(req, res) {
    try {
      const { threshold = 0.7, limit = 20 } = req.query;
      const result = await this.customerService.getAtRiskCustomers(
        parseFloat(threshold),
        parseInt(limit)
      );
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Get VIP customers
  async getVIPCustomers(req, res) {
    try {
      const { limit = 10 } = req.query;
      const result = await this.customerService.getVIPCustomers(parseInt(limit));
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Get payment behavior
  async getPaymentBehavior(req, res) {
    try {
      const result = await this.customerService.getPaymentBehavior();
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Inventory Analytics endpoints
   */

  // Get inventory status
  async getInventoryStatus(req, res) {
    try {
      const result = await this.inventoryService.getInventoryStatusSummary();
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Get low stock alerts
  async getLowStockAlerts(req, res) {
    try {
      const { limit = 20 } = req.query;
      const result = await this.inventoryService.getLowStockAlerts(parseInt(limit));
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Get overstock items
  async getOverstockItems(req, res) {
    try {
      const { limit = 20 } = req.query;
      const result = await this.inventoryService.getOverstockItems(parseInt(limit));
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Get inventory value
  async getInventoryValue(req, res) {
    try {
      const result = await this.inventoryService.getInventoryValue();
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Report endpoints
   */

  // Get available reports
  async getReports(req, res) {
    try {
      const { category } = req.query;
      const result = await this.reportService.getAvailableReports(category);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Execute report
  async executeReport(req, res) {
    try {
      const { reportId } = req.params;
      const { parameters } = req.body;
      const result = await this.reportService.executeReport(reportId, parameters);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Get report execution history
  async getReportHistory(req, res) {
    try {
      const { reportId } = req.params;
      const { limit = 20 } = req.query;
      const result = await this.reportService.getExecutionHistory(reportId, parseInt(limit));
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Dashboard endpoints
   */

  // Get dashboard
  async getDashboard(req, res) {
    try {
      const { dashboardId } = req.params;
      const result = await this.dashboardService.getDashboard(dashboardId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Get user dashboards
  async getUserDashboards(req, res) {
    try {
      const userId = req.user.id;
      const result = await this.dashboardService.getUserDashboards(userId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Create dashboard
  async createDashboard(req, res) {
    try {
      const result = await this.dashboardService.createDashboard({
        ...req.body,
        ownerId: req.user.id
      });
      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Get available widgets
  async getAvailableWidgets(req, res) {
    try {
      const result = await this.dashboardService.getAvailableWidgets();
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Get widget data
  async getWidgetData(req, res) {
    try {
      const { widgetId } = req.params;
      const { parameters } = req.query;
      const result = await this.dashboardService.getWidgetData(
        widgetId,
        parameters ? JSON.parse(parameters) : {}
      );
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Metadata endpoints
   */

  // Get KPI categories
  async getKPICategories(req, res) {
    try {
      const categories = await this.kpiService.getCategories();
      res.json({ success: true, categories });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Get dashboard types
  async getDashboardTypes(req, res) {
    try {
      const types = this.dashboardService.getDashboardTypes();
      res.json({ success: true, types });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Get widget types
  async getWidgetTypes(req, res) {
    try {
      const types = this.dashboardService.getWidgetTypes();
      res.json({ success: true, types });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Get chart types
  async getChartTypes(req, res) {
    try {
      const types = this.dashboardService.getChartTypes();
      res.json({ success: true, types });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = AnalyticsController;

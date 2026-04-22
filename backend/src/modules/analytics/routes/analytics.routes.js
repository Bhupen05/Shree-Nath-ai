/**
 * Analytics Routes
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../../middleware/auth.middleware');
const AnalyticsController = require('../controllers/analytics.controller');

// Initialize controller
let controller;

function initController(pool) {
  controller = new AnalyticsController(pool);
}

/**
 * KPI Endpoints
 */

// Create KPI (admin only)
router.post('/kpis', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  await controller.createKPI(req, res);
});

// Record KPI metric
router.post('/kpis/:kpiId/metrics', authenticateToken, async (req, res) => {
  await controller.recordKPIMetric(req, res);
});

// Get KPI dashboard
router.get('/kpis/dashboard', authenticateToken, async (req, res) => {
  await controller.getKPIDashboard(req, res);
});

// Get KPI alerts
router.get('/kpis/alerts', authenticateToken, async (req, res) => {
  await controller.getKPIAlerts(req, res);
});

// Get KPI trend
router.get('/kpis/:kpiId/trend', authenticateToken, async (req, res) => {
  await controller.getKPITrend(req, res);
});

/**
 * Sales Analytics Endpoints
 */

// Get daily sales summary
router.get('/sales/daily', authenticateToken, async (req, res) => {
  await controller.getDailySalesSummary(req, res);
});

// Get top products
router.get('/sales/top-products', authenticateToken, async (req, res) => {
  await controller.getTopProducts(req, res);
});

// Get top customers
router.get('/sales/top-customers', authenticateToken, async (req, res) => {
  await controller.getTopCustomers(req, res);
});

// Get sales by category
router.get('/sales/by-category', authenticateToken, async (req, res) => {
  await controller.getSalesByCategory(req, res);
});

// Get sales metrics
router.get('/sales/metrics', authenticateToken, async (req, res) => {
  await controller.getSalesMetrics(req, res);
});

/**
 * Customer Analytics Endpoints
 */

// Get customer segmentation
router.get('/customers/segmentation', authenticateToken, async (req, res) => {
  await controller.getCustomerSegmentation(req, res);
});

// Get at-risk customers
router.get('/customers/at-risk', authenticateToken, async (req, res) => {
  await controller.getAtRiskCustomers(req, res);
});

// Get VIP customers
router.get('/customers/vip', authenticateToken, async (req, res) => {
  await controller.getVIPCustomers(req, res);
});

// Get payment behavior
router.get('/customers/payment-behavior', authenticateToken, async (req, res) => {
  await controller.getPaymentBehavior(req, res);
});

/**
 * Inventory Analytics Endpoints
 */

// Get inventory status
router.get('/inventory/status', authenticateToken, async (req, res) => {
  await controller.getInventoryStatus(req, res);
});

// Get low stock alerts
router.get('/inventory/low-stock', authenticateToken, async (req, res) => {
  await controller.getLowStockAlerts(req, res);
});

// Get overstock items
router.get('/inventory/overstock', authenticateToken, async (req, res) => {
  await controller.getOverstockItems(req, res);
});

// Get inventory value
router.get('/inventory/value', authenticateToken, async (req, res) => {
  await controller.getInventoryValue(req, res);
});

/**
 * Report Endpoints
 */

// Get available reports
router.get('/reports', authenticateToken, async (req, res) => {
  await controller.getReports(req, res);
});

// Execute report
router.post('/reports/:reportId/execute', authenticateToken, async (req, res) => {
  await controller.executeReport(req, res);
});

// Get report execution history
router.get('/reports/:reportId/history', authenticateToken, async (req, res) => {
  await controller.getReportHistory(req, res);
});

/**
 * Dashboard Endpoints
 */

// Get user dashboards
router.get('/dashboards', authenticateToken, async (req, res) => {
  await controller.getUserDashboards(req, res);
});

// Create dashboard
router.post('/dashboards', authenticateToken, async (req, res) => {
  await controller.createDashboard(req, res);
});

// Get specific dashboard
router.get('/dashboards/:dashboardId', authenticateToken, async (req, res) => {
  await controller.getDashboard(req, res);
});

// Get available widgets
router.get('/widgets', authenticateToken, async (req, res) => {
  await controller.getAvailableWidgets(req, res);
});

// Get widget data
router.get('/widgets/:widgetId/data', authenticateToken, async (req, res) => {
  await controller.getWidgetData(req, res);
});

/**
 * Metadata Endpoints
 */

// Get KPI categories
router.get('/metadata/kpi-categories', authenticateToken, async (req, res) => {
  await controller.getKPICategories(req, res);
});

// Get dashboard types
router.get('/metadata/dashboard-types', authenticateToken, async (req, res) => {
  await controller.getDashboardTypes(req, res);
});

// Get widget types
router.get('/metadata/widget-types', authenticateToken, async (req, res) => {
  await controller.getWidgetTypes(req, res);
});

// Get chart types
router.get('/metadata/chart-types', authenticateToken, async (req, res) => {
  await controller.getChartTypes(req, res);
});

module.exports = {
  router,
  initController
};

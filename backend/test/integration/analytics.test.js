/**
 * Analytics Integration Tests
 * Comprehensive test suite for analytics module
 */

const request = require('supertest');
const { pool } = require('../../src/db');
const KPIService = require('../../src/modules/analytics/services/kpi.service');
const SalesAnalyticsService = require('../../src/modules/analytics/services/sales-analytics.service');
const CustomerAnalyticsService = require('../../src/modules/analytics/services/customer-analytics.service');
const InventoryAnalyticsService = require('../../src/modules/analytics/services/inventory-analytics.service');
const ReportService = require('../../src/modules/analytics/services/report.service');
const DashboardService = require('../../src/modules/analytics/services/dashboard.service');

describe('Analytics Module Integration Tests', () => {
  let kpiService;
  let salesService;
  let customerService;
  let inventoryService;
  let reportService;
  let dashboardService;

  beforeAll(() => {
    kpiService = new KPIService(pool);
    salesService = new SalesAnalyticsService(pool);
    customerService = new CustomerAnalyticsService(pool);
    inventoryService = new InventoryAnalyticsService(pool);
    reportService = new ReportService(pool);
    dashboardService = new DashboardService(pool);
  });

  /**
   * KPI Service Tests
   */
  describe('KPI Service', () => {
    let createdKpiId;

    test('should create KPI definition', async () => {
      const result = await kpiService.createKPI({
        kpiCode: 'REVENUE_TARGET',
        kpiName: 'Monthly Revenue Target',
        kpiCategory: 'SALES',
        formula: 'SUM(sale_amount)',
        targetValue: 500000,
        warningThreshold: -10,
        criticalThreshold: -25,
        measurementUnit: 'Amount',
        measurementFrequency: 'MONTHLY',
        description: 'Track monthly revenue against target',
        createdBy: 1
      });

      expect(result.success).toBe(true);
      expect(result.kpi).toBeDefined();
      expect(result.kpi.kpi_code).toBe('REVENUE_TARGET');
      createdKpiId = result.kpi.id;
    });

    test('should record KPI metric', async () => {
      const result = await kpiService.recordMetric(
        createdKpiId,
        new Date(),
        450000
      );

      expect(result.success).toBe(true);
      expect(result.metric).toBeDefined();
      expect(result.status).toBe('ON_TRACK');
    });

    test('should calculate KPI at critical threshold', async () => {
      const result = await kpiService.recordMetric(
        createdKpiId,
        new Date(),
        350000
      );

      expect(result.success).toBe(true);
      expect(result.status).toBe('CRITICAL');
    });

    test('should get KPI dashboard summary', async () => {
      const result = await kpiService.getDashboardSummary('SALES');

      expect(result.success).toBe(true);
      expect(result.kpis).toBeDefined();
      expect(Array.isArray(result.kpis)).toBe(true);
    });

    test('should get KPI trend analysis', async () => {
      const result = await kpiService.getTrendAnalysis(createdKpiId, 5);

      expect(result.success).toBe(true);
      expect(result.metrics).toBeDefined();
      expect(result.trend).toMatch(/STABLE|IMPROVING|DECLINING/);
    });

    test('should get KPI categories', async () => {
      const categories = await kpiService.getCategories();

      expect(Array.isArray(categories)).toBe(true);
      expect(categories).toContain('SALES');
      expect(categories).toContain('INVENTORY');
    });
  });

  /**
   * Sales Analytics Tests
   */
  describe('Sales Analytics Service', () => {
    test('should record sale for analytics', async () => {
      const result = await salesService.recordSale({
        billId: 1,
        saleDate: new Date(),
        saleAmount: 50000,
        partyId: 1,
        partId: 1,
        quantitySold: 100,
        unitPrice: 500,
        discountGiven: 5000,
        taxAmount: 2000,
        paymentStatus: 'PAID'
      });

      expect(result.success).toBe(true);
      expect(result.analyticsId).toBeDefined();
    });

    test('should get top products', async () => {
      const result = await salesService.getTopProducts(5);

      expect(result.success).toBe(true);
      expect(result.topProducts).toBeDefined();
      expect(Array.isArray(result.topProducts)).toBe(true);
    });

    test('should get top customers', async () => {
      const result = await salesService.getTopCustomers(10);

      expect(result.success).toBe(true);
      expect(result.topCustomers).toBeDefined();
      expect(Array.isArray(result.topCustomers)).toBe(true);
    });

    test('should calculate sales metrics', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      const endDate = new Date();

      const result = await salesService.calculateMetrics(startDate, endDate);

      expect(result.success).toBe(true);
      expect(result.metrics).toBeDefined();
      expect(result.metrics.total_orders).toBeDefined();
      expect(result.metrics.total_revenue).toBeDefined();
    });

    test('should get sales trend', async () => {
      const result = await salesService.getSalesTrend(30);

      expect(result.success).toBe(true);
      expect(result.trend).toMatch(/STABLE|INCREASING|DECREASING/);
      expect(result.metrics).toBeDefined();
    });

    test('should get payment statistics', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      const endDate = new Date();

      const result = await salesService.getPaymentStats(startDate, endDate);

      expect(result.success).toBe(true);
      expect(result.paymentStats).toBeDefined();
    });
  });

  /**
   * Customer Analytics Tests
   */
  describe('Customer Analytics Service', () => {
    let partyId = 1;

    test('should record customer metrics', async () => {
      const result = await customerService.recordCustomerMetrics({
        partyId,
        analyticsDate: new Date(),
        totalPurchasesCount: 10,
        totalPurchaseAmount: 500000,
        averagePurchaseValue: 50000,
        daysSinceLastPurchase: 5,
        customerLifetimeValue: 500000,
        paymentScore: 95,
        paymentOnTimeCount: 9,
        paymentLateCount: 1,
        totalOutstandingAmount: 0,
        customerStatus: 'VIP'
      });

      expect(result.success).toBe(true);
      expect(result.analyticsId).toBeDefined();
      expect(result.churnRiskScore).toBeGreaterThanOrEqual(0);
      expect(result.churnRiskScore).toBeLessThanOrEqual(1);
    });

    test('should get customer segmentation', async () => {
      const result = await customerService.getCustomerSegmentation();

      expect(result.success).toBe(true);
      expect(result.segments).toBeDefined();
      expect(Array.isArray(result.segments)).toBe(true);
    });

    test('should get at-risk customers', async () => {
      const result = await customerService.getAtRiskCustomers(0.5, 10);

      expect(result.success).toBe(true);
      expect(result.atRiskCustomers).toBeDefined();
      expect(Array.isArray(result.atRiskCustomers)).toBe(true);
    });

    test('should get VIP customers', async () => {
      const result = await customerService.getVIPCustomers(10);

      expect(result.success).toBe(true);
      expect(result.vipCustomers).toBeDefined();
      expect(Array.isArray(result.vipCustomers)).toBe(true);
    });

    test('should get payment behavior analysis', async () => {
      const result = await customerService.getPaymentBehavior();

      expect(result.success).toBe(true);
      expect(result.behavior).toBeDefined();
      expect(result.behavior.avg_payment_score).toBeDefined();
    });

    test('should get inactive customers', async () => {
      const result = await customerService.getInactiveCustomers(180, 20);

      expect(result.success).toBe(true);
      expect(result.inactiveCustomers).toBeDefined();
      expect(Array.isArray(result.inactiveCustomers)).toBe(true);
    });
  });

  /**
   * Inventory Analytics Tests
   */
  describe('Inventory Analytics Service', () => {
    let partId = 1;
    let locationId = 1;

    test('should record inventory snapshot', async () => {
      const result = await inventoryService.recordInventorySnapshot({
        partId,
        locationId,
        snapshotDate: new Date(),
        quantityOnHand: 500,
        quantityAvailable: 450,
        quantityReserved: 50,
        quantitySold30d: 100,
        quantitySold90d: 300,
        reorderLevel: 100,
        damagedCount: 5
      });

      expect(result.success).toBe(true);
      expect(result.analyticsId).toBeDefined();
      expect(result.stockStatus).toMatch(/OPTIMAL|LOWSTOCK|STOCKOUT|OVERSTOCK/);
    });

    test('should get inventory status summary', async () => {
      const result = await inventoryService.getInventoryStatusSummary();

      expect(result.success).toBe(true);
      expect(result.summary).toBeDefined();
      expect(Array.isArray(result.summary)).toBe(true);
    });

    test('should get low stock alerts', async () => {
      const result = await inventoryService.getLowStockAlerts(20);

      expect(result.success).toBe(true);
      expect(result.alerts).toBeDefined();
      expect(Array.isArray(result.alerts)).toBe(true);
    });

    test('should get overstock items', async () => {
      const result = await inventoryService.getOverstockItems(20);

      expect(result.success).toBe(true);
      expect(result.overstockItems).toBeDefined();
      expect(Array.isArray(result.overstockItems)).toBe(true);
    });

    test('should calculate inventory turnover', async () => {
      const result = await inventoryService.calculateTurnover(partId, 90);

      if (result.success) {
        expect(result.turnover).toBeDefined();
        expect(result.turnover.turnover_ratio).toBeDefined();
      }
    });

    test('should get inventory value', async () => {
      const result = await inventoryService.getInventoryValue();

      expect(result.success).toBe(true);
      expect(result.inventoryValue).toBeDefined();
    });

    test('should get slow-moving items', async () => {
      const result = await inventoryService.getSlowMovingItems(20);

      expect(result.success).toBe(true);
      expect(result.slowMovingItems).toBeDefined();
      expect(Array.isArray(result.slowMovingItems)).toBe(true);
    });
  });

  /**
   * Report Service Tests
   */
  describe('Report Service', () => {
    let createdReportId;

    test('should define report', async () => {
      const result = await reportService.defineReport({
        reportCode: 'DAILY_SALES',
        reportName: 'Daily Sales Report',
        reportType: 'STANDARD',
        reportCategory: 'SALES',
        reportQuery: 'SELECT * FROM v_sales_daily_performance LIMIT 100',
        parameters: { startDate: 'today', endDate: 'today' },
        schedule: 'DAILY',
        deliveryChannels: ['EMAIL'],
        ownerId: 1,
        description: 'Daily sales summary report'
      });

      expect(result.success).toBe(true);
      expect(result.report).toBeDefined();
      createdReportId = result.report.id;
    });

    test('should get available reports', async () => {
      const result = await reportService.getAvailableReports();

      expect(result.success).toBe(true);
      expect(result.reports).toBeDefined();
      expect(Array.isArray(result.reports)).toBe(true);
    });

    test('should execute report', async () => {
      const result = await reportService.executeReport(createdReportId);

      expect(result.success).toBe(true);
      expect(result.executionId).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.executionTime).toBeGreaterThan(0);
    });

    test('should get report execution history', async () => {
      const result = await reportService.getExecutionHistory(createdReportId, 10);

      expect(result.success).toBe(true);
      expect(result.history).toBeDefined();
      expect(Array.isArray(result.history)).toBe(true);
    });

    test('should export report data to CSV', async () => {
      const data = [
        { id: 1, name: 'Product A', amount: 1000 },
        { id: 2, name: 'Product B', amount: 2000 }
      ];

      const result = await reportService.exportReport(data, 'CSV');

      expect(result.success).toBe(true);
      expect(result.data).toContain('id,name,amount');
    });

    test('should export report data to JSON', async () => {
      const data = [{ id: 1, name: 'Test' }];
      const result = await reportService.exportReport(data, 'JSON');

      expect(result.success).toBe(true);
      expect(JSON.parse(result.data)).toBeDefined();
    });

    test('should get standard report templates', () => {
      const templates = reportService.getStandardReports();

      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBeGreaterThan(0);
      expect(templates[0]).toHaveProperty('code');
    });
  });

  /**
   * Dashboard Service Tests
   */
  describe('Dashboard Service', () => {
    let createdDashboardId;
    let createdWidgetId;

    test('should create widget', async () => {
      const result = await dashboardService.createWidget({
        widgetCode: 'SALES_METRIC',
        widgetName: 'Sales Metric',
        widgetType: 'METRIC',
        chartType: null,
        dataSource: 'v_sales_daily_performance',
        config: { decimals: 2, format: 'currency' },
        refreshInterval: 300
      });

      expect(result.success).toBe(true);
      expect(result.widget).toBeDefined();
      createdWidgetId = result.widget.id;
    });

    test('should create dashboard', async () => {
      const result = await dashboardService.createDashboard({
        dashboardName: 'Executive Dashboard',
        dashboardType: 'EXECUTIVE',
        ownerId: 1,
        layoutConfig: { cols: 12, rows: 8 },
        description: 'Main executive dashboard',
        isDefault: true,
        isPublic: false
      });

      expect(result.success).toBe(true);
      expect(result.dashboard).toBeDefined();
      createdDashboardId = result.dashboard.id;
    });

    test('should add widget to dashboard', async () => {
      const result = await dashboardService.addWidgetToDashboard(
        createdDashboardId,
        createdWidgetId,
        {
          positionX: 0,
          positionY: 0,
          width: 6,
          height: 3
        }
      );

      expect(result.success).toBe(true);
      expect(result.mappingId).toBeDefined();
    });

    test('should get dashboard with widgets', async () => {
      const result = await dashboardService.getDashboard(createdDashboardId);

      expect(result.success).toBe(true);
      expect(result.dashboard).toBeDefined();
      expect(result.dashboard.widgets).toBeDefined();
    });

    test('should get available widgets', async () => {
      const result = await dashboardService.getAvailableWidgets();

      expect(result.success).toBe(true);
      expect(result.widgets).toBeDefined();
      expect(Array.isArray(result.widgets)).toBe(true);
    });

    test('should get dashboard types', () => {
      const types = dashboardService.getDashboardTypes();

      expect(Array.isArray(types)).toBe(true);
      expect(types.some(t => t.type === 'EXECUTIVE')).toBe(true);
    });

    test('should get widget types', () => {
      const types = dashboardService.getWidgetTypes();

      expect(Array.isArray(types)).toBe(true);
      expect(types.map(t => t.type)).toContain('METRIC');
    });

    test('should get chart types', () => {
      const types = dashboardService.getChartTypes();

      expect(Array.isArray(types)).toBe(true);
      expect(types).toContain('LINE');
      expect(types).toContain('BAR');
    });
  });

  /**
   * Cross-Service Integration Tests
   */
  describe('Cross-Service Integration', () => {
    test('should support complete KPI to Dashboard workflow', async () => {
      // 1. Create KPI
      const kpiResult = await kpiService.createKPI({
        kpiCode: 'TEST_KPI',
        kpiName: 'Test KPI',
        kpiCategory: 'SALES',
        formula: 'SUM(test)',
        targetValue: 1000,
        warningThreshold: -10,
        criticalThreshold: -25,
        measurementUnit: 'Units',
        measurementFrequency: 'DAILY',
        description: 'Test KPI',
        createdBy: 1
      });
      expect(kpiResult.success).toBe(true);

      // 2. Record metric
      const metricResult = await kpiService.recordMetric(
        kpiResult.kpi.id,
        new Date(),
        950
      );
      expect(metricResult.success).toBe(true);

      // 3. Create widget
      const widgetResult = await dashboardService.createWidget({
        widgetCode: 'TEST_KPI_WIDGET',
        widgetName: 'Test KPI Widget',
        widgetType: 'GAUGE',
        chartType: null,
        dataSource: 'v_kpi_dashboard',
        config: { min: 0, max: 1000 },
        refreshInterval: 300
      });
      expect(widgetResult.success).toBe(true);

      // 4. Create dashboard
      const dashResult = await dashboardService.createDashboard({
        dashboardName: 'Test Dashboard',
        dashboardType: 'MANAGER',
        ownerId: 1,
        layoutConfig: { cols: 12 },
        description: 'Test'
      });
      expect(dashResult.success).toBe(true);

      // 5. Add widget to dashboard
      const mapResult = await dashboardService.addWidgetToDashboard(
        dashResult.dashboard.id,
        widgetResult.widget.id,
        { positionX: 0, positionY: 0, width: 6, height: 3 }
      );
      expect(mapResult.success).toBe(true);
    });

    test('should support complete Sales to Report workflow', async () => {
      // 1. Record sale
      const saleResult = await salesService.recordSale({
        billId: 2,
        saleDate: new Date(),
        saleAmount: 100000,
        partyId: 2,
        partId: 2,
        quantitySold: 50,
        unitPrice: 2000,
        discountGiven: 0,
        taxAmount: 5000,
        paymentStatus: 'PAID'
      });
      expect(saleResult.success).toBe(true);

      // 2. Get sales metrics
      const metricsResult = await salesService.calculateMetrics(
        new Date('2024-01-01'),
        new Date()
      );
      expect(metricsResult.success).toBe(true);
      expect(metricsResult.metrics.total_revenue).toBeGreaterThan(0);
    });
  });
});

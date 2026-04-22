# Phase 9: Analytics & Reporting - Architecture Guide

## Overview

The Analytics & Reporting module provides comprehensive business intelligence, KPI tracking, reporting, and dashboarding capabilities to the Shree-Nath system.

## System Architecture

### Service Layer (6 Independent Services)

```
┌─────────────────────────────────────────────────────────────────┐
│                    Analytics Controller                         │
│                  (Orchestration & Routing)                      │
└─────────────────────────────────────────────────────────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
        ▼                        ▼                        ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  KPI Service     │  │ Sales Analytics  │  │ Customer         │
│                  │  │ Service          │  │ Analytics Svc    │
├──────────────────┤  ├──────────────────┤  ├──────────────────┤
│ • createKPI()    │  │ • recordSale()   │  │ • recordMetrics()│
│ • recordMetric() │  │ • getTopProducts │  │ • getSegments()  │
│ • getTrend()     │  │ • getSalesMetric │  │ • getAtRisk()    │
│ • getAlerts()    │  │ • calculateMetrs │  │ • getVIP()       │
└──────────────────┘  └──────────────────┘  └──────────────────┘
        │                        │                        │
        ├────────────────────────┼────────────────────────┤
        │                        │                        │
        ▼                        ▼                        ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ Inventory        │  │ Report Service   │  │ Dashboard Service│
│ Analytics Svc    │  │                  │  │                  │
├──────────────────┤  ├──────────────────┤  ├──────────────────┤
│ • recordSnapshot │  │ • defineReport() │  │ • createWidget() │
│ • getStatus()    │  │ • executeReport()│  │ • createDashbrd()│
│ • getLowStock()  │  │ • getReports()   │  │ • getDashboard() │
│ • getTurnover()  │  │ • subscribe()    │  │ • getWidgetData()│
└──────────────────┘  └──────────────────┘  └──────────────────┘
        │                        │                        │
        └────────────────────────┼────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
                    ▼                         ▼
            ┌──────────────────┐    ┌──────────────────┐
            │  PostgreSQL DB   │    │  Analytics Cache │
            │  (14 Tables)     │    │  (Redis/Memory)  │
            │  (6 Views)       │    │  (Performance)   │
            └──────────────────┘    └──────────────────┘
```

## Database Schema

### Core Analytics Tables (10 Tables)

#### 1. **KPI Definition & Metrics**
- `kpi_definitions` - KPI configuration (code, formula, thresholds)
- `kpi_metrics` - Time-series KPI measurements

#### 2. **Domain Analytics**
- `analytics_sales` - Sales transaction snapshots
- `analytics_inventory` - Inventory status snapshots
- `analytics_customers` - Customer analytics snapshots
- `analytics_financial` - Financial metrics
- `analytics_operational` - Operational metrics

#### 3. **Reporting**
- `report_definitions` - Report templates
- `report_executions` - Report run history
- `report_subscriptions` - User report subscriptions

### Dashboard Tables (3 Tables)

- `dashboard_widgets` - Widget definitions and configurations
- `dashboard_layouts` - Dashboard page layouts
- `dashboard_widget_mappings` - Widget placement and sizing

### Supporting Tables

- `analytics_cache` - Performance optimization layer
- `audit_logs` - Compliance and audit trail

## Service Classes

### 1. KPI Service (`kpi.service.js`)

Manages Key Performance Indicators with real-time calculation and trend analysis.

```javascript
// Create KPI
await kpiService.createKPI({
  kpiCode: 'REVENUE_TARGET',
  kpiName: 'Monthly Revenue Target',
  kpiCategory: 'SALES',
  formula: 'SUM(sale_amount)',
  targetValue: 500000,
  warningThreshold: -10,
  criticalThreshold: -25,
  measurementUnit: 'Amount',
  measurementFrequency: 'MONTHLY'
});

// Record metric
await kpiService.recordMetric(kpiId, new Date(), 450000);

// Get dashboard
await kpiService.getDashboardSummary('SALES');

// Get alerts
await kpiService.getAlertsKPIs();

// Get trend
await kpiService.getTrendAnalysis(kpiId, 12);
```

**Methods:**
- `createKPI()` - Define new KPI
- `recordMetric()` - Record KPI value
- `getMetricsForRange()` - Get historical metrics
- `getDashboardSummary()` - Get current KPI status
- `getAlertsKPIs()` - Get alert-level KPIs
- `getTrendAnalysis()` - Analyze trends
- `compareKPIs()` - Compare multiple KPIs

### 2. Sales Analytics Service (`sales-analytics.service.js`)

Tracks sales performance, trends, and customer behavior.

```javascript
// Record sale
await salesService.recordSale({
  billId: 1,
  saleDate: new Date(),
  saleAmount: 50000,
  partyId: 1,
  partId: 1,
  quantitySold: 100,
  unitPrice: 500
});

// Get top products
await salesService.getTopProducts(10);

// Get metrics
await salesService.calculateMetrics(startDate, endDate);
```

**Methods:**
- `recordSale()` - Log sale for analytics
- `getDailySalesSummary()` - Daily aggregation
- `getTopProducts()` - Best sellers
- `getTopCustomers()` - Top revenue sources
- `getSalesByCategory()` - Category breakdown
- `getSalesTrend()` - Trend analysis
- `getPaymentStats()` - Payment tracking
- `calculateMetrics()` - Performance metrics

### 3. Customer Analytics Service (`customer-analytics.service.js`)

Analyzes customer behavior, segmentation, and churn risk.

```javascript
// Record customer metrics
await customerService.recordCustomerMetrics({
  partyId: 1,
  totalPurchasesCount: 10,
  totalPurchaseAmount: 500000,
  daysSinceLastPurchase: 5,
  paymentScore: 95,
  customerStatus: 'VIP'
});

// Get segmentation
await customerService.getCustomerSegmentation();

// Get at-risk customers
await customerService.getAtRiskCustomers(0.7, 20);
```

**Methods:**
- `recordCustomerMetrics()` - Update customer analytics
- `getCustomerSegmentation()` - Segment customers
- `getAtRiskCustomers()` - Churn risk analysis
- `getVIPCustomers()` - VIP customer tracking
- `getCustomerHealthScore()` - Individual score
- `getInactiveCustomers()` - Inactive analysis
- `getPaymentBehavior()` - Payment patterns
- `predictNextPurchase()` - Purchase prediction

### 4. Inventory Analytics Service (`inventory-analytics.service.js`)

Monitors inventory health, stock levels, and optimization.

```javascript
// Record inventory
await inventoryService.recordInventorySnapshot({
  partId: 1,
  locationId: 1,
  quantityOnHand: 500,
  quantityReserved: 50,
  quantitySold30d: 100,
  reorderLevel: 100
});

// Get low stock alerts
await inventoryService.getLowStockAlerts(20);

// Get turnover
await inventoryService.calculateTurnover(partId, 90);
```

**Methods:**
- `recordInventorySnapshot()` - Snapshot inventory state
- `getInventoryStatusSummary()` - Overall health
- `getLowStockAlerts()` - Reorder alerts
- `getOverstockItems()` - Excess inventory
- `calculateTurnover()` - Turnover ratio
- `getInventoryValue()` - Total value
- `getSlowMovingItems()` - Slow movers

### 5. Report Service (`report.service.js`)

Generates, schedules, and distributes reports.

```javascript
// Define report
await reportService.defineReport({
  reportCode: 'DAILY_SALES',
  reportName: 'Daily Sales Report',
  reportType: 'STANDARD',
  reportQuery: 'SELECT * FROM v_sales_daily_performance'
});

// Execute report
await reportService.executeReport(reportId);

// Export data
await reportService.exportReport(data, 'CSV');
```

**Methods:**
- `defineReport()` - Create report template
- `executeReport()` - Run report
- `getAvailableReports()` - List reports
- `getExecutionHistory()` - Report runs
- `subscribeToReport()` - Subscribe user
- `getUserSubscriptions()` - Get user subscriptions
- `exportReport()` - Export to CSV/JSON/Excel
- `getStandardReports()` - Pre-built templates

### 6. Dashboard Service (`dashboard.service.js`)

Manages customizable dashboards and widgets.

```javascript
// Create widget
await dashboardService.createWidget({
  widgetCode: 'SALES_METRIC',
  widgetName: 'Sales Metric',
  widgetType: 'METRIC',
  dataSource: 'v_sales_daily_performance'
});

// Create dashboard
await dashboardService.createDashboard({
  dashboardName: 'Executive Dashboard',
  dashboardType: 'EXECUTIVE',
  ownerId: 1
});

// Add widget
await dashboardService.addWidgetToDashboard(
  dashboardId,
  widgetId,
  { positionX: 0, positionY: 0, width: 6, height: 3 }
);
```

**Methods:**
- `createWidget()` - Create widget
- `createDashboard()` - Create dashboard
- `addWidgetToDashboard()` - Place widget
- `getDashboard()` - Get dashboard
- `getUserDashboards()` - List user dashboards
- `getAvailableWidgets()` - List widgets
- `getWidgetData()` - Fetch widget data
- `getDashboardTypes()` - Get types
- `getWidgetTypes()` - Get types
- `getChartTypes()` - Get types

## Data Models

### KPI Status Values
- `ON_TRACK` - Within target range
- `AT_RISK` - Below warning threshold
- `CRITICAL` - Below critical threshold
- `EXCEEDED` - Above target

### Stock Status Values
- `OPTIMAL` - Normal inventory
- `LOWSTOCK` - Below reorder level
- `STOCKOUT` - Out of stock
- `OVERSTOCK` - Excessive inventory

### Customer Status Values
- `VIP` - High-value customers
- `REGULAR` - Standard customers
- `INACTIVE` - No recent purchases
- `AT_RISK` - High churn risk

### Dashboard Widget Types
- `METRIC` - Single value display
- `CHART` - Visual chart (line, bar, pie, etc.)
- `TABLE` - Data table
- `GAUGE` - Progress/gauge indicator
- `MAP` - Geographic visualization

### Report Types
- `STANDARD` - Pre-built templates
- `CUSTOM` - User-defined
- `SCHEDULED` - Automated
- `AD_HOC` - On-demand

## API Endpoints

### KPI Endpoints
```
POST   /api/analytics/kpis                    # Create KPI
POST   /api/analytics/kpis/:kpiId/metrics    # Record metric
GET    /api/analytics/kpis/dashboard         # Get dashboard
GET    /api/analytics/kpis/alerts            # Get alerts
GET    /api/analytics/kpis/:kpiId/trend      # Get trend
```

### Sales Analytics Endpoints
```
GET    /api/analytics/sales/daily            # Daily summary
GET    /api/analytics/sales/top-products     # Top products
GET    /api/analytics/sales/top-customers    # Top customers
GET    /api/analytics/sales/by-category      # By category
GET    /api/analytics/sales/metrics          # Metrics
```

### Customer Analytics Endpoints
```
GET    /api/analytics/customers/segmentation # Segmentation
GET    /api/analytics/customers/at-risk      # At-risk
GET    /api/analytics/customers/vip          # VIP
GET    /api/analytics/customers/payment-behavior
```

### Inventory Analytics Endpoints
```
GET    /api/analytics/inventory/status       # Status
GET    /api/analytics/inventory/low-stock    # Low stock
GET    /api/analytics/inventory/overstock    # Overstock
GET    /api/analytics/inventory/value        # Value
```

### Report Endpoints
```
GET    /api/analytics/reports                # List reports
POST   /api/analytics/reports/:reportId/execute
GET    /api/analytics/reports/:reportId/history
```

### Dashboard Endpoints
```
GET    /api/analytics/dashboards             # User dashboards
POST   /api/analytics/dashboards             # Create dashboard
GET    /api/analytics/dashboards/:dashboardId
GET    /api/analytics/widgets                # Available widgets
GET    /api/analytics/widgets/:widgetId/data # Widget data
```

## Performance Optimization

### Indexing Strategy
- Date/status columns indexed for fast queries
- Part/location indexed for inventory lookups
- Customer/party indexed for customer analytics
- Report execution logged for audit

### Caching Layer
- Dashboard widget data cached (5-minute TTL)
- KPI calculations cached
- Report definitions cached
- Analytics views materialized

### Query Optimization
- Batch metric recording
- Aggregate queries for summaries
- Time-windowed queries for trends
- Pagination for large datasets

## Integration Points

### Upstream Integrations
1. **Billing Module** → Sales Analytics
   - Invoice data → `analytics_sales`
   - Payment status → Payment analytics

2. **Inventory Module** → Inventory Analytics
   - Stock levels → `analytics_inventory`
   - Movements → Turnover calculation

3. **Customer Module** → Customer Analytics
   - Party data → Customer profiles
   - Payment history → Payment scoring

4. **Voice AI Module** → Audit Logs
   - Call events → Audit trail
   - Compliance tracking

### Downstream Integrations
1. **Frontend Dashboard** ← Dashboard APIs
   - Widget data fetching
   - Real-time updates
   - Layout persistence

2. **Notification System** ← Alert Generation
   - KPI alerts → Notifications
   - Stock alerts → Alerts
   - Report subscriptions

## Security & Authorization

### Role-Based Access
- **Admin** - All analytics, KPI management
- **Manager** - Department dashboards, reports
- **User** - Personal dashboards, read-only data

### Data Privacy
- Customer data aggregated/anonymized
- Payment data encrypted
- Audit logs immutable
- GDPR compliance

## Performance Metrics

### Query Performance
- KPI retrieval: < 200ms
- Sales metrics: < 500ms
- Customer analysis: < 300ms
- Inventory status: < 400ms
- Dashboard load: < 1s

### Data Freshness
- KPI metrics: Updated hourly
- Sales analytics: Updated daily
- Customer analytics: Updated daily
- Inventory: Updated in real-time on changes

## Deployment Considerations

### Database Setup
```sql
-- Run migration
psql -U postgres -d shree_nath -f 202604190005__analytics_reporting.sql

-- Verify tables
\dt analytics_*
\dv v_*
```

### Environment Variables
```
ANALYTICS_CACHE_TTL=300
ANALYTICS_BATCH_SIZE=1000
REPORT_EXECUTION_TIMEOUT=300
DASHBOARD_REFRESH_INTERVAL=300
```

### Monitoring
- Query execution time
- Cache hit ratio
- Report generation time
- API response times

## Future Enhancements

1. **Predictive Analytics**
   - Demand forecasting
   - Customer lifetime value prediction
   - Churn prediction models

2. **Real-time Analytics**
   - WebSocket live updates
   - Event streaming
   - Real-time KPI updates

3. **Advanced Visualizations**
   - 3D charts
   - Network graphs
   - Geospatial maps

4. **ML Integration**
   - Anomaly detection
   - Pattern recognition
   - Recommendation engine

5. **Export Enhancements**
   - PDF generation with styling
   - Excel with formulas
   - PowerPoint presentations
   - API data feeds

## Support & Documentation

- Architecture: See this file
- API Reference: [analytics-api-reference.md](./analytics-api-reference.md)
- Quick Reference: [analytics-quick-reference.md](./analytics-quick-reference.md)
- Testing: [validation-checklist.md](./validation-checklist.md)

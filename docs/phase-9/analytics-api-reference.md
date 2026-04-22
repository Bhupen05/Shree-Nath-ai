# Phase 9: Analytics API Reference

## API Specification

All endpoints require JWT authentication token in `Authorization: Bearer <token>` header.

## KPI Management

### Create KPI Definition
```
POST /api/analytics/kpis
Content-Type: application/json
Authorization: Bearer <token>

{
  "kpiCode": "REVENUE_TARGET",
  "kpiName": "Monthly Revenue Target",
  "kpiCategory": "SALES",
  "formula": "SUM(sale_amount)",
  "targetValue": 500000,
  "warningThreshold": -10,
  "criticalThreshold": -25,
  "measurementUnit": "Amount",
  "measurementFrequency": "MONTHLY",
  "description": "Track monthly revenue"
}

Response: 201 Created
{
  "success": true,
  "kpi": {
    "id": 1,
    "kpiCode": "REVENUE_TARGET",
    "kpiName": "Monthly Revenue Target",
    "createdAt": "2024-06-19T10:00:00Z"
  }
}
```

### Record KPI Metric
```
POST /api/analytics/kpis/:kpiId/metrics
Content-Type: application/json
Authorization: Bearer <token>

{
  "metricDate": "2024-06-19",
  "metricValue": 450000
}

Response: 201 Created
{
  "success": true,
  "metric": {
    "id": 1,
    "kpiId": 1,
    "metricDate": "2024-06-19",
    "metricValue": 450000,
    "status": "ON_TRACK"
  },
  "status": "ON_TRACK",
  "variance": -10.0
}
```

### Get KPI Dashboard
```
GET /api/analytics/kpis/dashboard?category=SALES
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "kpis": [
    {
      "id": 1,
      "code": "REVENUE_TARGET",
      "name": "Monthly Revenue Target",
      "category": "SALES",
      "unit": "Amount",
      "metrics": [
        {
          "date": "2024-06-19",
          "value": 450000,
          "target": 500000,
          "variance": -10.0,
          "status": "ON_TRACK"
        }
      ]
    }
  ]
}
```

### Get KPI Alerts
```
GET /api/analytics/kpis/alerts
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "alerts": [
    {
      "id": 1,
      "kpiCode": "REVENUE_TARGET",
      "kpiName": "Monthly Revenue Target",
      "metricDate": "2024-06-19",
      "metricValue": 350000,
      "status": "CRITICAL"
    }
  ],
  "alertCount": 1
}
```

### Get KPI Trend
```
GET /api/analytics/kpis/:kpiId/trend?periods=12
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "trend": "IMPROVING",
  "metrics": [
    {
      "metricDate": "2024-05-19",
      "metricValue": 400000,
      "status": "AT_RISK"
    },
    {
      "metricDate": "2024-06-19",
      "metricValue": 450000,
      "status": "ON_TRACK"
    }
  ],
  "dataPoints": 12
}
```

## Sales Analytics

### Get Daily Sales Summary
```
GET /api/analytics/sales/daily?startDate=2024-06-01&endDate=2024-06-30
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "summary": [
    {
      "salesDate": "2024-06-19",
      "orderCount": 15,
      "totalSales": 750000,
      "avgOrderValue": 50000,
      "totalQuantity": 300,
      "uniqueCustomers": 12,
      "totalDiscounts": 15000,
      "totalTax": 37500
    }
  ]
}
```

### Get Top Products
```
GET /api/analytics/sales/top-products?limit=10&startDate=2024-06-01&endDate=2024-06-30
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "topProducts": [
    {
      "partId": 1,
      "partName": "Product A",
      "totalQuantity": 500,
      "totalRevenue": 250000,
      "transactionCount": 50,
      "avgPrice": 500
    }
  ]
}
```

### Get Sales Metrics
```
GET /api/analytics/sales/metrics?startDate=2024-06-01&endDate=2024-06-30
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "metrics": {
    "totalOrders": 450,
    "uniqueCustomers": 120,
    "totalRevenue": 22500000,
    "avgOrderValue": 50000,
    "maxOrderValue": 150000,
    "minOrderValue": 5000,
    "totalQuantity": 9000,
    "totalDiscounts": 450000,
    "totalTax": 1125000,
    "discountPercentage": 2.0
  }
}
```

## Customer Analytics

### Get Customer Segmentation
```
GET /api/analytics/customers/segmentation
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "segments": [
    {
      "customerStatus": "VIP",
      "customerCount": 50,
      "segmentRevenue": 5000000,
      "avgLtv": 100000,
      "avgPaymentScore": 92,
      "avgChurnRisk": 0.15
    }
  ]
}
```

### Get At-Risk Customers
```
GET /api/analytics/customers/at-risk?threshold=0.7&limit=20
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "atRiskCustomers": [
    {
      "partyId": 5,
      "customerName": "ABC Corp",
      "totalPurchaseAmount": 150000,
      "customerLifetimeValue": 150000,
      "daysSinceLastPurchase": 180,
      "paymentScore": 45,
      "churnRiskScore": 0.75
    }
  ]
}
```

### Get Payment Behavior
```
GET /api/analytics/customers/payment-behavior
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "behavior": {
    "avgPaymentScore": 78.5,
    "avgChurnRisk": 0.32,
    "onTimePayerCount": 85,
    "totalCustomers": 100,
    "totalLatePayments": 45,
    "totalReceivables": 1250000
  }
}
```

## Inventory Analytics

### Get Inventory Status
```
GET /api/analytics/inventory/status
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "summary": [
    {
      "stockStatus": "OPTIMAL",
      "partCount": 250,
      "totalQuantity": 50000,
      "avgPerPart": 200
    },
    {
      "stockStatus": "LOWSTOCK",
      "partCount": 30,
      "totalQuantity": 2000,
      "avgPerPart": 67
    }
  ]
}
```

### Get Low Stock Alerts
```
GET /api/analytics/inventory/low-stock?limit=20
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "alerts": [
    {
      "partId": 1,
      "partName": "Part A",
      "locationId": 1,
      "quantityOnHand": 45,
      "reorderLevel": 100,
      "quantitySold30d": 500,
      "stockStatus": "LOWSTOCK",
      "alertSeverity": "HIGH"
    }
  ]
}
```

### Get Inventory Value
```
GET /api/analytics/inventory/value
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "inventoryValue": {
    "totalInventoryValue": 5000000,
    "uniqueParts": 500,
    "locations": 5,
    "avgValuePerPart": 10000
  }
}
```

## Reports

### Get Available Reports
```
GET /api/analytics/reports?category=SALES
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "reports": [
    {
      "id": 1,
      "reportCode": "DAILY_SALES",
      "reportName": "Daily Sales Report",
      "reportType": "STANDARD",
      "reportCategory": "SALES",
      "description": "Daily sales summary",
      "isActive": true,
      "createdAt": "2024-06-19T10:00:00Z"
    }
  ]
}
```

### Execute Report
```
POST /api/analytics/reports/:reportId/execute
Content-Type: application/json
Authorization: Bearer <token>

{
  "parameters": {
    "startDate": "2024-06-01",
    "endDate": "2024-06-30"
  }
}

Response: 200 OK
{
  "success": true,
  "reportId": 1,
  "executionId": 1,
  "data": [
    {
      "date": "2024-06-19",
      "salesAmount": 750000,
      "orderCount": 15
    }
  ],
  "recordCount": 30,
  "executionTime": 234,
  "executedAt": "2024-06-19T10:05:00Z"
}
```

### Get Report History
```
GET /api/analytics/reports/:reportId/history?limit=20
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "history": [
    {
      "id": 1,
      "executionDate": "2024-06-19T10:05:00Z",
      "executionTimeMs": 234,
      "recordCount": 30,
      "status": "SUCCESS"
    }
  ]
}
```

## Dashboards

### Get User Dashboards
```
GET /api/analytics/dashboards
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "dashboards": [
    {
      "id": 1,
      "dashboardName": "Executive Dashboard",
      "dashboardType": "EXECUTIVE",
      "description": "Main dashboard",
      "isDefault": true,
      "createdAt": "2024-06-19T10:00:00Z"
    }
  ]
}
```

### Create Dashboard
```
POST /api/analytics/dashboards
Content-Type: application/json
Authorization: Bearer <token>

{
  "dashboardName": "Sales Manager Dashboard",
  "dashboardType": "MANAGER",
  "layoutConfig": {"cols": 12, "rows": 8},
  "description": "Dashboard for sales managers",
  "isDefault": false,
  "isPublic": false
}

Response: 201 Created
{
  "success": true,
  "dashboard": {
    "id": 2,
    "dashboardName": "Sales Manager Dashboard",
    "createdAt": "2024-06-19T10:00:00Z"
  }
}
```

### Get Dashboard
```
GET /api/analytics/dashboards/:dashboardId
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "dashboard": {
    "id": 1,
    "dashboardName": "Executive Dashboard",
    "dashboardType": "EXECUTIVE",
    "description": "Main dashboard",
    "layoutConfig": {"cols": 12, "rows": 8},
    "isPublic": false,
    "widgets": [
      {
        "id": 1,
        "widgetCode": "SALES_METRIC",
        "widgetName": "Daily Sales",
        "widgetType": "METRIC",
        "chartType": null,
        "config": {"decimals": 2, "format": "currency"},
        "positionX": 0,
        "positionY": 0,
        "width": 6,
        "height": 3
      }
    ]
  }
}
```

### Get Available Widgets
```
GET /api/analytics/widgets
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "widgets": [
    {
      "id": 1,
      "widgetCode": "SALES_METRIC",
      "widgetName": "Sales Metric",
      "widgetType": "METRIC",
      "chartType": null,
      "description": "Single metric display",
      "refreshIntervalSeconds": 300
    }
  ]
}
```

### Get Widget Data
```
GET /api/analytics/widgets/:widgetId/data?parameters={"startDate":"2024-06-01"}
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "widget": {
    "id": 1,
    "name": "Daily Sales",
    "type": "METRIC",
    "chartType": null,
    "config": {"decimals": 2, "format": "currency"}
  },
  "data": [
    {
      "date": "2024-06-19",
      "amount": 750000
    }
  ],
  "recordCount": 1
}
```

## Metadata Endpoints

### Get KPI Categories
```
GET /api/analytics/metadata/kpi-categories
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "categories": [
    "SALES",
    "INVENTORY",
    "CUSTOMER",
    "FINANCIAL",
    "OPERATIONAL",
    "QUALITY"
  ]
}
```

### Get Dashboard Types
```
GET /api/analytics/metadata/dashboard-types
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "types": [
    {
      "type": "EXECUTIVE",
      "description": "Executive summary dashboard"
    },
    {
      "type": "MANAGER",
      "description": "Manager operations dashboard"
    }
  ]
}
```

### Get Widget Types
```
GET /api/analytics/metadata/widget-types
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "types": [
    {"type": "METRIC", "description": "Single metric display"},
    {"type": "CHART", "description": "Visual chart"},
    {"type": "TABLE", "description": "Data table"}
  ]
}
```

### Get Chart Types
```
GET /api/analytics/metadata/chart-types
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "types": [
    "LINE",
    "BAR",
    "PIE",
    "AREA",
    "SCATTER",
    "BUBBLE",
    "HEATMAP"
  ]
}
```

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "Invalid parameters"
}
```

### 403 Unauthorized
```json
{
  "success": false,
  "error": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Server error message"
}
```

## Rate Limiting

- 100 requests per minute per user for read operations
- 50 requests per minute per user for write operations
- Report executions limited to 10 per hour

## Pagination

List endpoints support pagination:
```
GET /api/analytics/reports?limit=20&offset=0
```

- `limit`: Items per page (default: 20, max: 100)
- `offset`: Starting position (default: 0)

## Filtering

Supported filters vary by endpoint. Common patterns:
```
GET /api/analytics/sales/top-products?limit=10&startDate=2024-06-01&endDate=2024-06-30
GET /api/analytics/customers/segmentation?status=VIP
GET /api/analytics/inventory/low-stock?limit=20
```

## Caching

Responses include cache headers:
```
Cache-Control: max-age=300
ETag: "abc123"
```

Widget data cached for 5 minutes, KPI dashboards for 1 minute.

## Versioning

Current API version: `v1`

Future versions indicated by path: `/api/v2/analytics/...`

## Support

For issues or questions about the Analytics API, refer to:
- [Analytics Architecture](./analytics-architecture.md)
- [Quick Reference](./analytics-quick-reference.md)
- [Validation Checklist](./validation-checklist.md)

# SIBMS - Phase 5+ Implementation Roadmap
## Week-by-Week Execution Plan with Checkpoints

**Prepared for:** Development Team  
**Timeline:** 8 Weeks (Phases 5-9)  
**Start Date:** Week of April 21, 2026  
**Team Size:** 2-3 developers

---

## EXECUTIVE OVERVIEW

```
┌─────────────────────────────────────────────────────────────┐
│              SIBMS Enhancement Roadmap                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ Phase 5 (Week 1-2): Stock Management Foundation             │
│ ├─ Database schema for batch tracking                        │
│ ├─ Stock CRUD APIs (15 endpoints)                            │
│ ├─ Location hierarchy implementation                         │
│ └─ Stock audit logging                                       │
│                                                               │
│ Phase 6 (Week 3-4): Bill-to-Stock Integration               │
│ ├─ Purchase bill → auto stock creation                       │
│ ├─ Sales bill → auto stock removal (FIFO)                    │
│ ├─ Stock reservation system                                  │
│ └─ Payment tracking                                          │
│                                                               │
│ Phase 7 (Week 5): Notification Engine                        │
│ ├─ SMS gateway integration                                   │
│ ├─ WhatsApp integration                                      │
│ ├─ Email service                                             │
│ └─ Notification job scheduler                                │
│                                                               │
│ Phase 8 (Week 6-7): Voice AI Agent Enhancement              │
│ ├─ Speech-to-text integration                                │
│ ├─ NLP intent classification                                 │
│ ├─ Inventory search logic                                    │
│ └─ Text-to-speech response generation                        │
│                                                               │
│ Phase 9 (Week 8): Analytics & Reporting                     │
│ ├─ Stock health reports                                      │
│ ├─ Sales analytics                                           │
│ ├─ Voice agent analytics                                     │
│ └─ Dashboard KPIs                                            │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## WEEK 1-2: PHASE 5 - STOCK MANAGEMENT FOUNDATION

### Week 1: Backend Development

#### Day 1-2: Database Setup & Schema
```sql
Tasks:
□ Create stock_entries table with batch tracking
□ Create stock_logs (immutable audit) table
□ Create location_history for tracking location changes
□ Create all indexes for performance
□ Create views for stock_summary (product → total qty)
□ Write migration script for production deployment

Files to Create:
├── backend/src/db/migrations/
│   └── 005_create_stock_tables.sql
├── backend/src/db/
│   └── stock.schema.js (schema validation)
└── backend/src/db/indexes/
    └── stock_indexes.sql

Commands:
cd backend
npm run db:migrate
node scripts/verify-schema.js
```

**Checklist:**
- [ ] Tables created with correct column types
- [ ] Foreign key constraints added
- [ ] Indexes created for common queries
- [ ] Soft delete constraints in place
- [ ] Schema version incremented
- [ ] Migration rollback script created

---

#### Day 3-4: Stock Controller & Routes

**Files to Create:**
```
backend/src/modules/stock/
├── controllers/
│   ├── stock.controller.js      (15 endpoints)
│   ├── location.controller.js   (location CRUD)
│   └── batch.controller.js      (batch operations)
├── services/
│   ├── stock.service.js         (business logic)
│   ├── location.service.js
│   ├── batch.service.js
│   └── stock-query.service.js   (advanced search)
├── models/
│   └── Stock.js (ORM/query builder)
├── validations/
│   ├── stock.validation.js
│   └── location.validation.js
├── routes/
│   └── stock.routes.js
└── middleware/
    └── stock.auth.js (permission checks)
```

**API Endpoints to Implement:**
```
POST   /api/inventory/stock/entries           - Add stock
GET    /api/inventory/stock/entries           - List all
GET    /api/inventory/stock/entries/:id       - Get single
PUT    /api/inventory/stock/entries/:id       - Update
DELETE /api/inventory/stock/entries/:id       - Remove (soft)

GET    /api/inventory/stock/product/:id       - Get by product
GET    /api/inventory/stock/location/:id      - Get by location
GET    /api/inventory/stock/low              - Low stock alerts
GET    /api/inventory/stock/expiring         - Expiring soon

POST   /api/inventory/stock/transfer          - Transfer between locations
POST   /api/inventory/stock/adjust            - Adjust quantity

GET    /api/inventory/stock/logs              - Audit trail
GET    /api/inventory/stock/logs/:id          - Entry history
```

**Code Template - Stock Service:**
```javascript
// backend/src/modules/stock/services/stock.service.js

const db = require('../../../utils/database');

class StockService {
  async addStockEntry(data, userId) {
    const { product_id, quantity, location_id, batch_number, supplier_id, bill_id, expiry_date } = data;
    
    // Validations
    if (quantity <= 0) throw new Error('Invalid quantity');
    
    // Check product exists
    const product = await db.query('SELECT id FROM products WHERE id = $1', [product_id]);
    if (product.rows.length === 0) throw new Error('Product not found');
    
    // Check location exists
    const location = await db.query('SELECT id FROM locations WHERE id = $1', [location_id]);
    if (location.rows.length === 0) throw new Error('Location not found');
    
    // Check batch doesn't exist
    if (batch_number) {
      const existing = await db.query(
        'SELECT id FROM stock_entries WHERE batch_number = $1',
        [batch_number]
      );
      if (existing.rows.length > 0) throw new Error('Batch already exists');
    }
    
    // Start transaction
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      
      // Insert stock entry
      const result = await client.query(
        `INSERT INTO stock_entries 
         (product_id, location_id, quantity, batch_number, supplier_id, bill_id, expiry_date, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [product_id, location_id, quantity, batch_number, supplier_id, bill_id, expiry_date, userId]
      );
      const entry = result.rows[0];
      
      // Insert audit log
      await client.query(
        `INSERT INTO stock_logs 
         (entry_id, action, quantity_before, quantity_after, location_from, location_to, performed_by, reason)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [entry.id, 'ADD', 0, quantity, null, location_id, userId, 'Initial stock entry']
      );
      
      // Update product total qty
      await client.query(
        `UPDATE products SET total_quantity = total_quantity + $1 WHERE id = $2`,
        [quantity, product_id]
      );
      
      // Insert activity log
      await client.query(
        `INSERT INTO activity_logs (user_id, action_type, resource_type, resource_id, details)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, 'CREATE_STOCK', 'STOCK_ENTRY', entry.id, JSON.stringify({ batch_number, quantity })]
      );
      
      // Check low stock
      await this.checkLowStock(client, product_id);
      
      await client.query('COMMIT');
      return entry;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getProductStock(productId) {
    const result = await db.query(
      `SELECT se.*, p.name as product_name, l.room, l.cabinet, l.section
       FROM stock_entries se
       JOIN products p ON se.product_id = p.id
       JOIN locations l ON se.location_id = l.id
       WHERE se.product_id = $1 AND se.deleted_at IS NULL
       ORDER BY se.expiry_date ASC`,
      [productId]
    );
    return result.rows;
  }

  async getStockAuditTrail(entryId) {
    const result = await db.query(
      `SELECT sl.*, u.name as performed_by_name
       FROM stock_logs sl
       JOIN users u ON sl.performed_by = u.id
       WHERE sl.entry_id = $1
       ORDER BY sl.timestamp DESC`,
      [entryId]
    );
    return result.rows;
  }

  async checkLowStock(client, productId) {
    // Check if product is below threshold
    // If yes, create notification job
    const threshold = 10; // Can be made configurable
    const current = await client.query(
      'SELECT total_quantity FROM products WHERE id = $1',
      [productId]
    );
    if (current.rows[0].total_quantity < threshold) {
      await client.query(
        `INSERT INTO notification_jobs (type, product_id, status) 
         VALUES ('LOW_STOCK', $1, 'PENDING')`,
        [productId]
      );
    }
  }
}

module.exports = new StockService();
```

**Testing:**
```bash
npm run test:unit -- test/unit/stock.service.test.js

# Test cases
□ Add stock entry successfully
□ Prevent negative quantity
□ Prevent duplicate batch number
□ Verify audit log created
□ Verify location validation
□ Verify permission check
```

---

#### Day 5: Frontend - Add Stock Form

**Files to Create:**
```
frontend/src/components/Stock/
├── AddStockForm.jsx
├── StockList.jsx
├── StockDetail.jsx
├── LocationPicker.jsx
└── Stock.css
```

**Component Structure:**
```javascript
// frontend/src/components/Stock/AddStockForm.jsx

import React, { useState, useEffect } from 'react';
import API from '../../api';

function AddStockForm() {
  const [formData, setFormData] = useState({
    product_id: '',
    quantity: '',
    location_id: '',
    batch_number: '',
    supplier_id: '',
    expiry_date: '',
  });
  
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [productsRes, locationsRes] = await Promise.all([
          API.get('/api/inventory/parts'),
          API.get('/api/inventory/locations/tree')
        ]);
        setProducts(productsRes.data);
        setLocations(locationsRes.data);
      } catch (err) {
        setError(err.message);
      }
    };
    loadData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await API.post('/api/inventory/stock/entries', formData);
      alert('Stock added successfully!');
      // Clear form and refresh list
      setFormData({...formData, product_id: '', quantity: '', batch_number: '', location_id: ''});
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to add stock');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="stock-form-container">
      <h2>Add Stock Entry</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Product *</label>
          <select
            value={formData.product_id}
            onChange={(e) => setFormData({...formData, product_id: e.target.value})}
            required
          >
            <option value="">Select Product</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Quantity *</label>
          <input
            type="number"
            min="1"
            value={formData.quantity}
            onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value)})}
            required
          />
        </div>

        <div className="form-group">
          <label>Location *</label>
          <LocationPicker
            locations={locations}
            onSelect={(id) => setFormData({...formData, location_id: id})}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Batch Number</label>
            <input
              type="text"
              value={formData.batch_number}
              onChange={(e) => setFormData({...formData, batch_number: e.target.value})}
              placeholder="e.g., OL-2024-001"
            />
          </div>

          <div className="form-group">
            <label>Expiry Date</label>
            <input
              type="date"
              value={formData.expiry_date}
              onChange={(e) => setFormData({...formData, expiry_date: e.target.value})}
            />
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn btn-primary">
          {loading ? 'Adding...' : 'Add Stock'}
        </button>
      </form>
    </div>
  );
}

export default AddStockForm;
```

---

### Week 2: Frontend + Testing

#### Day 1-2: Stock List & Detail Pages

**Features:**
- [ ] List all stock entries with pagination
- [ ] Filter by product, location, status
- [ ] Search by batch number
- [ ] Show location hierarchy (Room > Cabinet > Section)
- [ ] Edit stock entry (location, quantity)
- [ ] View audit trail (see all changes)
- [ ] Export to Excel/CSV

**Code Example:**
```javascript
// frontend/src/pages/modules/Inventory/Stock.jsx
// Implement complete stock management page
// Use existing layout components
```

---

#### Day 3: Integration Tests

**Test Files:**
```
backend/test/integration/
├── stock.api.test.js        - API endpoint tests
├── stock.workflow.test.js   - Complete workflows
└── stock.audit.test.js      - Audit trail tests
```

**Test Template:**
```javascript
// backend/test/integration/stock.api.test.js

const test = require('node:test');
const assert = require('node:assert');
const API = require('../../src/index');

test('Stock API - Add stock entry', async (t) => {
  const response = await fetch('http://localhost:3000/api/inventory/stock/entries', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      product_id: 101,
      quantity: 50,
      location_id: 5,
      batch_number: 'TEST-001'
    })
  });
  
  assert.strictEqual(response.status, 201);
  const data = await response.json();
  assert.strictEqual(data.data.quantity, 50);
});

test('Stock API - Prevent negative quantity', async (t) => {
  const response = await fetch('http://localhost:3000/api/inventory/stock/entries', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      product_id: 101,
      quantity: -10
    })
  });
  
  assert.strictEqual(response.status, 400);
});
```

**Run Tests:**
```bash
npm run test:integration
# Expected: 6/6 passing
```

---

#### Day 4-5: Postman Collection & Documentation

**Create API Documentation:**
```
docs/phase-5/
├── stock-api-reference.md
├── postman-collection.json
├── database-schema-guide.md
└── validation-checklist.md
```

**Postman Collection Sections:**
- Authentication (login)
- Stock Management (15 endpoints)
- Location Management
- Stock Audit
- Batch Operations

---

### WEEK 1-2 COMPLETION CHECKLIST

**Backend:**
- [ ] Database schema for stock tables created
- [ ] 15 stock API endpoints implemented & tested
- [ ] Location hierarchy working (Room > Cabinet > Section)
- [ ] Audit trail logging for all operations
- [ ] Permission checks in place (warehouse role)
- [ ] Batch tracking functional
- [ ] All tests passing (6/6 green)
- [ ] No linting errors
- [ ] API documentation complete
- [ ] Database migration script created

**Frontend:**
- [ ] Add Stock form working
- [ ] Stock List page with filters
- [ ] Stock Detail page with audit trail
- [ ] Location picker component
- [ ] Edit functionality
- [ ] Export to CSV/Excel
- [ ] Error handling & validation messages
- [ ] Responsive design (mobile-friendly)

**Testing:**
- [ ] 6+ integration tests passing
- [ ] Manual testing completed
- [ ] Edge cases tested (negative qty, duplicate batch, invalid location)
- [ ] Permission tests passed
- [ ] API contract tests passing

**Documentation:**
- [ ] API reference created
- [ ] Postman collection shared
- [ ] Database schema documented
- [ ] Code comments added
- [ ] README updated

**Success Criteria:**
- ✅ Can add, view, edit stock entries
- ✅ All changes logged with user & timestamp
- ✅ Location hierarchy functional
- ✅ Batch tracking working
- ✅ No negative stock possible
- ✅ 95% test coverage for stock module

---

## WEEK 3-4: PHASE 6 - BILL-TO-STOCK INTEGRATION

### High-Level Overview

```
PURCHASE BILL FLOW:
Supplier sends bill → User creates bill (DRAFT) 
  → Confirm bill → Auto creates stock entries
  → Goods received → Update location & quantity
  → Payment due → Schedule reminder
  → Payment made → Mark as PAID

SALES BILL FLOW:
Customer request → Check available stock
  → Create bill (DRAFT) → Check if stock sufficient
  → Confirm bill → Auto decrease stock (FIFO)
  → Prepare goods → Update bill status
  → Ship goods → Send invoice
  → Customer pays → Mark as PAID
```

### Implementation Tasks

#### Week 3: Purchase Bill Enhancement
```
□ Modify bills table structure
□ Add bill_items linking to stock
□ Create purchase bill API endpoints
□ Auto-create stock on bill confirmation
□ Add bill-to-stock linking
□ Create payment tracking table
□ Write integration logic
□ Test purchase workflow

Files:
├── backend/src/modules/billing/
│   ├── services/stock-sync.service.js (bill → stock)
│   ├── services/purchase-bill.service.js
│   └── controllers/purchase-bill.controller.js
└── Tests: purchase-bill.workflow.test.js
```

#### Week 4: Sales Bill & Payment
```
□ Create sales bill API endpoints
□ Implement stock reservation (PENDING state)
□ Auto-decrease stock on confirmation (FIFO)
□ Add payment tracking & reminders
□ Create outstanding payment reports
□ Create return/credit note handling
□ Complete integration tests

Files:
├── backend/src/modules/billing/
│   ├── services/sales-bill.service.js
│   ├── services/payment.service.js
│   └── controllers/sales-bill.controller.js
└── Tests: sales-bill.workflow.test.js
```

### Phase 6 Deliverables

**API Endpoints:**
- POST /api/billing/purchase-bills
- GET /api/billing/purchase-bills
- POST /api/billing/purchase-bills/:id/confirm (→ creates stock)
- POST /api/billing/sales-bills
- POST /api/billing/sales-bills/:id/confirm (→ decreases stock)
- POST /api/billing/payments
- GET /api/billing/outstanding-payments

**Features:**
- ✅ Bills automatically adjust stock
- ✅ Stock reservation system
- ✅ Payment tracking
- ✅ Outstanding payment reports
- ✅ Stock allocation by FIFO
- ✅ Bill audit trail

---

## WEEK 5: PHASE 7 - NOTIFICATION ENGINE

### Setup External Services

```
□ Create Twilio account (SMS/WhatsApp)
□ Create SendGrid account (Email)
□ Get API keys and configure
□ Setup .env variables
□ Test each gateway

TWILIO_ACCOUNT_SID = xxx
TWILIO_AUTH_TOKEN = xxx
TWILIO_PHONE = +1XXXXXXXXXX
SENDGRID_API_KEY = xxx
```

### Implementation

**Backend Tasks:**
```
□ Create notification_jobs table
□ Create notification_templates table
□ Create notification_logs table
□ Implement NotificationService
  ├─ SMS gateway integration
  ├─ WhatsApp integration
  ├─ Email service
  └─ Retry logic
□ Create job scheduler (background jobs)
□ Implement APIs for notification management
□ Add notifications to bill workflow:
  ├─ Bill created → Send notification
  ├─ Payment due → Send reminder (SMS/Email)
  ├─ Stock low → Send alert
  └─ Payment received → Send confirmation

Files:
├── backend/src/modules/notifications/
│   ├── services/
│   │   ├── sms.service.js
│   │   ├── whatsapp.service.js
│   │   ├── email.service.js
│   │   ├── notification.service.js
│   │   └── job-scheduler.service.js
│   ├── templates/ (message templates)
│   └── controllers/notification.controller.js
└── Tests: notification.api.test.js
```

**Frontend Tasks:**
```
□ Create notification settings page
□ Allow enable/disable channels
□ Template management UI
□ Test send functionality
□ View notification logs
□ Analytics: delivery rates, success
```

### Phase 7 Deliverables

**APIs:**
- POST /api/notifications/reminders/schedule
- GET /api/notifications/templates
- PUT /api/notifications/templates/:id
- POST /api/notifications/test
- GET /api/notifications/logs
- POST /api/notifications/settings

**Features:**
- ✅ SMS reminders via Twilio
- ✅ WhatsApp messages
- ✅ Email notifications via SendGrid
- ✅ Auto-retry on failure (max 3 retries)
- ✅ Delivery tracking
- ✅ Template customization
- ✅ Integration with bills (payment reminders)

---

## WEEK 6-7: PHASE 8 - VOICE AI AGENT ENHANCEMENT

### Setup External Services

```
□ Create Exotel account (Voice IVR)
□ Setup inbound call webhook
□ Create Google Cloud Speech API credentials
□ Enable Speech-to-Text service
□ Enable Text-to-Speech service
□ Configure API keys in .env

EXOTEL_API_KEY = xxx
EXOTEL_ACCOUNT_SID = xxx
GOOGLE_APPLICATION_CREDENTIALS = path/to/key.json
```

### Implementation

#### Week 6: Voice Infrastructure

**Backend Tasks:**
```
□ Create voice webhook endpoint
□ Integrate Exotel IVR
□ Setup Google Speech-to-Text
□ Setup Google Text-to-Speech
□ Create NLP intent classifier
□ Create product search logic
□ Create conversation flows

Files:
├── backend/src/modules/voice/
│   ├── services/
│   │   ├── voice.service.js (call handling)
│   │   ├── stt.service.js (speech-to-text)
│   │   ├── tts.service.js (text-to-speech)
│   │   ├── nlp.service.js (intent classification)
│   │   ├── intent.service.js (intent resolver)
│   │   └── voice-query.service.js (inventory search)
│   ├── flows/ (conversation flows)
│   │   ├── greeting.flow.js
│   │   ├── product-query.flow.js
│   │   └── confirmation.flow.js
│   ├── controllers/voice.controller.js
│   └── routes/voice.routes.js
└── Tests: voice.api.test.js
```

**Voice Query Logic:**
```javascript
// Conversation Flow Example

USER CALL → "I need an oil filter"
           ↓
STT Convert → "i need an oil filter"
           ↓
NLP Classify → Intent: AVAILABILITY_CHECK
             Entity: Product = "oil filter"
           ↓
Search DB → SELECT * FROM stock_entries
          WHERE product matches "oil filter"
          AND quantity > 0
           ↓
Found: 50 units in Room A > Cabinet 5 > Section 3
           ↓
TTS Response → "Oil filter is available in Room A, Cabinet 5, Section 3"
             → "We have 50 units"
           ↓
Log → INSERT demand_logs
    (query, product_found, location, availability)
```

#### Week 7: Testing & Multi-language

**Backend Tasks:**
```
□ Implement NLP intent patterns
□ Add entity extraction
□ Create conversation fallback flows
□ Multi-language support (English, Hindi)
□ Testing with sample queries
□ Error handling & escalation to human

Supported Intents:
- AVAILABILITY_CHECK ("Do you have oil filter?")
- LOCATION_QUERY ("Where is the air filter?")
- QUANTITY_CHECK ("How many filters?")
- VEHICLE_COMPATIBLE ("Do you have filter for i10?")
```

**Test Queries:**
```
□ "I need an oil filter"
□ "Where is the air filter?"
□ "Do you have brake pads?"
□ "Oil filter for i10 car"
□ "How many oil filters do you have?"
□ "I don't understand" (escalate to human)
```

### Phase 8 Deliverables

**Apis:**
- POST /api/voice/webhook (handle incoming calls)
- POST /api/voice/process-query (process STT)
- GET /api/voice/call-logs
- GET /api/voice/call-analytics

**Features:**
- ✅ Incoming call handler
- ✅ Speech-to-text (90%+ accuracy)
- ✅ Intent classification (AVAILABILITY, LOCATION, etc)
- ✅ Product search from inventory
- ✅ Automated response generation
- ✅ Text-to-speech response
- ✅ Call logging & analytics
- ✅ Multi-language support (English/Hindi)

---

## WEEK 8: PHASE 9 - ANALYTICS & REPORTING

### Reports to Build

```
1. Stock Health Report
   - Current inventory value
   - Items below threshold
   - Expiring soon (< 90 days)
   - Slow-moving items (not sold in 30 days)
   - Dead stock (never sold)

2. Sales Report
   - Daily/Weekly/Monthly sales
   - Best-selling products
   - Customer-wise sales
   - Revenue trends
   - Sale by location

3. Supplier Report
   - Outstanding payments
   - Delivery performance
   - Cost analysis per supplier
   - Return percentage
   - Supplier ranking

4. Employee Activity Report
   - Operations logged per employee
   - Stock additions/removals
   - Bills created
   - Anomalies detected
   - Performance metrics

5. Voice Agent Report
   - Total calls received
   - Popular queries
   - Query success rate
   - Average resolution time
   - Misunderstood queries
   - Call duration trends
```

### Implementation

**Backend Tasks:**
```
□ Create analytics service
□ Implement report generators
  ├─ StockAnalytics.js
  ├─ SalesAnalytics.js
  ├─ VoiceAnalytics.js
  ├─ EmployeeAnalytics.js
  └─ SupplierAnalytics.js
□ Create APIs for each report
□ Add export to PDF/Excel
□ Create scheduled report emails
□ Dashboard KPIs

Files:
├── backend/src/modules/analytics/
│   ├── services/
│   │   ├── stock-analytics.js
│   │   ├── sales-analytics.js
│   │   ├── voice-analytics.js
│   │   ├── employee-analytics.js
│   │   ├── supplier-analytics.js
│   │   └── report.service.js
│   ├── controllers/analytics.controller.js
│   └── routes/analytics.routes.js
```

**Frontend Tasks:**
```
□ Create Analytics Dashboard
□ Implement report builder
□ Add date range filter
□ Add export functionality
□ Create chart visualizations
  ├─ Sales trend chart
  ├─ Top products chart
  ├─ Stock status donut
  └─ Call volume chart
□ Real-time KPI updates
```

### Phase 9 Deliverables

**APIs:**
- GET /api/analytics/stock-health
- GET /api/analytics/sales-report
- GET /api/analytics/voice-analytics
- GET /api/analytics/employee-activity
- GET /api/analytics/supplier-performance
- POST /api/analytics/export (PDF/Excel)

**Features:**
- ✅ 5+ comprehensive reports
- ✅ Real-time dashboard KPIs
- ✅ Export to PDF/Excel
- ✅ Date range filtering
- ✅ Trend analysis
- ✅ Scheduled email reports

---

## DAILY STANDUP FORMAT

**Time:** 10:00 AM (15 minutes)  
**Format:**
```
Each Dev:
1. What did I complete yesterday?
   - Example: "Completed stock CRUD API endpoints (5/15 done)"
   
2. What am I working on today?
   - Example: "Working on location picker component for frontend"
   
3. Any blockers?
   - Example: "Need API response format confirmation"
   
Lead Action Items:
□ Document blockers
□ Escalate if needed
□ Update timeline if off-track
```

---

## WEEKLY REVIEW CHECKPOINT

**Time:** Friday 4:00 PM (30 minutes)  
**Agenda:**
```
1. Demo completed features (5 min)
2. Review test coverage (5 min)
3. Check documentation status (5 min)
4. Identify risks/blockers (5 min)
5. Plan next week (5 min)

Success Metric:
□ All planned tasks completed?
□ Tests passing?
□ Code reviewed & merged?
□ Documentation updated?
□ On schedule or ahead?
```

---

## RISK MITIGATION PLAN

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Stock discrepancy after go-live | HIGH | Implement physical audit flow, barcode scanning |
| Bill-stock mismatch | HIGH | Transactional updates, automated reconciliation |
| Voice query failures | MEDIUM | Manual confirmation, escalation to human agent |
| API performance degradation | MEDIUM | Add caching, optimize queries, load testing |
| External service outages (Twilio/Google) | MEDIUM | Fallback mechanisms, queue system with retries |
| Team member unavailability | MEDIUM | Documentation, pair programming, knowledge sharing |

---

## DEFINITION OF DONE (EACH PHASE)

```
✅ Code written & reviewed
✅ Unit tests passing (95%+ coverage)
✅ Integration tests passing
✅ Manual testing completed
✅ Documentation updated
✅ Postman collection created
✅ No linting errors
✅ No console warnings/errors
✅ PR merged to dev branch
✅ Demo to stakeholders
```

---

## DEPLOYMENT CHECKLIST (POST PHASE 9)

```
Pre-Production Testing:
□ Full system integration test
□ Load testing (1000+ concurrent users)
□ Security audit
□ Database performance test
□ Voice agent stress test (100+ calls)
□ API rate limiting test
□ Notification delivery test (SMS/Email/WhatsApp)
□ Backup & recovery test
□ Rollback plan documented

Production Deployment:
□ Database migration on production
□ API deployment
□ Frontend deployment
□ Voice webhook configuration
□ Notification service activation
□ Monitoring & alerting setup
□ Runbook documentation
□ On-call rotation established
□ Incident response plan ready
```

---

## TIMELINE ADJUSTMENTS

If any phase falls behind:

**Buffer Strategy:**
- Prioritize high-impact features first
- Defer nice-to-have features to v2
- Increase team size if needed
- Reduce scope if deadline is fixed

**Example: Phase 5 runs 3 days behind:**
- Move some Phase 7 notifications to Phase 5.2
- Keep Phase 6 timeline (it's critical)
- Compress Phase 9 to "MVP reports only"

---

## SUCCESS METRICS (FINAL)

After all 8 weeks, the system should:

✅ **Functionality:**
- Add/remove stock with full audit trail
- Bills automatically update inventory
- Notifications sent via SMS/Email/WhatsApp
- Voice queries answered intelligently
- Complete analytics dashboard

✅ **Performance:**
- Stock queries < 500ms
- API endpoints < 200ms (95th percentile)
- Voice response < 3 seconds
- Notification delivery > 99%

✅ **Quality:**
- 95%+ test coverage
- Zero critical bugs
- All features documented
- Production-ready deployment

✅ **Team Capability:**
- Team can maintain system
- Documentation complete
- Process documented
- Knowledge transferred

---

**Next Step:** Print this document and schedule kickoff meeting for Week 1!

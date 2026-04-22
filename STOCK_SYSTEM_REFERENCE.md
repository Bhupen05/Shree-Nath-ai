# SIBMS Phase 5-9: Stock System - Developer Reference Guide
## Quick Lookup for Stock Management, Billing & Voice Agent

**Version:** 1.0 | **For:** Development Team | **Updated:** April 18, 2026

---

## 📋 PHASE OVERVIEW & TIMELINE

```
Phase 5 (Week 1-2) → Stock Management Foundation
  ├─ Database schema (stock_entries, stock_logs)
  ├─ 15 stock API endpoints
  ├─ Location hierarchy (Room > Cabinet > Section)
  └─ Audit trailing for all operations

Phase 6 (Week 3-4) → Bill-to-Stock Integration  
  ├─ Purchase bills auto-create stock
  ├─ Sales bills auto-decrease stock (FIFO)
  ├─ Stock reservation system
  └─ Payment tracking

Phase 7 (Week 5) → Notifications Engine
  ├─ SMS via Twilio
  ├─ WhatsApp integration
  ├─ Email via SendGrid
  └─ Retry logic & delivery tracking

Phase 8 (Week 6-7) → Voice AI Agent
  ├─ Speech-to-text (Google API)
  ├─ NLP intent classification
  ├─ Inventory search logic
  └─ Text-to-speech responses

Phase 9 (Week 8) → Analytics & Reports
  ├─ Stock health reports
  ├─ Sales analytics
  ├─ Voice agent stats
  ├─ Employee activity logs
  └─ Dashboard KPIs
```

---

## 🗄️ ESSENTIAL DATABASE TABLES

### Phase 5: Stock Tables

```sql
stock_entries
├─ id, product_id, location_id, quantity
├─ batch_number, supplier_id, bill_id
├─ expiry_date, created_by, created_at
└─ Stores: Multiple batches per product in different locations

stock_logs (immutable)
├─ id, entry_id, action (ADD/REMOVE/TRANSFER/ADJUST)
├─ quantity_before, quantity_after
├─ location_from, location_to, bill_id, performed_by
└─ Purpose: Complete audit trail (INSERT-ONLY)
```

### Phase 6: Billing Enhancement

```sql
bills (already exists, enhance)
├─ Add columns: payment_due_date, amount_paid, outstanding_amount

bill_items (already exists, enhance)
├─ Add column: stock_entry_id (link to stock batch removed)

payments (new)
├─ id, bill_id, amount_paid, payment_method, payment_date
└─ Purpose: Track each payment against bill
```

### Phase 7: Notification Tables

```sql
notification_jobs
├─ id, bill_id, party_id, reminder_type
├─ scheduled_date, status (PENDING/SENT/FAILED)
└─ Purpose: Queue notifications for scheduled sending

notification_templates
├─ id, name, channel (SMS/WHATSAPP/EMAIL)
├─ subject, body, variables ({{customer_name}}, {{amount}})
└─ Purpose: Reusable message templates

notification_logs
├─ id, job_id, sent_to, actual_body, status
├─ error_message, provider_response, sent_at
└─ Purpose: Track delivery success/failure
```

### Phase 8: Voice Tables

```sql
voice_call_logs
├─ id, call_id, phone_number, call_duration
├─ transcript, total_queries, successful_queries
└─ Purpose: Track incoming calls

demand_logs
├─ id, call_id, query_text, query_intent
├─ product_found_id, availability, location_found
└─ Purpose: History of all voice queries
```

---

## 🔌 30 NEW API ENDPOINTS

### Stock APIs (15 endpoints)
```
POST   /api/inventory/stock/entries              ADD
GET    /api/inventory/stock/entries              LIST ALL
GET    /api/inventory/stock/entries/:id          GET ONE
PUT    /api/inventory/stock/entries/:id          UPDATE
DELETE /api/inventory/stock/entries/:id          REMOVE

GET    /api/inventory/stock/product/:id          BY PRODUCT
GET    /api/inventory/stock/location/:id         BY LOCATION
GET    /api/inventory/stock/low                  LOW STOCK
GET    /api/inventory/stock/expiring             EXPIRING SOON

POST   /api/inventory/stock/transfer             TRANSFER LOCATION
POST   /api/inventory/stock/adjust               ADJUST QTY

GET    /api/inventory/stock/logs                 AUDIT ALL
GET    /api/inventory/stock/logs/:id             AUDIT ONE
POST   /api/inventory/locations                  ADD LOCATION
GET    /api/inventory/locations/tree             LOCATION TREE
```

### Billing APIs (8 endpoints)
```
POST   /api/billing/purchase-bills               CREATE
POST   /api/billing/purchase-bills/:id/confirm   CONFIRM (→ auto stock)
POST   /api/billing/sales-bills                  CREATE
POST   /api/billing/sales-bills/:id/confirm      CONFIRM (→ auto stock)
POST   /api/billing/payments                     RECORD PAYMENT
GET    /api/billing/outstanding-payments         UNPAID BILLS
GET    /api/billing/bills/:id                    DETAILS
PUT    /api/billing/bills/:id                    UPDATE
```

### Notification APIs (5 endpoints)
```
POST   /api/notifications/reminders/schedule     SCHEDULE REMINDER
GET    /api/notifications/templates              GET TEMPLATES
PUT    /api/notifications/templates/:id          UPDATE TEMPLATE
POST   /api/notifications/test                   SEND TEST
GET    /api/notifications/logs                   DELIVERY LOGS
```

### Voice APIs (4 endpoints)
```
POST   /api/voice/webhook                        INCOMING CALL
POST   /api/voice/process-query                  PROCESS STT
GET    /api/voice/call-logs                      CALL HISTORY
GET    /api/voice/call-analytics                 USAGE STATS
```

### Analytics APIs (6 endpoints)
```
GET    /api/analytics/stock-health               STOCK REPORT
GET    /api/analytics/sales-report               SALES TRENDS
GET    /api/analytics/voice-analytics            CALL STATS
GET    /api/analytics/employee-activity          USER ACTIONS
GET    /api/analytics/supplier-performance       SUPPLIER RANKING
POST   /api/analytics/export                     EXPORT PDF/EXCEL
```

---

## 💡 KEY WORKFLOWS

### Stock Addition (Phase 5)
```
User fills form:
  ├─ Select Product
  ├─ Enter Quantity (must be > 0)
  ├─ Select Location (Room → Cabinet → Section)
  ├─ Enter Batch #
  ├─ Enter Supplier
  └─ Enter Expiry Date

POST /api/inventory/stock/entries
  └─ Backend validates:
     ├─ Product exists ✓
     ├─ Location exists ✓
     ├─ Quantity > 0 ✓
     ├─ Batch unique ✓
     ├─ User has WAREHOUSE role ✓
     └─ Database transaction:
        ├─ INSERT stock_entries
        ├─ INSERT stock_logs (audit)
        ├─ UPDATE product (total_qty)
        ├─ INSERT activity_logs
        ├─ CHECK low_stock (trigger notification)
        └─ COMMIT
```

### Purchase Bill → Stock (Phase 6)
```
1. User creates PURCHASE BILL (DRAFT status)
   ├─ Supplier: ABC Auto
   ├─ Items: Oil Filter (qty: 50)
   └─ Total: ₹7500

2. User clicks CONFIRM BILL
   └─ Backend creates stock entries:
      ├─ INSERT stock_entries (qty: 50, location: receiving dock)
      ├─ INSERT stock_logs (action: ADD_FROM_BILL)
      ├─ UPDATE bills (status: CONFIRMED)
      ├─ INSERT activity_logs
      └─ SCHEDULE payment reminder for due date

3. Stock is now available for sale
```

### Sales Bill → Stock Decrease (Phase 6)
```
1. User creates SALES BILL (DRAFT status)
   ├─ Customer: Ram Sharma
   ├─ Items: Oil Filter (qty: 5)
   └─ Total: ₹1000

2. System checks available stock:
   ├─ Query: SELECT SUM(qty) FROM stock WHERE product_id=101
   ├─ Result: 50 available ✓
   └─ Proceed

3. User clicks CONFIRM BILL
   └─ Backend removes stock (FIFO - oldest first):
      ├─ Batch OL-2024-001: Has 50 qty
      ├─ Remove 5 from OL-2024-001 (45 left)
      ├─ INSERT stock_logs (action: REMOVE_FROM_BILL)
      ├─ UPDATE product (total_qty -= 5)
      ├─ UPDATE bills (status: CONFIRMED)
      └─ SCHEDULE payment reminder

4. Remaining stock: 45 units
```

### Payment Reminder Notification (Phase 7)
```
1. Bill created with due_date = "2026-05-18"
   └─ INSERT notification_job (type: PAYMENT_DUE, status: PENDING)

2. Job scheduler runs daily (or on-demand)
   ├─ SELECT notification_jobs WHERE scheduled_date ≤ NOW()
   ├─ For each job:
   │  ├─ Get SMS template: "Dear {{customer}}, payment of ₹{{amount}} is due..."
   │  ├─ Replace variables: "Dear Ram Sharma, payment of ₹1000 is due..."
   │  └─ Send via Twilio SMS
   └─ INSERT notification_logs (status: SENT, sent_to: +919999000000)

3. Delivery tracking:
   ├─ If sent successfully: status = DELIVERED ✓
   ├─ If failed: retry_count++ (max 3 times)
   └─ If all retries fail: status = FAILED ✗
```

### Voice Query Processing (Phase 8)
```
1. Customer calls: +91-XXXXX-XXXXX

2. Call received by Exotel IVR
   └─ POST /api/voice/webhook
      ├─ call_id: "c123456"
      ├─ from: "+919999000000"
      └─ status: "in-progress"

3. IVR plays: "Welcome! What product do you need?"

4. Customer says: "I need an oil filter"

5. Google Speech-to-Text API converts to text
   └─ "i need an oil filter" (confidence: 0.92)

6. NLP Intent Classification
   ├─ Intent: AVAILABILITY_CHECK
   ├─ Entity: Product = "oil filter"
   └─ Confidence: 0.95

7. Inventory Search
   ├─ SELECT stock_entries WHERE product LIKE '%oil filter%'
   ├─ Filter: quantity > 0, NOT expired
   ├─ Result: 50 units in Room A > Cabinet 5 > Section 3
   └─ Format location: "Room A, Cabinet 5, Section 3"

8. Generate Response Text
   └─ "Oil filter is available in Room A, Cabinet 5, Section 3"

9. Google Text-to-Speech converts to audio
   └─ Audio stream back to caller

10. Insert demand_logs (for analytics)
    ├─ query_text: "i need an oil filter"
    ├─ product_found: "Oil Filter" (id: 101)
    ├─ availability: "IN_STOCK"
    ├─ location: "Room A > Cabinet 5 > Section 3"
    ├─ quantity: 50
    └─ timestamp: now
```

---

## 🔐 ROLE-BASED ACCESS

```
ADMIN
  ├─ Create/edit/delete stock ✓
  ├─ Approve bill payments ✓
  ├─ Configure notifications ✓
  └─ View all reports ✓

MANAGER
  ├─ Create stock entries ✓
  ├─ Create bills ✓
  ├─ View financial reports ✓
  └─ Approve payments > ₹5000 ✓

WAREHOUSE
  ├─ Add stock ✓
  ├─ Remove stock (with bill ref) ✓
  ├─ Transfer stock ✓
  └─ View stock levels ✓

BILLING
  ├─ Create bills ✓
  ├─ Process payments ✓
  └─ View financial reports ✓

VIEWER
  └─ View-only access ✓
```

---

## 📊 DATABASE INDEXES (Performance)

```sql
-- Stock Queries (High Volume)
CREATE INDEX idx_stock_entries_product ON stock_entries(product_id);
CREATE INDEX idx_stock_entries_location ON stock_entries(location_id);
CREATE INDEX idx_stock_entries_batch ON stock_entries(batch_number);
CREATE INDEX idx_stock_entries_expiry ON stock_entries(expiry_date);

-- Audit Queries (High Volume)
CREATE INDEX idx_stock_logs_entry ON stock_logs(entry_id);
CREATE INDEX idx_stock_logs_timestamp ON stock_logs(timestamp DESC);

-- Bill Queries
CREATE INDEX idx_bills_status ON bills(status);
CREATE INDEX idx_bills_due_date ON bills(payment_due_date);

-- Notification Queries
CREATE INDEX idx_notification_jobs_scheduled ON notification_jobs(scheduled_date);
CREATE INDEX idx_notification_jobs_status ON notification_jobs(status);

-- Voice Queries
CREATE INDEX idx_demand_logs_call ON demand_logs(call_id);
CREATE INDEX idx_demand_logs_timestamp ON demand_logs(timestamp DESC);
```

---

## 🚀 QUICK START COMMANDS

```bash
# Backend
cd backend
npm install
npm run db:migrate              # Apply schema
npm run db:seed (optional)      # Test data
npm run dev                     # Start server

# Frontend
cd frontend
npm install
npm run dev                     # Start Vite

# Testing
npm run test:unit              # Unit tests
npm run test:integration       # Integration tests
npm run lint                   # Check code quality

# Database
npm run db:status              # Check migrations
npm run db:rollback            # Undo last migration
psql -U user -d sibms          # Direct SQL access
```

---

## 🧪 UNIT TEST TEMPLATE

```javascript
// backend/test/unit/stock.service.test.js

const test = require('node:test');
const assert = require('node:assert');
const StockService = require('../../src/modules/stock/services/stock.service');

test('StockService.addStockEntry', async (t) => {
  const result = await StockService.addStockEntry({
    product_id: 101,
    quantity: 50,
    location_id: 5,
    batch_number: 'TEST-001'
  }, userId);

  assert.strictEqual(result.quantity, 50);
  assert.ok(result.id > 0);
});

test('StockService.preventNegativeQuantity', async (t) => {
  assert.throws(() => {
    StockService.addStockEntry({quantity: -10}, userId);
  });
});
```

---

## 🐛 TROUBLESHOOTING

| Problem | Cause | Solution |
|---------|-------|----------|
| "Product not found" | Invalid product_id | `GET /api/inventory/parts` to list |
| "Location not found" | Invalid location_id | `GET /api/inventory/locations/tree` |
| "Batch already exists" | Duplicate batch_number | Use unique IDs: BATCH-YYYY-NNN |
| "Insufficient stock" | Selling more than available | Check: `GET /api/inventory/stock/product/:id` |
| "Cannot modify bill" | Bill status is CONFIRMED | Create new bill or use credit note |
| "SMS not sent" | Twilio API issue | Check API key, phone number format |
| "Voice query failed" | Audio quality/clarity | Add "Can you repeat?" fallback |
| "API timeout" | Slow query | Add indexes (see PERFORMANCE section) |

---

## 📞 SUPPORT CHANNELS

**Questions?**
- Check: `PROJECT_MANAGEMENT_PLAN.md` (overview)
- Check: `SYSTEM_DESIGN_ARCHITECTURE.md` (technical)
- Check: `IMPLEMENTATION_ROADMAP.md` (timeline)
- Ask Team Lead: [Contact]

**Daily Standup:** 10:00 AM  
**Weekly Review:** Friday 4:00 PM

---

**Keep this page bookmarked for quick reference during development!**  
Last updated: April 18, 2026

# SIBMS - System Design & Technical Architecture
## Complete System Design Specification

**Document Type:** Technical Architecture  
**Version:** 1.0  
**Date:** April 18, 2026  
**For:** Development Team

---

## TABLE OF CONTENTS
1. [System Overview](#system-overview)
2. [Core Architecture](#core-architecture)
3. [Data Flow Diagrams](#data-flow-diagrams)
4. [Database Design](#database-design)
5. [API Design](#api-design)
6. [Module Specifications](#module-specifications)
7. [Integration Points](#integration-points)
8. [Security Design](#security-design)

---

## SYSTEM OVERVIEW

### System Diagram
```
┌─────────────────────────────────────────────────────────────┐
│                    SIBMS Architecture                        │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                   CLIENT LAYER                               │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────┐  │
│  │  Web Dashboard   │  │  Mobile App      │  │ Voice IVR │  │
│  │  (React/Vite)    │  │  (React Native)  │  │ (Phone)   │  │
│  └──────────────────┘  └──────────────────┘  └───────────┘  │
│         UI/UX              Mobile UI          Voice I/O      │
│                                                               │
└──────────────────────────────────────────────────────────────┘
                            ↓↑
┌──────────────────────────────────────────────────────────────┐
│               API GATEWAY & AUTH LAYER                       │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  JWT Authentication + Role-Based Access Control         │ │
│  │  Request Validation | Rate Limiting | CORS              │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
└──────────────────────────────────────────────────────────────┘
                            ↓↑
┌──────────────────────────────────────────────────────────────┐
│               EXPRESS BACKEND SERVICES                       │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────┐   │
│  │ Stock Module   │  │ Billing Module │  │ Employees    │   │
│  │ - Add/Remove   │  │ - Bills CRUD   │  │ - CRUD       │   │
│  │ - Batches      │  │ - Payments     │  │ - Roles      │   │
│  │ - Locations    │  │ - Reports      │  │ - Audit      │   │
│  └────────────────┘  └────────────────┘  └──────────────┘   │
│                                                               │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────┐   │
│  │ Voice Module   │  │Notification    │  │ Analytics    │   │
│  │ - Call Handler │  │ Module         │  │ - Reports    │   │
│  │ - STT/TTS      │  │ - SMS/WhatsApp │  │ - Dashboard  │   │
│  │ - NLP Query    │  │ - Email        │  │ - Export     │   │
│  └────────────────┘  └────────────────┘  └──────────────┘   │
│                                                               │
└──────────────────────────────────────────────────────────────┘
                            ↓↑
┌──────────────────────────────────────────────────────────────┐
│            BUSINESS LOGIC LAYER                              │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ Validation Logic                                     │    │
│  │ - Stock constraints (no negative)                    │    │
│  │ - Bill validation (not overdraft)                    │    │
│  │ - Location validation (exists, capacity)            │    │
│  │ - User permission checks                            │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ Integration Logic                                    │    │
│  │ - Bill → Stock sync                                 │    │
│  │ - Stock reservation/release                         │    │
│  │ - Notification triggers                             │    │
│  │ - Activity logging                                  │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                               │
└──────────────────────────────────────────────────────────────┘
                            ↓↑
┌──────────────────────────────────────────────────────────────┐
│            DATA ACCESS LAYER (ORM/Queries)                   │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │ pg (Node)    │  │ Query Builder │  │ Transactions │        │
│  │ Connection   │  │              │  │              │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
│                                                               │
└──────────────────────────────────────────────────────────────┘
                            ↓↑
┌──────────────────────────────────────────────────────────────┐
│            POSTGRESQL DATABASE                               │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Core Tables    │  Stock Tables      │  Audit Tables         │
│  - users        │  - stock_entries   │  - stock_logs         │
│  - roles        │  - locations       │  - activity_logs      │
│  - employees    │  - products        │  - notification_logs  │
│  - customers    │  - batches         │  - demand_logs        │
│  - suppliers    │  - product_vehicle │  - voice_call_logs    │
│  - bills        │                    │                       │
│  - bill_items   │  Business Tables   │                       │
│  - payments     │  - notification_   │                       │
│                 │    jobs            │                       │
│                 │  - notification_   │                       │
│                 │    templates       │                       │
│                 │                    │                       │
└──────────────────────────────────────────────────────────────┘
                            ↓↑
┌──────────────────────────────────────────────────────────────┐
│            EXTERNAL INTEGRATIONS                             │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐          │
│  │ SMS Gateway │  │ WhatsApp    │  │ Email        │          │
│  │ (Twilio)    │  │ (Twilio)    │  │ (SendGrid)   │          │
│  └─────────────┘  └─────────────┘  └──────────────┘          │
│                                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐          │
│  │ Voice IVR   │  │ Speech-Text │  │ Text-Speech  │          │
│  │ (Exotel)    │  │ (Google API)│  │ (Google API) │          │
│  └─────────────┘  └─────────────┘  └──────────────┘          │
│                                                               │
└──────────────────────────────────────────────────────────────┘

```

---

## CORE ARCHITECTURE

### 1. Module Decomposition

```
SIBMS Backend Services
│
├── Stock Management Module (stocks/)
│   ├── controllers/
│   │   ├── stock.controller.js      - HTTP handlers
│   │   ├── location.controller.js   - Location CRUD
│   │   └── batch.controller.js      - Batch operations
│   │
│   ├── services/
│   │   ├── stock.service.js         - Stock logic
│   │   ├── location.service.js      - Location tree
│   │   ├── batch.service.js         - Batch management
│   │   └── stock-query.service.js   - Advanced queries
│   │
│   ├── models/
│   │   ├── Stock.js
│   │   ├── Location.js
│   │   └── Batch.js
│   │
│   └── validations/
│       └── stock.validation.js      - Input validation
│
├── Billing Module (billing/)
│   ├── controllers/
│   │   ├── bill.controller.js
│   │   ├── payment.controller.js
│   │   └── invoice.controller.js
│   │
│   ├── services/
│   │   ├── bill.service.js
│   │   ├── payment.service.js
│   │   ├── stock-sync.service.js    - Bill→Stock sync
│   │   └── invoice.service.js
│   │
│   └── validations/
│       └── bill.validation.js
│
├── Notification Module (notifications/)
│   ├── controllers/
│   │   └── notification.controller.js
│   │
│   ├── services/
│   │   ├── notification.service.js
│   │   ├── sms.service.js           - SMS gateway
│   │   ├── whatsapp.service.js      - WhatsApp
│   │   ├── email.service.js         - Email service
│   │   └── job-scheduler.service.js - Background jobs
│   │
│   └── templates/
│       ├── payment-reminder.txt
│       ├── low-stock-alert.txt
│       └── order-confirmation.txt
│
├── Voice Agent Module (voice/)
│   ├── controllers/
│   │   ├── voice.controller.js      - Webhook handler
│   │   └── call.controller.js       - Call operations
│   │
│   ├── services/
│   │   ├── voice.service.js         - Call logic
│   │   ├── stt.service.js           - Speech-to-text
│   │   ├── tts.service.js           - Text-to-speech
│   │   ├── nlp.service.js           - NLP processing
│   │   ├── intent.service.js        - Intent classification
│   │   └── voice-query.service.js   - Inventory search
│   │
│   └── flows/
│       ├── greeting.flow.js
│       ├── product-query.flow.js
│       ├── location-query.flow.js
│       └── confirmation.flow.js
│
├── Employee Module (employees/)
│   ├── controllers/
│   │   └── employee.controller.js
│   │
│   ├── services/
│   │   ├── employee.service.js
│   │   └── role.service.js
│   │
│   └── validations/
│       └── employee.validation.js
│
├── Analytics Module (analytics/)
│   ├── controllers/
│   │   └── analytics.controller.js
│   │
│   ├── services/
│   │   ├── stock-analytics.js
│   │   ├── sales-analytics.js
│   │   ├── voice-analytics.js
│   │   └── report.service.js
│   │
│   └── reports/
│       ├── stock-health-report.js
│       ├── sales-report.js
│       ├── voice-usage-report.js
│       └── employee-activity-report.js
│
├── Common Layer (common/)
│   ├── middleware/
│   │   ├── auth.middleware.js       - JWT verification
│   │   ├── rbac.middleware.js       - Role validation
│   │   ├── error.middleware.js      - Error handling
│   │   └── logger.middleware.js     - Request logging
│   │
│   ├── utils/
│   │   ├── database.js              - DB connection
│   │   ├── constants.js             - App constants
│   │   └── helpers.js               - Helper functions
│   │
│   └── errors/
│       ├── AppError.js
│       ├── ValidationError.js
│       └── PermissionError.js
│
└── Routes (routes/)
    ├── stock.routes.js
    ├── billing.routes.js
    ├── employees.routes.js
    ├── voice.routes.js
    ├── notifications.routes.js
    └── analytics.routes.js
```

### 2. Layered Architecture Pattern

```
┌─────────────────────────────────────────┐
│   Presentation Layer (Express Routes)   │
│   (/api/inventory/stock, /api/billing)  │
└─────────────────┬───────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│   Business Logic Layer (Services)       │
│   (StockService, BillingService, etc)   │
└─────────────────┬───────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│   Data Access Layer (Repository Pattern)│
│   (SQL Queries, Transactions)           │
└─────────────────┬───────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│   Database Layer (PostgreSQL)           │
│   (Tables, Indexes, Constraints)        │
└─────────────────────────────────────────┘
```

---

## DATA FLOW DIAGRAMS

### Flow 1: Add Stock Entry

```
┌──────────────┐
│ Warehouse    │
│ Staff        │
└──────┬───────┘
       │ 1. User opens "Add Stock" form
       ↓
┌──────────────────────────────────────┐
│ Frontend - Add Stock Form            │
│ - Product selector                   │
│ - Quantity input                     │
│ - Location picker (Room→Cabinet)     │
│ - Batch number                       │
│ - Supplier reference                 │
│ - Expiry date                        │
└──────┬───────────────────────────────┘
       │ 2. Submit form with validation
       ↓
┌──────────────────────────────────────┐
│ POST /api/inventory/stock/entries    │
│ {                                    │
│   product_id: 101,                   │
│   quantity: 50,                      │
│   location_id: 5,                    │
│   batch_number: "OL-2024-001",       │
│   supplier_id: 3,                    │
│   expiry_date: "2026-12-31"          │
│ }                                    │
└──────┬───────────────────────────────┘
       │ 3. API validation
       ↓
┌──────────────────────────────────────┐
│ StockController                      │
│ - Check auth/permissions             │
│ - Parse request body                 │
└──────┬───────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────┐
│ StockService.addStockEntry()         │
│ - Validate product exists            │
│ - Validate location exists           │
│ - Check user has permission          │
│ - Check quantity > 0                 │
│ - Check expiry_date > today          │
└──────┬───────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────┐
│ Database Transaction Start           │
│ BEGIN TRANSACTION;                   │
└──────┬───────────────────────────────┘
       │
       ├─→ INSERT stock_entries
       │   UPDATE product (total_qty)
       │   INSERT stock_logs (audit)
       │   INSERT activity_logs (user action)
       │   CHECK low_stock threshold
       │   IF low_stock → Queue notification
       │
       ↓
┌──────────────────────────────────────┐
│ COMMIT TRANSACTION                   │
└──────┬───────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────┐
│ Response: 201 Created                │
│ {                                    │
│   id: 1234,                          │
│   product_id: 101,                   │
│   quantity: 50,                      │
│   location: "Room A > Cabinet 5",     │
│   batch: "OL-2024-001",              │
│   created_at: "2026-04-18T10:30:00Z" │
│ }                                    │
└──────┬───────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────┐
│ Frontend - Show Success Message      │
│ "Stock added: 50 units, Room A"      │
└──────────────────────────────────────┘
```

### Flow 2: Bill-Driven Stock Update

```
Purchase Bill Flow:
┌─────────────────────┐
│ Supplier sends bill  │
│ (PDF/Document)      │
└──────┬──────────────┘
       │
       ↓
┌──────────────────────────────────────┐
│ User creates Purchase Bill (DRAFT)   │
│ POST /api/billing/purchase-bills     │
│ {                                    │
│   supplier_id: 5,                    │
│   bill_date: "2026-04-18",           │
│   items: [                           │
│     {product_id: 101, qty: 50, ...}  │
│   ]                                  │
│ }                                    │
└──────┬───────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────┐
│ Bill created with status DRAFT       │
│ bill_id = 999                        │
│ No stock impact yet                  │
└──────┬───────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────┐
│ Goods received                       │
│ User confirms receipt:               │
│ POST /api/billing/bills/999/confirm  │
└──────┬───────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────┐
│ BillService.confirmPurchaseBill()    │
│ - Validate bill state = DRAFT        │
│ - Check user permission              │
└──────┬───────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────┐
│ Database Transaction Start           │
└──────┬───────────────────────────────┘
       │
       ├─→ UPDATE bills SET status=CONFIRMED
       │   FOR EACH bill_item:
       │     ├─ INSERT stock_entries (new batch)
       │     │  location: from bill.receiving_location
       │     │  qty: bill_item.quantity
       │     │  supplier_id: bill.supplier_id
       │     │  bill_id: 999
       │     │
       │     ├─ INSERT stock_logs (ADD action)
       │     │  entry_id: newly created
       │     │  action: "ADD_FROM_PURCHASE_BILL"
       │     │  bill_id: 999
       │     │
       │     └─ UPDATE product SET total_qty += qty
       │
       │   INSERT activity_logs
       │   Check low_stock
       │   Schedule payment_reminder
       │
       ↓
┌──────────────────────────────────────┐
│ COMMIT TRANSACTION                   │
└──────┬───────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────┐
│ Response & Notifications             │
│ - Email to supplier (bill confirmed) │
│ - Payment reminder scheduled         │
│ - Low stock alert if applicable      │
└──────────────────────────────────────┘

Sales Bill Flow:
┌──────────────────────┐
│ Customer needs items │
└──────┬───────────────┘
       │
       ↓
┌──────────────────────────────────────┐
│ User creates Sales Bill (DRAFT)      │
│ POST /api/billing/sales-bills        │
│ {                                    │
│   customer_id: 10,                   │
│   items: [                           │
│     {product_id: 101, qty: 5, ...}   │
│   ]                                  │
│ }                                    │
└──────┬───────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────┐
│ BillService.validateAvailability()   │
│ - Check: total_qty >= requested_qty  │
│ - Check: if insufficient → ERROR     │
└──────┬───────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────┐
│ Bill created, status=DRAFT           │
│ Stock NOT yet reduced                │
└──────┬───────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────┐
│ User confirms bill:                  │
│ POST /api/billing/sales-bills/888/confirm
└──────┬───────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────┐
│ Database Transaction Start           │
└──────┬───────────────────────────────┘
       │
       ├─→ UPDATE bills SET status=CONFIRMED
       │   
       │   FOR EACH bill_item:
       │     ├─ SELECT stock entries (FIFO order)
       │     │  WHERE product_id = item.product_id
       │     │  ORDER BY expiry_date ASC
       │     │
       │     ├─ FOR EACH selected batch:
       │     │  ├─ qty_to_remove = MIN(batch.qty, item.remaining_qty)
       │     │  ├─ UPDATE stock_entries SET qty -= qty_to_remove
       │     │  │  WHERE id = batch.id
       │     │  │
       │     │  ├─ INSERT stock_logs
       │     │  │  action: "REMOVE_FROM_SALES_BILL"
       │     │  │  bill_id: 888
       │     │  │
       │     │  └─ item.remaining_qty -= qty_to_remove
       │     │     IF item.remaining_qty = 0: BREAK
       │     │
       │     └─ UPDATE product SET total_qty -= item.quantity
       │
       │   INSERT activity_logs
       │   Schedule payment_reminder
       │
       ↓
┌──────────────────────────────────────┐
│ COMMIT TRANSACTION                   │
└──────┬───────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────┐
│ Response & Notifications             │
│ - Email to customer (invoice)        │
│ - Low stock alert if threshold hit   │
│ - Update dashboard KPIs              │
└──────────────────────────────────────┘
```

### Flow 3: Voice Agent Query Processing

```
Incoming Phone Call
│
├─ Phone Gateway receives call
│  (Exotel/Twilio)
│
├─ Call forwarded to webhook:
│  POST /api/voice/webhook
│  {
│    call_id: "c123456",
│    phone_number: "+91-99999-00000",
│    timestamp: "2026-04-18T10:30:00Z"
│  }
│
├─ VoiceController.handleIncomingCall()
│  ├─ Create call record in DB
│  ├─ Generate TTS greeting
│  └─ Play IVR prompt
│      "Welcome to stock management"
│      "Say what product you need"
│
├─ Customer speaks:
│  "I need an oil filter"
│
├─ Speech-to-Text Conversion
│  └─ Google Cloud Speech API
│      Input: Audio bytes
│      Output: "i need an oil filter"
│
├─ NLP Intent Classification
│  VoiceService.classifyIntent()
│  ├─ Extract entities:
│  │  ├─ Product: "oil filter"
│  │  ├─ Intent: "AVAILABILITY_CHECK"
│  │  └─ Confidence: 0.95
│  │
│  └─ Extract keywords:
│     (color, brand, vehicle model if mentioned)
│
├─ Inventory Search
│  VoiceQueryService.searchProduct()
│  ├─ SELECT * FROM products
│  │  WHERE name LIKE '%oil filter%'
│  │  OR SKU LIKE '%filter%'
│  │
│  ├─ SELECT se.*, l.* FROM stock_entries se
│  │  WHERE product_id IN (results)
│  │  AND quantity > 0
│  │  ORDER BY expiry_date ASC
│  │
│  └─ Found: "Bosch Oil Filter"
│     Location: Room A > Cabinet 5 > Section 3
│     Quantity: 50
│
├─ Generate Response Text
│  ResponseGenerator.create()
│  ├─ "Oil filter is available"
│  ├─ "Located in Room A, Cabinet 5, Section 3"
│  └─ "Quantity: 50 units"
│
├─ Text-to-Speech Conversion
│  Google Cloud TTS API
│  ├─ Input: Response text
│  └─ Output: Audio stream
│
├─ Play Response to Caller
│  Phone Gateway (Exotel)
│  ├─ Audio: "Oil filter is available..."
│  └─ IVR: "Say another product or press 1 to end"
│
├─ Log Conversation
│  INSERT demand_logs
│  ├─ query_text: "i need an oil filter"
│  ├─ product_found: "Bosch Oil Filter" (id: 101)
│  ├─ availability: "IN_STOCK"
│  ├─ location: "Room A > Cabinet 5 > Section 3"
│  ├─ response_given: "Oil filter is available..."
│  ├─ call_duration: 45 (seconds)
│  └─ timestamp: now
│
├─ Analytics Update
│  ├─ Total calls: +1
│  ├─ Successful queries: +1
│  ├─ Products searched: oil filter
│  └─ Hit rate: 100%
│
└─ End Call or Continue
   Customer presses 1 → Hangup
   OR Customer says another product → Loop back to STT
```

---

## DATABASE DESIGN

### Complete Schema Specification

```sql
-- Stock Management Tables

CREATE TABLE stock_entries (
    id SERIAL PRIMARY KEY,
    product_id INT NOT NULL REFERENCES products(id),
    location_id INT NOT NULL REFERENCES locations(id),
    quantity INT NOT NULL CHECK (quantity >= 0),
    batch_number VARCHAR(100) UNIQUE,
    
    -- Supplier Info
    supplier_id INT REFERENCES suppliers(id),
    bill_id INT REFERENCES bills(id),
    
    -- Dates
    received_date TIMESTAMP DEFAULT NOW(),
    expiry_date DATE,
    
    -- Metadata
    created_by INT NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP NULL, -- Soft delete
    
    -- Indexes
    UNIQUE(id, product_id, batch_number)
);

CREATE INDEX idx_stock_entries_product ON stock_entries(product_id);
CREATE INDEX idx_stock_entries_location ON stock_entries(location_id);
CREATE INDEX idx_stock_entries_batch ON stock_entries(batch_number);
CREATE INDEX idx_stock_entries_supplier ON stock_entries(supplier_id);
CREATE INDEX idx_stock_entries_expiry ON stock_entries(expiry_date);


CREATE TABLE stock_logs (
    id SERIAL PRIMARY KEY,
    entry_id INT NOT NULL REFERENCES stock_entries(id),
    
    -- Stock Movement
    action VARCHAR(50) NOT NULL,
    -- Actions: ADD, REMOVE, TRANSFER, ADJUST, CORRECTION
    
    quantity_before INT,
    quantity_after INT,
    quantity_changed INT,
    
    -- Locations
    location_from INT REFERENCES locations(id),
    location_to INT REFERENCES locations(id),
    
    -- References
    bill_id INT REFERENCES bills(id),
    performed_by INT NOT NULL REFERENCES users(id),
    
    -- Details
    reason VARCHAR(255),
    notes TEXT,
    
    -- Timestamp (immutable)
    timestamp TIMESTAMP DEFAULT NOW(),
    
    -- This is an INSERT-ONLY table, no updates or deletes
    CONSTRAINT logs_immutable CHECK (True) -- Enforced at application level
);

CREATE INDEX idx_stock_logs_entry ON stock_logs(entry_id);
CREATE INDEX idx_stock_logs_action ON stock_logs(action);
CREATE INDEX idx_stock_logs_timestamp ON stock_logs(timestamp DESC);
CREATE INDEX idx_stock_logs_bill ON stock_logs(bill_id);


-- Billing Tables (Enhanced)

CREATE TABLE bills (
    id SERIAL PRIMARY KEY,
    
    -- Bill Info
    bill_type VARCHAR(50) NOT NULL,
    -- Types: PURCHASE, SALES, RETURN, CREDIT_NOTE
    
    bill_number VARCHAR(100) UNIQUE NOT NULL,
    bill_date DATE NOT NULL,
    
    -- Parties
    supplier_id INT REFERENCES suppliers(id),
    customer_id INT REFERENCES customers(id),
    
    -- Amounts
    sub_total DECIMAL(12,2),
    tax_amount DECIMAL(12,2),
    discount_amount DECIMAL(12,2),
    total_amount DECIMAL(12,2) NOT NULL,
    
    -- Payment
    payment_due_date DATE,
    status VARCHAR(50) DEFAULT 'DRAFT',
    -- Status: DRAFT, CONFIRMED, SHIPPED, DELIVERED, PAID, CANCELLED
    
    amount_paid DECIMAL(12,2) DEFAULT 0,
    outstanding_amount DECIMAL(12,2),
    
    -- Notes
    notes TEXT,
    
    -- Metadata
    created_by INT NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP NULL -- Soft delete
);

CREATE INDEX idx_bills_type ON bills(bill_type);
CREATE INDEX idx_bills_supplier ON bills(supplier_id);
CREATE INDEX idx_bills_customer ON bills(customer_id);
CREATE INDEX idx_bills_status ON bills(status);
CREATE INDEX idx_bills_date ON bills(bill_date DESC);
CREATE INDEX idx_bills_due_date ON bills(payment_due_date);


CREATE TABLE bill_items (
    id SERIAL PRIMARY KEY,
    bill_id INT NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES products(id),
    
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    
    -- Link to stock entry (for sales bills, which batch is removed)
    stock_entry_id INT REFERENCES stock_entries(id),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_bill_items_bill ON bill_items(bill_id);
CREATE INDEX idx_bill_items_product ON bill_items(product_id);
CREATE INDEX idx_bill_items_stock ON bill_items(stock_entry_id);


CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    bill_id INT NOT NULL REFERENCES bills(id),
    
    amount_paid DECIMAL(12,2) NOT NULL,
    payment_method VARCHAR(50),
    -- Methods: CASH, CHEQUE, BANK_TRANSFER, CREDIT_CARD
    
    payment_date DATE NOT NULL,
    reference_number VARCHAR(100),
    
    notes TEXT,
    recorded_by INT NOT NULL REFERENCES users(id),
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_payments_bill ON payments(bill_id);
CREATE INDEX idx_payments_date ON payments(payment_date DESC);


-- Notification Tables

CREATE TABLE notification_jobs (
    id SERIAL PRIMARY KEY,
    
    bill_id INT NOT NULL REFERENCES bills(id),
    party_id INT NOT NULL,
    -- party_id is either customer_id or supplier_id depending on context
    
    reminder_type VARCHAR(50) NOT NULL,
    -- Types: PAYMENT_DUE, PAYMENT_OVERDUE, LOW_STOCK, DELIVERY_ALERT
    
    scheduled_date TIMESTAMP NOT NULL,
    sent_date TIMESTAMP,
    
    status VARCHAR(50) DEFAULT 'PENDING',
    -- Status: PENDING, SENT, FAILED, CANCELLED
    
    retry_count INT DEFAULT 0,
    max_retries INT DEFAULT 3,
    
    template_id INT REFERENCES notification_templates(id),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notification_jobs_scheduled ON notification_jobs(scheduled_date);
CREATE INDEX idx_notification_jobs_status ON notification_jobs(status);
CREATE INDEX idx_notification_jobs_bill ON notification_jobs(bill_id);


CREATE TABLE notification_templates (
    id SERIAL PRIMARY KEY,
    
    name VARCHAR(100) NOT NULL,
    template_type VARCHAR(50) NOT NULL,
    -- Types: PAYMENT_REMINDER, LOW_STOCK, DELIVERY_ALERT, WELCOME
    
    channel VARCHAR(50) NOT NULL,
    -- Channels: SMS, WHATSAPP, EMAIL
    
    subject VARCHAR(200), -- For email
    body TEXT NOT NULL,
    
    -- Variables that can be used: {{customer_name}}, {{amount}}, {{product_name}}, etc
    variables JSON,
    
    is_default BOOLEAN DEFAULT False,
    is_active BOOLEAN DEFAULT True,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);


CREATE TABLE notification_logs (
    id SERIAL PRIMARY KEY,
    
    job_id INT NOT NULL REFERENCES notification_jobs(id),
    
    sent_to VARCHAR(100) NOT NULL,
    -- Phone number or email address
    
    template_id INT REFERENCES notification_templates(id),
    
    actual_body TEXT,
    
    status VARCHAR(50) NOT NULL,
    -- Status: SENT, DELIVERED, FAILED, BOUNCED
    
    error_message TEXT,
    
    provider_response JSON,
    
    sent_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notification_logs_job ON notification_logs(job_id);
CREATE INDEX idx_notification_logs_status ON notification_logs(status);
CREATE INDEX idx_notification_logs_sent_to ON notification_logs(sent_to);


-- Voice Agent Tables

CREATE TABLE voice_call_logs (
    id SERIAL PRIMARY KEY,
    call_id VARCHAR(100) UNIQUE NOT NULL,
    
    phone_number VARCHAR(20) NOT NULL,
    call_duration INT, -- seconds
    
    started_at TIMESTAMP NOT NULL,
    ended_at TIMESTAMP,
    
    -- Recording
    audio_file_url TEXT,
    audio_duration INT,
    
    -- Transcription
    transcript TEXT,
    transcription_confidence FLOAT,
    
    -- Analytics
    total_queries INT DEFAULT 0,
    successful_queries INT DEFAULT 0,
    failed_queries INT DEFAULT 0,
    escalated_to_human BOOLEAN DEFAULT False,
    
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_voice_calls_phone ON voice_call_logs(phone_number);
CREATE INDEX idx_voice_calls_started ON voice_call_logs(started_at DESC);


CREATE TABLE demand_logs (
    id SERIAL PRIMARY KEY,
    call_id VARCHAR(100) REFERENCES voice_call_logs(call_id),
    
    query_number INT, -- 1st, 2nd, 3rd query in call
    
    -- Query Details
    query_text VARCHAR(500),
    query_intent VARCHAR(100),
    -- Intent: AVAILABILITY, LOCATION, QUANTITY, VEHICLE_COMPATIBLE, PRICE
    
    -- Product Search
    product_searched VARCHAR(255),
    product_found_id INT REFERENCES products(id),
    product_found_name VARCHAR(255),
    
    -- Response
    availability VARCHAR(50),
    -- Status: IN_STOCK, LOW_STOCK, OUT_OF_STOCK, PARTIALLY_AVAILABLE
    
    location_found VARCHAR(255), -- "Room A > Cabinet 5 > Section 3"
    quantity_available INT,
    
    response_given TEXT,
    response_generated_by VARCHAR(50),
    -- Generated by: RULE_ENGINE, CHATBOT, HUMAN_AGENT
    
    confidence_score FLOAT,
    understood_correctly BOOLEAN DEFAULT True,
    
    timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_demand_logs_call ON demand_logs(call_id);
CREATE INDEX idx_demand_logs_product ON demand_logs(product_found_id);
CREATE INDEX idx_demand_logs_timestamp ON demand_logs(timestamp DESC);


-- Employee Activity Audit

CREATE TABLE activity_logs (
    id SERIAL PRIMARY KEY,
    
    user_id INT NOT NULL REFERENCES users(id),
    action_type VARCHAR(100) NOT NULL,
    -- Types: CREATE_STOCK, UPDATE_STOCK, DELETE_STOCK, CREATE_BILL, 
    --        PROCESS_PAYMENT, CREATE_EMPLOYEE, UPDATE_PERMISSIONS
    
    resource_type VARCHAR(50) NOT NULL,
    -- Types: STOCK_ENTRY, BILL, PAYMENT, EMPLOYEE, LOCATION
    
    resource_id INT,
    
    details JSON, -- Flexible data structure
    -- Example: {before: {...}, after: {...}, changes: ["quantity", "location"]}
    
    ip_address INET,
    timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_action ON activity_logs(action_type);
CREATE INDEX idx_activity_logs_resource ON activity_logs(resource_type, resource_id);
CREATE INDEX idx_activity_logs_timestamp ON activity_logs(timestamp DESC);
```

---

## API DESIGN

### Stock Management APIs

#### POST /api/inventory/stock/entries
**Add new stock entry with batch tracking**

Request:
```json
{
  "product_id": 101,
  "quantity": 50,
  "location_id": 5,
  "batch_number": "OL-2024-001",
  "supplier_id": 3,
  "bill_id": 999,
  "received_date": "2026-04-18",
  "expiry_date": "2026-12-31",
  "notes": "Perfect condition, sealed packaging"
}
```

Response (201):
```json
{
  "success": true,
  "data": {
    "id": 1234,
    "product_id": 101,
    "product_name": "Oil Filter",
    "quantity": 50,
    "location": {
      "id": 5,
      "room": "A",
      "cabinet": "5",
      "section": "3",
      "full_path": "WAREHOUSE > Room A > Cabinet 5 > Section 3"
    },
    "batch_number": "OL-2024-001",
    "supplier": "ABC Auto Parts",
    "received_date": "2026-04-18",
    "expiry_date": "2026-12-31",
    "created_at": "2026-04-18T10:30:00Z",
    "created_by": "User Name"
  }
}
```

Errors:
- 400: Validation failed (invalid quantity, location, product)
- 401: Unauthorized
- 403: Insufficient permissions (Warehouse role required)
- 409: Batch number already exists

---

#### GET /api/inventory/stock/product/:productId
**Get all stock batches for a product**

Query Parameters:
- `include_expired`: boolean (default: false)
- `include_removed`: boolean (default: false)
- `sort_by`: "expiry" | "quantity" | "location" (default: "expiry")

Response (200):
```json
{
  "success": true,
  "data": {
    "product": {
      "id": 101,
      "name": "Oil Filter",
      "sku": "OL-101",
      "total_quantity_in_stock": 85
    },
    "batches": [
      {
        "id": 1234,
        "batch_number": "OL-2024-001",
        "quantity": 50,
        "location": "Room A > Cabinet 5 > Section 3",
        "supplier": "ABC Auto Parts",
        "received_date": "2026-04-18",
        "expiry_date": "2026-12-31",
        "status": "ACTIVE"
      },
      {
        "id": 1235,
        "batch_number": "OL-2024-002",
        "quantity": 30,
        "location": "Room B > Cabinet 2 > Section 1",
        "supplier": "XYZ Distributors",
        "received_date": "2026-03-20",
        "expiry_date": "2025-06-30",
        "status": "EXPIRING_SOON" // < 90 days
      },
      {
        "id": 1236,
        "batch_number": "OL-2023-OLD",
        "quantity": 5,
        "location": "Room C > Cabinet 1 > Section 2",
        "supplier": "ABC Auto Parts",
        "received_date": "2023-04-18",
        "expiry_date": "2024-03-15",
        "status": "EXPIRED"
      }
    ]
  }
}
```

---

#### PUT /api/inventory/stock/entries/:entryId
**Update stock entry (location, quantity adjustment)**

Request:
```json
{
  "quantity": 48,
  "location_id": 6,
  "reason": "Physical count correction"
}
```

Response (200):
```json
{
  "success": true,
  "data": {
    "id": 1234,
    "quantity_before": 50,
    "quantity_after": 48,
    "location_before": "Room A > Cabinet 5 > Section 3",
    "location_after": "Room A > Cabinet 6 > Section 1",
    "updated_at": "2026-04-18T11:00:00Z",
    "audit_log_entry": {
      "id": 5678,
      "action": "ADJUST",
      "timestamp": "2026-04-18T11:00:00Z"
    }
  }
}
```

---

#### POST /api/inventory/stock/transfer
**Transfer stock between locations**

Request:
```json
{
  "from_entry_id": 1234,
  "to_location_id": 6,
  "quantity": 20,
  "reason": "Location optimization"
}
```

Response (200):
```json
{
  "success": true,
  "data": {
    "from_entry": {
      "id": 1234,
      "quantity_before": 50,
      "quantity_after": 30,
      "location": "Room A > Cabinet 5 > Section 3"
    },
    "to_entry": {
      "id": 1240,
      "quantity": 20,
      "location": "Room A > Cabinet 6 > Section 1"
    },
    "log_entries": [
      {"id": 5679, "action": "TRANSFER_OUT"},
      {"id": 5680, "action": "TRANSFER_IN"}
    ]
  }
}
```

---

#### GET /api/inventory/stock/logs/:entryId
**Get complete audit trail for a stock entry**

Response (200):
```json
{
  "success": true,
  "data": {
    "entry": {
      "id": 1234,
      "product": "Oil Filter",
      "batch": "OL-2024-001"
    },
    "logs": [
      {
        "id": 5678,
        "action": "ADD",
        "quantity_before": 0,
        "quantity_after": 50,
        "location": "Room A > Cabinet 5 > Section 3",
        "reason": "Purchase bill #999 confirmed",
        "performed_by": "John Warehouse",
        "timestamp": "2026-04-18T10:30:00Z"
      },
      {
        "id": 5679,
        "action": "REMOVE",
        "quantity_before": 50,
        "quantity_after": 45,
        "location": "Room A > Cabinet 5 > Section 3",
        "bill_id": 888,
        "reason": "Sales bill #888",
        "performed_by": "Jane Sales",
        "timestamp": "2026-04-18T14:15:00Z"
      },
      {
        "id": 5680,
        "action": "ADJUST",
        "quantity_before": 45,
        "quantity_after": 43,
        "reason": "Physical count adjustment",
        "performed_by": "Manager Admin",
        "timestamp": "2026-04-19T09:00:00Z"
      }
    ],
    "summary": {
      "total_added": 50,
      "total_removed": 7,
      "current_quantity": 43,
      "adjustments": 1
    }
  }
}
```

---

### Billing APIs (Enhanced)

#### POST /api/billing/purchase-bills
**Create purchase bill**

Request:
```json
{
  "supplier_id": 5,
  "bill_number": "SUP-2024-001",
  "bill_date": "2026-04-18",
  "payment_due_date": "2026-05-18",
  "items": [
    {
      "product_id": 101,
      "quantity": 50,
      "unit_price": 150.00
    },
    {
      "product_id": 102,
      "quantity": 30,
      "unit_price": 200.00
    }
  ],
  "tax_amount": 2250.00,
  "receiving_location_id": 5
}
```

Response (201):
```json
{
  "success": true,
  "data": {
    "id": 999,
    "bill_number": "SUP-2024-001",
    "supplier": "ABC Auto Parts",
    "status": "DRAFT",
    "sub_total": 13500.00,
    "tax_amount": 2250.00,
    "total_amount": 15750.00,
    "items": 2,
    "created_at": "2026-04-18T10:30:00Z"
  }
}
```

---

#### POST /api/billing/purchase-bills/:id/confirm
**Confirm bill and auto-create stock entries**

Response (200):
```json
{
  "success": true,
  "data": {
    "bill": {
      "id": 999,
      "status": "CONFIRMED",
      "confirmed_at": "2026-04-18T11:00:00Z"
    },
    "stock_created": [
      {
        "entry_id": 1234,
        "product": "Oil Filter",
        "quantity": 50,
        "location": "Room A > Cabinet 5 > Section 3",
        "batch": "BILL-999-OL-1234"
      },
      {
        "entry_id": 1235,
        "product": "Air Filter",
        "quantity": 30,
        "location": "Room A > Cabinet 5 > Section 3",
        "batch": "BILL-999-AF-1235"
      }
    ],
    "notifications_scheduled": 1,
    "payment_reminder_due": "2026-05-18"
  }
}
```

---

#### POST /api/billing/sales-bills/:id/confirm
**Confirm sales bill and auto-decrease stock (FIFO)**

Response (200):
```json
{
  "success": true,
  "data": {
    "bill": {
      "id": 888,
      "status": "CONFIRMED",
      "confirmed_at": "2026-04-18T14:00:00Z"
    },
    "stock_removed": [
      {
        "product": "Oil Filter",
        "quantity_requested": 5,
        "stock_deducted_from": [
          {
            "batch": "OL-2024-001",
            "quantity": 5,
            "entry_id": 1234,
            "location": "Room A > Cabinet 5 > Section 3"
          }
        ]
      }
    ],
    "low_stock_alerts": [],
    "invoice_generated": true
  }
}
```

---

#### GET /api/billing/outstanding-payments
**Get all unpaid bills**

Query Parameters:
- `days_overdue`: number (get payments overdue by N days)
- `supplier_id` or `customer_id`: INT
- `type`: "PURCHASE" | "SALES"

Response (200):
```json
{
  "success": true,
  "data": {
    "total_outstanding": 125000.00,
    "bills": [
      {
        "id": 999,
        "bill_number": "SUP-2024-001",
        "type": "PURCHASE",
        "supplier": "ABC Auto Parts",
        "total_amount": 15750.00,
        "amount_paid": 0,
        "outstanding": 15750.00,
        "payment_due_date": "2026-05-18",
        "days_overdue": -30,
        "status": "DUE_SOON"
      },
      {
        "id": 995,
        "bill_number": "SUP-2024-002",
        "type": "PURCHASE",
        "supplier": "XYZ Distributors",
        "total_amount": 8500.00,
        "amount_paid": 2000.00,
        "outstanding": 6500.00,
        "payment_due_date": "2026-04-15",
        "days_overdue": 3,
        "status": "OVERDUE"
      }
    ]
  }
}
```

---

### Voice Agent APIs

#### POST /api/voice/webhook
**Handle incoming phone call (called by phone gateway)**

Headers:
```
Authorization: Bearer <webhook_secret>
X-Exotel-Signature: <signature>
```

Request (from Exotel):
```json
{
  "CallSid": "c123456789",
  "From": "+919999000000",
  "To": "+918888111111",
  "CallStatus": "in-progress",
  "StartTime": "2026-04-18T10:30:00Z"
}
```

Response (200):
```json
{
  "success": true,
  "call_id": "c123456789",
  "actions": [
    {
      "type": "play",
      "content": "Welcome to stock management system"
    },
    {
      "type": "gather",
      "action": "/api/voice/process-input",
      "num_digits": 1,
      "timeout": 10
    }
  ]
}
```

---

#### POST /api/voice/process-query
**Process STT transcript and return response**

Request:
```json
{
  "call_id": "c123456789",
  "transcript": "i need an oil filter",
  "confidence": 0.92,
  "language": "en-IN"
}
```

Response (200):
```json
{
  "success": true,
  "query": {
    "text": "i need an oil filter",
    "intent": "AVAILABILITY_CHECK",
    "entities": {
      "product": "oil filter",
      "confidence": 0.95
    }
  },
  "result": {
    "found": true,
    "products": [
      {
        "id": 101,
        "name": "Bosch Oil Filter",
        "available_quantity": 50,
        "location": "Room A, Cabinet 5, Section 3",
        "stock_entries": 1
      }
    ],
    "response_text": "Oil filter is available in Room A, Cabinet 5, Section 3. We have 50 units in stock.",
    "response_audio_url": "https://tts-service.com/audio/response123.mp3"
  },
  "next_action": {
    "type": "play",
    "content_url": "https://tts-service.com/audio/response123.mp3"
  },
  "demand_log_id": 45678
}
```

---

#### GET /api/voice/call-analytics
**Get voice agent usage statistics**

Query Parameters:
- `date_from`, `date_to`: ISO dates
- `metric`: "total_calls" | "queries_answered" | "hit_rate" | "average_duration"

Response (200):
```json
{
  "success": true,
  "period": {
    "from": "2026-04-01",
    "to": "2026-04-18"
  },
  "analytics": {
    "total_calls": 342,
    "total_duration_seconds": 18900,
    "average_call_duration": 55,
    "total_queries": 385,
    "successful_queries": 298,
    "failed_queries": 87,
    "query_success_rate": 77.4,
    "escalated_to_human": 12,
    "unique_callers": 287
  },
  "top_products_searched": [
    {
      "product": "Oil Filter",
      "queries": 85,
      "hit_rate": 98.8
    },
    {
      "product": "Air Filter",
      "queries": 72,
      "hit_rate": 95.8
    },
    {
      "product": "Brake Pads",
      "queries": 68,
      "hit_rate": 64.7
    }
  ],
  "top_intents": [
    {
      "intent": "AVAILABILITY_CHECK",
      "count": 245
    },
    {
      "intent": "LOCATION_QUERY",
      "count": 98
    },
    {
      "intent": "QUANTITY_CHECK",
      "count": 42
    }
  ]
}
```

---

### Notification APIs

#### POST /api/notifications/reminders/schedule
**Schedule a notification reminder**

Request:
```json
{
  "bill_id": 999,
  "party_id": 5,
  "party_type": "SUPPLIER",
  "reminder_type": "PAYMENT_DUE",
  "scheduled_date": "2026-05-16",
  "channels": ["SMS", "EMAIL"],
  "template_id": 1
}
```

Response (201):
```json
{
  "success": true,
  "data": {
    "job_id": 5001,
    "status": "PENDING",
    "scheduled_for": "2026-05-16T09:00:00Z",
    "channels": ["SMS", "EMAIL"],
    "recipient": "+919999000000",
    "template": "payment_reminder_v1"
  }
}
```

---

#### GET /api/notifications/logs
**Get notification delivery logs**

Query Parameters:
- `status`: "SENT" | "FAILED" | "DELIVERED"
- `channel`: "SMS" | "EMAIL" | "WHATSAPP"
- `date_from`, `date_to`: ISO dates

Response (200):
```json
{
  "success": true,
  "data": {
    "total": 1256,
    "sent": 1203,
    "failed": 53,
    "delivery_rate": 95.8,
    "logs": [
      {
        "id": 9001,
        "sent_to": "+919999000000",
        "channel": "SMS",
        "template": "payment_reminder",
        "status": "DELIVERED",
        "sent_at": "2026-04-18T09:30:00Z"
      },
      {
        "id": 9002,
        "sent_to": "supplier@abc.com",
        "channel": "EMAIL",
        "template": "payment_reminder",
        "status": "BOUNCED",
        "error": "Invalid email address",
        "sent_at": "2026-04-18T09:31:00Z"
      }
    ]
  }
}
```

---

## SECURITY DESIGN

### Authentication & Authorization

```javascript
// JWT Token Structure
{
  "sub": "user_id",
  "email": "user@example.com",
  "roles": ["warehouse", "manager"],
  "permissions": ["create_stock", "view_inventory", "create_bill"],
  "iat": 1713417000,
  "exp": 1713503400,
  "iss": "sibms-auth"
}

// Token Expiry: 24 hours (short-lived for security)
// Refresh tokens: 7 days (stored in secure HTTP-only cookie)

// Role-Based Access Control (RBAC)
ADMIN          → All permissions
MANAGER        → Create bills, payments, reports
WAREHOUSE      → Add/remove stock, transfers
BILLING        → Create bills, process payments
VIEWER         → View-only reports
```

### Data Security

```
1. Stock Entry Creation:
   ✓ User must have WAREHOUSE or ADMIN role
   ✓ Location must be verified and exist
   ✓ Product must be verified
   ✓ All changes logged with user_id + timestamp
   ✓ Quantity validated (> 0, no negative)

2. Bill Operations:
   ✓ User must have BILLING role
   ✓ Bill cannot be modified after CONFIRMED status
   ✓ Stock impact must match bill items exactly
   ✓ Payment processing requires ADMIN approval if > threshold
   ✓ Audit trail tracks every bill state change

3. Voice Agent:
   ✓ Call webhook must include valid signature
   ✓ Phone numbers are hashed in logs (PII protection)
   ✓ Audio files encrypted at rest
   ✓ Transcripts are anonymized if needed

4. Notifications:
   ✓ Phone numbers and emails stored securely
   ✓ Failed delivery retries max 3 times
   ✓ Delivery logs are kept for compliance
```

### API Security

```javascript
// Middleware Stack
1. Express CORS - Whitelist specific origins
2. Rate Limiting - 100 req/min per IP
3. JWT Authentication - Verify token signature
4. Role-based Authorization - Check permissions
5. Input Validation - Sanitize all inputs
6. Request Logging - Log all API calls
7. Error Handling - Never expose stack traces

// Example Protected Route
app.post('/api/inventory/stock/entries',
  authenticate,              // Check JWT token
  authorize('warehouse'),    // Check role
  validateInput,             // Validate request body
  stockController.addEntry   // Handle request
);
```

---

## INTEGRATION POINTS

### External Service Integrations

#### 1. SMS/WhatsApp Gateway (Twilio)
```javascript
// Setup
TWILIO_ACCOUNT_SID = "....."
TWILIO_AUTH_TOKEN = "....."
TWILIO_PHONE_NUMBER = "+1XXXXXXXXXX"

// Send SMS Example
const client = require('twilio')(accountSid, authToken);
client.messages.create({
  body: `Your payment is due on ${dueDate}. Amount: ₹${amount}`,
  from: '+1XXXXXXXXXX',
  to: '+919999000000'
})

// Cost: ~₹1 per SMS in India
```

#### 2. Email Service (SendGrid)
```javascript
// Setup
SENDGRID_API_KEY = "....."

// Send Email Example
const msg = {
  to: 'supplier@abc.com',
  from: 'billing@sibms.com',
  subject: 'Payment Reminder',
  html: `<p>Your payment is due on ${dueDate}</p>`,
};
await sgMail.send(msg);

// Cost: Free up to 100 emails/day
```

#### 3. Voice IVR (Exotel)
```javascript
// Setup
EXOTEL_API_KEY = "....."
EXOTEL_ACCOUNT_SID = "....."

// Incoming call webhook
POST /api/voice/webhook
{
  "CallSid": "c123456",
  "From": "+919999000000",
  "CallStatus": "in-progress"
}

// Cost: ~₹2-5 per minute in India
```

#### 4. Speech-to-Text (Google Cloud)
```javascript
// Setup
GOOGLE_APPLICATION_CREDENTIALS = "path/to/key.json"

// Convert audio to text
const speech = require('@google-cloud/speech');
const result = await client.recognize({
  audio: {content: audioBuffer},
  config: {
    encoding: 'LINEAR16',
    sampleRateHertz: 16000,
    languageCode: 'en-IN'
  }
});

// Cost: $0.015 per 15 seconds (~₹1.25 per minute)
```

#### 5. Text-to-Speech (Google Cloud)
```javascript
// Setup
const textToSpeech = require('@google-cloud/text-to-speech');

// Convert text to audio
const request = {
  input: {text: 'Oil filter is available in Room A'},
  voice: {languageCode: 'en-IN', name: 'en-IN-Neural2-A'},
  audioConfig: {audioEncoding: 'MP3'}
};
const [response] = await client.synthesizeSpeech(request);

// Cost: $15 per 1 million characters (~₹0.01 per query)
```

---

## DEPLOYMENT & MONITORING

### Error Handling Strategy

```javascript
// Custom Error Classes
class StockError extends Error {
  constructor(message, code, statusCode = 400) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

// Usage
if (quantity < 0) {
  throw new StockError(
    'Stock quantity cannot be negative',
    'INVALID_QUANTITY',
    400
  );
}

// Error Response Format
{
  "success": false,
  "error": {
    "code": "INVALID_QUANTITY",
    "message": "Stock quantity cannot be negative",
    "details": { quantity: -5 },
    "timestamp": "2026-04-18T10:30:00Z",
    "requestId": "req-123456"
  }
}
```

---

**End of System Design Document**

This document provides the foundation for implementation. Each phase will expand specific sections with detailed implementation guides.

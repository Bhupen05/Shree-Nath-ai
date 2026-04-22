# Smart Inventory & Business Management System (SIBMS)
### Complete System Design & Technical Documentation
> **Version:** 1.0 | **Date:** 13 April 2026 | **Status:** Final Draft  
> **Target:** Auto Parts & Retail Business  
> **Tech Stack:** React · Node.js · PostgreSQL · Redis · Twilio · OpenAI

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture](#2-system-architecture)
3. [Database Schema](#3-database-schema)
4. [Module 1 — Inventory / Stock Management](#4-module-1--inventory--stock-management)
5. [Module 2 — Billing System](#5-module-2--billing-system)
6. [Module 3 — Employee Management](#6-module-3--employee-management)
7. [Module 4 — AI Agent](#7-module-4--ai-agent-dual-mode)
8. [API Design](#8-api-design)
9. [Dashboard & KPIs](#9-dashboard--kpis)
10. [Deployment Architecture](#10-deployment-architecture)
11. [Security Considerations](#11-security-considerations)
12. [Mobile PWA](#12-mobile-pwa-warehouse-staff)
13. [Development Roadmap](#13-development-roadmap)
14. [Appendix](#14-appendix)

---

## 1. Executive Summary

SIBMS is a comprehensive, full-stack web application designed specifically for auto parts and retail businesses. It unifies inventory control, billing, employee management, and AI-powered intelligence into a single, cohesive platform.

### 1.1 Business Problems Addressed

| Problem | Impact |
|---|---|
| Manual inventory tracking | Stock discrepancies and lost sales |
| Disconnected billing & stock systems | Data duplication |
| No centralized employee tracking | Increased error risk |
| Manual payment follow-ups | Inconsistent collections |
| Difficulty locating warehouse parts | Slow fulfillment |

### 1.2 Solution Overview

- **3-Level Stock Location:** Room → Cabinet (Kabat) → Section
- **Real-time Inventory Sync** with every purchase/sales bill
- **Role-Based Access Control** for all staff levels
- **AI Voice Agent** answering natural queries like _"I want an oil filter for an i10"_
- **Automated Reminders** via SMS, WhatsApp, and Email for pending payments
- **PWA Mobile App** for offline warehouse operations

### 1.3 Key Performance Targets

| Metric | Baseline (Manual) | Target (SIBMS) |
|---|---|---|
| Stock lookup time | 5–15 min | < 30 seconds |
| Billing errors | High | Near zero (auto-sync) |
| Payment follow-up | Ad hoc | Automated (SMS/WA/Email) |
| Inventory accuracy | ~70% | > 98% |
| Staff accountability | None | Full activity log |

---

## 2. System Architecture

### 2.1 High-Level Architecture

SIBMS follows a modern, layered architecture with clear separation of concerns across presentation, application, and data tiers.

```
┌─────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                           │
│        React SPA (Web)         Mobile PWA (Warehouse Staff)     │
│        Barcode/QR Scanner      Voice Interface (Twilio)         │
└──────────────────────┬──────────────────────────────────────────┘
                       │  HTTPS / REST / WebSocket
┌──────────────────────▼──────────────────────────────────────────┐
│                       API GATEWAY LAYER                         │
│           Nginx (Reverse Proxy)   JWT Auth   Rate Limiting      │
└──────────────────────┬──────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│                      APPLICATION LAYER                          │
│              Node.js / Express ──────────────────────────────   │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│   │Inventory │  │ Billing  │  │ Employee │  │  AI Agent    │  │
│   │ Service  │  │ Service  │  │ Service  │  │(OpenAI/Whis) │  │
│   └──────────┘  └──────────┘  └──────────┘  └──────────────┘  │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐                     │
│   │ Notif.   │  │ Report   │  │   Auth   │                     │
│   │ Service  │  │ Service  │  │ Service  │                     │
│   └──────────┘  └──────────┘  └──────────┘                     │
└──────────────────────┬──────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│                         DATA LAYER                              │
│    PostgreSQL (Primary)    Redis (Cache / Sessions / Queues)    │
│    AWS S3 / MinIO (Files)  Bull MQ (Background Jobs)           │
└──────────────────────┬──────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│                      EXTERNAL SERVICES                          │
│  Twilio (SMS/Voice)   WhatsApp Business API   OpenAI/Whisper   │
│  SendGrid (Email)     Barcode API             Firebase (Push)  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Technology Stack

| Layer | Technology | Purpose | Version |
|---|---|---|---|
| Frontend | React 18 + Vite | SPA web interface | 18.x |
| UI Components | Tailwind CSS + shadcn/ui | Consistent design system | Latest |
| State Management | Zustand + React Query | Client state + server sync | Latest |
| Backend | Node.js + Express.js | REST API server | 20 LTS |
| ORM | Prisma ORM | Type-safe database access | 5.x |
| Primary DB | PostgreSQL 16 | Relational data store | 16.x |
| Cache / Queue | Redis 7 | Caching, sessions, job queue | 7.x |
| Job Queue | BullMQ | Background tasks & reminders | Latest |
| File Storage | AWS S3 / MinIO | Bills, images, attachments | Latest |
| SMS / Voice | Twilio | SMS alerts, voice AI calls | v2 |
| WhatsApp | WhatsApp Business API | Bill sharing, reminders | v18 |
| Email | SendGrid / Nodemailer | Email notifications | Latest |
| AI / NLP | OpenAI GPT-4o + Whisper | Voice AI & recommendations | Latest |
| Auth | JWT + bcrypt | Authentication & sessions | Latest |
| API Docs | Swagger / OpenAPI 3.1 | API documentation | Latest |
| Containerization | Docker + Docker Compose | Deployment | Latest |
| Reverse Proxy | Nginx | Load balancing, SSL | Latest |

---

## 3. Database Schema

SIBMS uses **PostgreSQL** as the primary relational database. All tables include `created_at`, `updated_at`, and `created_by` fields for full audit traceability.

### 3.1 Entity Overview

```
employees         →  system users / staff
roles             →  role definitions (Admin, Manager, Billing, Warehouse)
employee_roles    →  many-to-many mapping
products          →  master product catalog
product_vehicles  →  product ↔ compatible vehicle models
locations         →  Room → Cabinet → Section hierarchy
stock_entries     →  one row per batch, tracks qty + location
stock_logs        →  immutable audit log of all stock changes
suppliers         →  supplier / vendor master
customers         →  customer master
bills             →  parent bill (purchase or sales)
bill_items        →  line items per bill
bill_payments     →  partial/full payment records
payment_reminders →  scheduled outbound reminders
activity_logs     →  who did what, when
demand_logs       →  unserviced customer requests (AI agent)
```

### 3.2 Employees & Roles

```sql
TABLE: employees
─────────────────────────────────────────────────────
  id              UUID          PRIMARY KEY
  emp_code        VARCHAR(20)   UNIQUE NOT NULL
  full_name       VARCHAR(120)  NOT NULL
  phone           VARCHAR(15)   UNIQUE
  email           VARCHAR(120)  UNIQUE
  password_hash   VARCHAR(255)  NOT NULL
  is_active       BOOLEAN       DEFAULT TRUE
  created_at      TIMESTAMPTZ   DEFAULT NOW()
  updated_at      TIMESTAMPTZ

TABLE: roles
─────────────────────────────────────────────────────
  id              UUID          PRIMARY KEY
  name            VARCHAR(50)   UNIQUE  -- Admin | Manager | Billing | Warehouse
  permissions     JSONB                 -- granular permission map
  created_at      TIMESTAMPTZ

TABLE: employee_roles
─────────────────────────────────────────────────────
  employee_id     UUID  FK → employees.id
  role_id         UUID  FK → roles.id
  PRIMARY KEY (employee_id, role_id)
```

### 3.3 Products & Locations

```sql
TABLE: products
─────────────────────────────────────────────────────
  id              UUID           PRIMARY KEY
  sku             VARCHAR(50)    UNIQUE NOT NULL
  name            VARCHAR(200)   NOT NULL
  description     TEXT
  category        VARCHAR(80)
  brand           VARCHAR(80)
  unit            VARCHAR(20)    DEFAULT 'pcs'
  selling_price   NUMERIC(12,2)  NOT NULL
  cost_price      NUMERIC(12,2)
  reorder_level   INTEGER        DEFAULT 5
  barcode         VARCHAR(100)   UNIQUE
  image_url       TEXT
  is_active       BOOLEAN        DEFAULT TRUE
  created_at      TIMESTAMPTZ
  updated_at      TIMESTAMPTZ

TABLE: product_vehicles
─────────────────────────────────────────────────────
  id              UUID         PRIMARY KEY
  product_id      UUID         FK → products.id
  make            VARCHAR(60)  -- e.g. Hyundai
  model           VARCHAR(60)  -- e.g. i10
  year_from       INTEGER
  year_to         INTEGER
  notes           TEXT

TABLE: locations
─────────────────────────────────────────────────────
  id              UUID         PRIMARY KEY
  room            VARCHAR(60)  NOT NULL
  cabinet         VARCHAR(60)  NOT NULL  -- "Kabat"
  section         VARCHAR(60)  NOT NULL
  description     TEXT
  UNIQUE (room, cabinet, section)
```

### 3.4 Stock & Inventory

```sql
TABLE: suppliers
─────────────────────────────────────────────────────
  id              UUID          PRIMARY KEY
  name            VARCHAR(150)  NOT NULL
  contact_name    VARCHAR(100)
  phone           VARCHAR(15)
  email           VARCHAR(120)
  address         TEXT
  gstin           VARCHAR(20)
  created_at      TIMESTAMPTZ

TABLE: stock_entries
─────────────────────────────────────────────────────
  id              UUID           PRIMARY KEY
  product_id      UUID           FK → products.id
  location_id     UUID           FK → locations.id
  supplier_id     UUID           FK → suppliers.id
  bill_reference  VARCHAR(100)   -- supplier bill/invoice number
  batch_number    VARCHAR(80)
  quantity        INTEGER        NOT NULL CHECK (quantity >= 0)
  cost_price      NUMERIC(12,2)
  received_date   DATE           NOT NULL
  expiry_date     DATE
  added_by        UUID           FK → employees.id
  bill_doc_url    TEXT           -- S3 link to supplier bill scan
  notes           TEXT
  created_at      TIMESTAMPTZ

TABLE: stock_logs
─────────────────────────────────────────────────────
  id              UUID         PRIMARY KEY
  stock_entry_id  UUID         FK → stock_entries.id
  product_id      UUID         FK → products.id
  action          VARCHAR(20)  -- IN | OUT | ADJUST | TRANSFER
  quantity_change INTEGER      NOT NULL
  balance_after   INTEGER
  reference_type  VARCHAR(30)  -- bill | manual | adjustment
  reference_id    UUID
  performed_by    UUID         FK → employees.id
  notes           TEXT
  created_at      TIMESTAMPTZ  DEFAULT NOW()
```

### 3.5 Billing

```sql
TABLE: customers
─────────────────────────────────────────────────────
  id              UUID           PRIMARY KEY
  name            VARCHAR(150)   NOT NULL
  phone           VARCHAR(15)
  email           VARCHAR(120)
  address         TEXT
  gstin           VARCHAR(20)
  credit_limit    NUMERIC(12,2)  DEFAULT 0
  created_at      TIMESTAMPTZ

TABLE: bills
─────────────────────────────────────────────────────
  id              UUID          PRIMARY KEY
  bill_number     VARCHAR(30)   UNIQUE NOT NULL
  bill_type       VARCHAR(10)   -- PURCHASE | SALES
  status          VARCHAR(20)   -- DRAFT | CONFIRMED | PAID | PARTIAL | OVERDUE
  party_id        UUID          -- FK → customers.id OR suppliers.id
  party_type      VARCHAR(10)   -- CUSTOMER | SUPPLIER
  bill_date       DATE          NOT NULL
  due_date        DATE
  subtotal        NUMERIC(12,2)
  discount        NUMERIC(12,2) DEFAULT 0
  tax_amount      NUMERIC(12,2) DEFAULT 0
  total_amount    NUMERIC(12,2)
  paid_amount     NUMERIC(12,2) DEFAULT 0
  notes           TEXT
  created_by      UUID          FK → employees.id
  created_at      TIMESTAMPTZ
  updated_at      TIMESTAMPTZ

TABLE: bill_items
─────────────────────────────────────────────────────
  id              UUID           PRIMARY KEY
  bill_id         UUID           FK → bills.id
  product_id      UUID           FK → products.id
  stock_entry_id  UUID           FK → stock_entries.id  -- specific batch
  quantity        INTEGER        NOT NULL
  unit_price      NUMERIC(12,2)  NOT NULL
  discount_pct    NUMERIC(5,2)   DEFAULT 0
  tax_pct         NUMERIC(5,2)   DEFAULT 0
  line_total      NUMERIC(12,2)

TABLE: bill_payments
─────────────────────────────────────────────────────
  id              UUID           PRIMARY KEY
  bill_id         UUID           FK → bills.id
  amount          NUMERIC(12,2)  NOT NULL
  payment_mode    VARCHAR(30)    -- CASH | UPI | BANK | CHEQUE | CREDIT
  reference_no    VARCHAR(80)
  payment_date    DATE           NOT NULL
  received_by     UUID           FK → employees.id
  notes           TEXT

TABLE: payment_reminders
─────────────────────────────────────────────────────
  id              UUID         PRIMARY KEY
  bill_id         UUID         FK → bills.id
  channel         VARCHAR(20)  -- SMS | WHATSAPP | EMAIL
  scheduled_at    TIMESTAMPTZ
  sent_at         TIMESTAMPTZ
  status          VARCHAR(20)  -- PENDING | SENT | FAILED
  message_body    TEXT
  response_log    JSONB
```

### 3.6 Activity & Demand Logs

```sql
TABLE: activity_logs
─────────────────────────────────────────────────────
  id              UUID         PRIMARY KEY
  employee_id     UUID         FK → employees.id
  action          VARCHAR(80)  -- STOCK_IN | STOCK_OUT | BILL_CREATE | etc.
  entity_type     VARCHAR(50)
  entity_id       UUID
  ip_address      INET
  user_agent      TEXT
  metadata        JSONB
  created_at      TIMESTAMPTZ  DEFAULT NOW()

TABLE: demand_logs
─────────────────────────────────────────────────────
  id              UUID         PRIMARY KEY
  source          VARCHAR(20)  -- VOICE_AI | MANUAL | WEB
  query_text      TEXT
  product_id      UUID         FK → products.id  NULLABLE
  vehicle_make    VARCHAR(60)
  vehicle_model   VARCHAR(60)
  quantity_req    INTEGER
  fulfilled       BOOLEAN      DEFAULT FALSE
  caller_phone    VARCHAR(15)
  created_at      TIMESTAMPTZ  DEFAULT NOW()
```

---

## 4. Module 1 — Inventory / Stock Management

### 4.1 Feature Overview

| Feature | Description |
|---|---|
| Multi-level location | Room → Cabinet (Kabat) → Section with unique location codes |
| Batch stock entries | Multiple stock rows per Product ID for batch/lot tracking |
| Incoming stock log | Date, qty, supplier bill ref, added-by employee — all recorded |
| Auto stock deduction | Sales bills trigger automatic stock reduction in real-time |
| Bulk stock addition | Multi-row UI to add several products in a single operation |
| Supplier bill attach | PDF/image of supplier bill attached to each stock entry |
| Product update | Edit product details, price, and location reassignment |

### 4.2 Wireflow — Add Stock (Incoming)

```
Warehouse Staff logs in
        │
        ▼
[Inventory Menu] → [Add Stock]
        │
        ▼
┌────────────────────────────────────────────┐
│           BULK STOCK ENTRY FORM            │
│  ──────────────────────────────────────    │
│  Date:          [date picker]              │
│  Supplier:      [searchable dropdown]      │
│  Bill Reference:[text field]              │
│  Attach Bill:   [file upload - PDF/Image]  │
│                                            │
│  ┌──────┬──────────┬────────┬──────────┐   │
│  │ SKU  │ Location │  Qty   │  Cost    │   │
│  ├──────┼──────────┼────────┼──────────┤   │
│  │[scan]│ R1/K2/S3 │   50   │  ₹120   │   │
│  │[scan]│ R1/K2/S4 │   30   │  ₹200   │   │
│  │          [+ Add Row]                │   │
│  └──────┴──────────┴────────┴──────────┘   │
│           [Save All Stock Entries]          │
└────────────────────────────────────────────┘
        │
        ▼
Server: Create stock_entries records
      + Insert stock_logs (action=IN)
      + Insert activity_logs
        │
        ▼
[Success Toast] → Inventory updated
```

### 4.3 Wireflow — Stock Lookup

```
[Search Bar / Barcode Scan]
        │
        ▼
Search by: Product Name | SKU | Barcode | Vehicle Model
        │
        ▼
┌───────────────────────────────────────────────────┐
│               PRODUCT DETAIL VIEW                 │
│  Product: Oil Filter — Hyundai i10 (SKU: OF-1234) │
│  Total Stock: 47 units                            │
│                                                   │
│  Stock Batches:                                   │
│  ┌──────────┬──────────┬─────────┬─────┬────┐     │
│  │  Room    │ Cabinet  │ Section │ Qty │Ref │     │
│  ├──────────┼──────────┼─────────┼─────┼────┤     │
│  │  Room A  │ Kabat 2  │  Sec 3  │  20 │INV1│     │
│  │  Room A  │ Kabat 4  │  Sec 1  │  27 │INV2│     │
│  └──────────┴──────────┴─────────┴─────┴────┘     │
│  [View Bill History]  [Add More Stock]  [Edit]    │
└───────────────────────────────────────────────────┘
```

---

## 5. Module 2 — Billing System

### 5.1 Bill Types

| Bill Type | Trigger | Inventory Effect | Party |
|---|---|---|---|
| Purchase Bill (IN) | Buying stock from supplier | Stock INCREASES | Supplier |
| Sales Bill (OUT) | Selling to customer | Stock DECREASES | Customer |
| Return Bill (IN) | Customer returns product | Stock INCREASES | Customer |
| Credit Note | Price adjustment post-sale | No inventory change | Customer |

### 5.2 Wireflow — Create Sales Bill

```
[Billing Menu] → [New Sales Bill]
        │
        ▼
┌──────────────────────────────────────────────┐
│               NEW SALES BILL                 │
│  Bill No: SALE-2025-0482 (auto-generated)    │
│  Date: [date]        Due Date: [date]        │
│  Customer: [searchable / create new]         │
│                                              │
│  [+ Add Product] or [Scan Barcode]           │
│  ┌─────────────┬──────┬──────────┬───────┐   │
│  │   Product   │ Qty  │  Price   │ Total │   │
│  ├─────────────┼──────┼──────────┼───────┤   │
│  │  Oil Filter │   2  │  ₹350   │  ₹700 │   │
│  │  Brake Pad  │   4  │  ₹450   │ ₹1800 │   │
│  └─────────────┴──────┴──────────┴───────┘   │
│  Discount: [ ]%     Tax (GST): [18]%         │
│  Grand Total: ₹2,960                         │
│  Payment: [CASH] [UPI] [CREDIT]              │
│       [Save Draft]   [Confirm & Print]       │
└──────────────────────────────────────────────┘
        │
        ▼
On CONFIRM:
  1. Generate PDF bill → S3 storage
  2. Deduct stock for each bill_item (FIFO batch selection)
  3. Insert stock_logs (action=OUT)
  4. Insert activity_log
  5. Send bill PDF via WhatsApp / Email
  6. If payment=CREDIT → schedule payment reminders
```

### 5.3 Payment Reminder Automation

| Trigger | Channel | Timing | Template |
|---|---|---|---|
| Due date T-3 days | WhatsApp + Email | Auto at 10 AM | 3-day advance reminder |
| Due date = Today | SMS + WhatsApp | Auto at 9 AM | Payment due today |
| Due date + 1 day | SMS + Email | Auto at 10 AM | Overdue notice |
| Due date + 7 days | WhatsApp + Email | Auto at 10 AM | Final overdue notice |
| Manual trigger | All channels | On-demand | Custom message |

### 5.4 Bill Status Flow

```
DRAFT → CONFIRMED → PAID
              ↘ PARTIAL  (part payment received)
              ↘ OVERDUE  (past due date, unpaid)
Any status  → CANCELLED  (with reason & stock reversal if needed)
```

---

## 6. Module 3 — Employee Management

### 6.1 Role Permission Matrix

| Permission | Admin | Manager | Billing | Warehouse |
|---|:---:|:---:|:---:|:---:|
| View Dashboard & KPIs | ✓ | ✓ | ✓ | ✓ |
| Add / Edit Products | ✓ | ✓ | ✗ | ✗ |
| Add Stock (IN) | ✓ | ✓ | ✗ | ✓ |
| Create Sales Bills | ✓ | ✓ | ✓ | ✗ |
| View All Bills | ✓ | ✓ | Own only | ✗ |
| Manage Employees | ✓ | ✗ | ✗ | ✗ |
| View Activity Logs | ✓ | ✓ | ✗ | ✗ |
| Export Reports | ✓ | ✓ | ✗ | ✗ |
| Manage Reminders | ✓ | ✓ | ✓ | ✗ |
| AI Agent Config | ✓ | ✗ | ✗ | ✗ |

### 6.2 Employee Onboarding Wireflow

```
[Admin] → [Employees] → [Add New Employee]
        │
        ▼
┌───────────────────────────────────────────┐
│           ADD EMPLOYEE FORM               │
│  Full Name:   [_______________]           │
│  Employee ID: [AUTO-GENERATED]            │
│  Phone:       [_______________]           │
│  Email:       [_______________]           │
│  Role:        [Admin / Manager / ...]     │
│  Password:    [auto-generated → emailed]  │
│              [Save Employee]              │
└───────────────────────────────────────────┘
        │
        ▼
Employee receives login credentials via SMS/Email
First login → forced password change
```

### 6.3 Activity Log Sample

| Timestamp | Employee | Action | Details |
|---|---|---|---|
| 2025-06-01 10:23 | Raj Kumar | STOCK_IN | Product: OF-1234, Qty: 50, Bill: INV-2891 |
| 2025-06-01 11:05 | Priya Shah | BILL_CREATE | Bill: SALE-0482, Customer: Ahmed Auto |
| 2025-06-01 11:47 | Raj Kumar | STOCK_OUT | Product: BP-5678, Qty: 4, Bill: SALE-0482 |
| 2025-06-01 14:10 | Admin | EMPLOYEE_UPDATE | Updated role for: Priya Shah → Manager |

---

## 7. Module 4 — AI Agent (Dual Mode)

### 7.1 System AI — Inventory Intelligence

| Function | Trigger | Output |
|---|---|---|
| Low stock alert | qty < reorder_level | Dashboard badge + notification |
| Reorder suggestion | Daily cron 6 AM | Suggested order qty per supplier |
| Sales trend report | Weekly Sunday | Top 10 products + slow movers |
| Dead stock detection | No movement > 90 days | List with value-at-risk |
| Demand forecast | Monthly | Next 30-day projected demand per product |
| Overdue bill summary | Daily 8 AM | Aged receivables report for Admin |

### 7.2 Voice AI Agent — Inbound Call Flow

```
Customer calls business phone (Twilio number)
        │
        ▼
Twilio receives call → sends audio stream to Node.js server
        │
        ▼
Whisper API → speech-to-text transcription
  "I want an oil filter for a Hyundai i10"
        │
        ▼
GPT-4o intent extraction:
  { product_type: "oil filter",
    vehicle_make: "Hyundai",
    vehicle_model: "i10" }
        │
        ▼
Database lookup:
  SELECT s.*, l.room, l.cabinet, l.section
  FROM stock_entries s
  JOIN product_vehicles pv ON pv.product_id = s.product_id
  JOIN locations l ON l.id = s.location_id
  WHERE pv.make ILIKE 'Hyundai' AND pv.model ILIKE 'i10'
    AND s.quantity > 0
        │
  ┌─────┴──────────────┐
FOUND               NOT FOUND
  │                     │
  ▼                     ▼
TTS Response:         TTS Response:
"Yes, we have         "Sorry, we don't have that
 2 units of the       right now. Similar options:
 Hyundai i10 oil      [alternatives]. Want me to
 filter. It is in     note your requirement?"
 Room A, Kabat 2,           │
 Section 3."                ▼
                    Log to demand_logs table
                    Notify Manager via WhatsApp
```

### 7.3 Voice AI Tech Stack

| Component | Technology | Role |
|---|---|---|
| Inbound Call | Twilio Voice | Receive and manage phone call |
| Speech-to-Text | OpenAI Whisper | Convert spoken query to text |
| NLU / Intent | GPT-4o | Extract product + vehicle intent |
| Stock Lookup | PostgreSQL + Redis cache | Find matching products by vehicle |
| Text-to-Speech | Twilio TTS / ElevenLabs | Respond in natural voice |
| Demand Logging | PostgreSQL demand_logs | Record unserviced queries |
| Alert Dispatch | WhatsApp Business API | Notify manager of new demand |

---

## 8. API Design

### 8.1 Base Configuration

| Property | Value |
|---|---|
| Base URL | `https://api.sibms.yourdomain.com/v1` |
| Auth | Bearer JWT (`Authorization: Bearer <token>`) |
| Format | `application/json` (request & response) |
| Versioning | URL path (`/v1`, `/v2`) |
| Pagination | Cursor-based: `?cursor=<id>&limit=25` |
| Rate Limit | 300 req/min per user; 1000 req/min per IP |

### 8.2 Authentication Endpoints

| Method | Endpoint | Description | Auth? |
|---|---|---|---|
| POST | `/auth/login` | Authenticate employee, returns JWT | No |
| POST | `/auth/logout` | Invalidate token | Yes |
| POST | `/auth/refresh` | Refresh access token | Refresh token |
| POST | `/auth/change-password` | Force-change password on first login | Yes |

### 8.3 Inventory API

| Method | Endpoint | Description | Role |
|---|---|---|---|
| GET | `/products` | List all products (paginated, filterable) | All |
| POST | `/products` | Create new product | Admin/Manager |
| GET | `/products/:id` | Get product details with stock batches | All |
| PUT | `/products/:id` | Update product details | Admin/Manager |
| GET | `/products/search` | Search by name, SKU, vehicle, barcode | All |
| GET | `/stock` | List all stock entries | All |
| POST | `/stock/bulk` | Add multiple stock entries in one call | Warehouse+ |
| GET | `/stock/:id` | Get specific stock entry detail | All |
| PUT | `/stock/:id` | Update stock entry (location, qty correction) | Manager+ |
| GET | `/locations` | List all Room/Cabinet/Section locations | All |
| POST | `/locations` | Add new location | Admin/Manager |

### 8.4 Billing API

| Method | Endpoint | Description | Role |
|---|---|---|---|
| GET | `/bills` | List bills (filter by type, status, date, party) | Billing+ |
| POST | `/bills` | Create new bill (purchase or sales) | Billing+ |
| GET | `/bills/:id` | Get bill with all line items & payments | Billing+ |
| PUT | `/bills/:id/confirm` | Confirm draft → triggers stock update | Billing+ |
| PUT | `/bills/:id/cancel` | Cancel bill with reversal reason | Manager+ |
| POST | `/bills/:id/payments` | Record payment against bill | Billing+ |
| GET | `/bills/:id/pdf` | Generate & download bill PDF | Billing+ |
| POST | `/bills/:id/share` | Share bill via WhatsApp/Email | Billing+ |
| GET | `/customers` | List customers | Billing+ |
| POST | `/customers` | Create customer | Billing+ |
| GET | `/suppliers` | List suppliers | All |
| POST | `/suppliers` | Create supplier | Manager+ |

### 8.5 Employee & Activity API

| Method | Endpoint | Description | Role |
|---|---|---|---|
| GET | `/employees` | List all employees | Admin |
| POST | `/employees` | Create new employee | Admin |
| PUT | `/employees/:id` | Update employee profile/role | Admin |
| DELETE | `/employees/:id` | Deactivate employee | Admin |
| GET | `/activity-logs` | Fetch activity logs (filterable) | Admin/Manager |
| GET | `/demand-logs` | Fetch unserviced demand from AI agent | Manager+ |

### 8.6 AI & Dashboard API

| Method | Endpoint | Description | Role |
|---|---|---|---|
| GET | `/dashboard/kpis` | Total stock value, pending bills, alerts | All |
| GET | `/dashboard/low-stock` | Products below reorder level | All |
| GET | `/dashboard/top-products` | Top selling products by qty/revenue | Manager+ |
| POST | `/ai/voice/webhook` | Twilio webhook for inbound voice calls | System |
| GET | `/ai/reorder-suggestions` | AI-generated reorder recommendations | Manager+ |
| GET | `/reports/stock` | Stock report (Excel/CSV export) | Manager+ |
| GET | `/reports/sales` | Sales report with date range | Manager+ |

### 8.7 Sample API Request & Response

**`POST /v1/stock/bulk` — Bulk stock addition**

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

```json
{
  "supplier_id": "uuid-supplier-001",
  "bill_reference": "INV-2025-8892",
  "bill_doc_url": "https://s3.../bills/INV-2025-8892.pdf",
  "received_date": "2025-06-01",
  "entries": [
    {
      "product_id": "uuid-product-001",
      "location_id": "uuid-location-004",
      "quantity": 50,
      "cost_price": 120.00,
      "batch_number": "BATCH-A1"
    },
    {
      "product_id": "uuid-product-002",
      "location_id": "uuid-location-007",
      "quantity": 30,
      "cost_price": 200.00
    }
  ]
}
```

**Response `201 Created`:**

```json
{
  "success": true,
  "stock_entries": [
    { "id": "uuid-se-001", "product_id": "uuid-product-001", "quantity": 50 },
    { "id": "uuid-se-002", "product_id": "uuid-product-002", "quantity": 30 }
  ],
  "activity_log_id": "uuid-al-001"
}
```

---

## 9. Dashboard & KPIs

### 9.1 Dashboard Layout

```
┌─────────────────────────────────────────────────────────────────┐
│          SIBMS Dashboard          [User: Admin ▾]  [🔔 3]      │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌───────┐  │
│  │ Total Stock  │ │Pending Bills │ │  Low Stock   │ │Today's│  │
│  │    Value     │ │              │ │    Alerts    │ │ Sales │  │
│  │  ₹14,52,300  │ │  ₹3,20,000  │ │ 12 Products  │ │₹48,500│  │
│  │ ↑ 8% month   │ │  8 overdue   │ │ ⚠ Action req │ │ Bills │  │
│  └──────────────┘ └──────────────┘ └──────────────┘ └───────┘  │
│                                                                  │
│  ┌─────────────────────────┐  ┌──────────────────────────────┐  │
│  │  Sales Trend (30 days)  │  │    Top Selling Products      │  │
│  │     [Line Chart]        │  │  1. Oil Filter HYU-i10  142u │  │
│  │                         │  │  2. Brake Pad MARUTI     98u │  │
│  │                         │  │  3. Air Filter TATA      87u │  │
│  └─────────────────────────┘  └──────────────────────────────┘  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                   Recent Activity Feed                     │  │
│  │  10:23  Raj Kumar added 50 units of OF-1234 (Room A/K2/S3)│  │
│  │  11:05  Priya created SALE-0482 → Ahmed Auto ₹2,960       │  │
│  │  14:10  Voice AI: i10 oil filter query → Served (Room A)  │  │
│  └────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 9.2 KPI Definitions

| KPI | Calculation | Source Table | Refresh |
|---|---|---|---|
| Total Stock Value | `SUM(qty × cost_price)` per active stock_entry | stock_entries | Real-time |
| Pending Bills Value | `SUM(total_amount - paid_amount)` where status IN (PARTIAL, OVERDUE) | bills | Real-time |
| Low Stock Products | `COUNT(*)` where current_qty < reorder_level | stock_entries + products | Real-time |
| Today's Sales | `SUM(total_amount)` where bill_date = today AND bill_type = SALES | bills | Real-time |
| Top Products | `SUM(qty) GROUP BY product_id ORDER BY qty DESC LIMIT 10` | bill_items (30d) | Daily cache |
| Dead Stock | Products with no OUT log in last 90 days | stock_logs | Daily cache |

---

## 10. Deployment Architecture

### 10.1 Infrastructure Overview

| Component | Service | Specs (Recommended) |
|---|---|---|
| Web Server | AWS EC2 / DigitalOcean Droplet | t3.medium (2 vCPU, 4 GB RAM) |
| Database | AWS RDS PostgreSQL / Supabase | db.t3.small + daily backups |
| Cache | AWS ElastiCache Redis / Upstash | 1 GB Redis cluster |
| File Storage | AWS S3 / Cloudflare R2 | 50 GB initial allocation |
| CDN | Cloudflare | Global edge caching |
| Reverse Proxy | Nginx (on same EC2) | SSL termination + load balance |
| CI/CD | GitHub Actions | Auto deploy on main branch |
| Monitoring | PM2 + Sentry + Uptime Robot | Process mgmt + error tracking |

### 10.2 Docker Compose Services

```yaml
services:
  frontend:
    build: ./frontend
    ports: ["3000:3000"]

  backend:
    build: ./backend
    ports: ["4000:4000"]
    environment:
      DATABASE_URL: postgres://...
      REDIS_URL: redis://redis:6379
      JWT_SECRET: [strong-secret]
      TWILIO_ACCOUNT_SID: ...
      OPENAI_API_KEY: ...

  postgres:
    image: postgres:16
    volumes: [postgres_data:/var/lib/postgresql/data]

  redis:
    image: redis:7-alpine

  nginx:
    image: nginx:alpine
    ports: ["80:80", "443:443"]
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./certs:/etc/nginx/certs
```

### 10.3 Environment Variables Reference

| Variable | Description | Required |
|---|---|:---:|
| `DATABASE_URL` | PostgreSQL connection string | ✓ |
| `REDIS_URL` | Redis connection string | ✓ |
| `JWT_SECRET` | JWT signing secret (min 256-bit) | ✓ |
| `TWILIO_ACCOUNT_SID` | Twilio account SID | ✓ |
| `TWILIO_AUTH_TOKEN` | Twilio auth token | ✓ |
| `TWILIO_PHONE_NUMBER` | Twilio phone number for SMS/Voice | ✓ |
| `OPENAI_API_KEY` | OpenAI API key for GPT-4o & Whisper | ✓ |
| `WHATSAPP_ACCESS_TOKEN` | WhatsApp Business API token | ✓ |
| `WHATSAPP_PHONE_NUMBER_ID` | WA Business phone number ID | ✓ |
| `SENDGRID_API_KEY` | SendGrid email API key | ✓ |
| `S3_BUCKET_NAME` | AWS S3 bucket for files | ✓ |
| `S3_REGION` | AWS region | ✓ |
| `S3_ACCESS_KEY_ID` | AWS access key | ✓ |
| `S3_SECRET_ACCESS_KEY` | AWS secret key | ✓ |
| `FRONTEND_URL` | Frontend base URL for CORS | ✓ |

---

## 11. Security Considerations

### 11.1 Authentication & Authorization

- **JWT access tokens:** 15-minute expiry; refresh tokens: 7-day expiry stored in `httpOnly` cookies
- **bcrypt** password hashing with cost factor 12
- **Failed login lockout:** 5 attempts → 15-minute cooldown
- First-login **forced password change** for all new employees
- Every API route guarded by **role-permission middleware**

### 11.2 Data Security

- All data at rest encrypted (**AES-256** at DB/S3 level)
- All traffic over **HTTPS/TLS 1.3** (Nginx enforced)
- SQL injection prevention via **Prisma parameterized queries**
- XSS prevention: React auto-escaping + **CSP headers** via Helmet.js
- **CORS** restricted to known frontend domain(s)
- File uploads: type and size validated, stored in **private S3 bucket** (presigned URLs only)

### 11.3 Audit & Compliance

- **Immutable `activity_logs`** — no update/delete permitted via API
- **Immutable `stock_logs`** — all quantity changes recorded permanently
- Database backups: **daily automated snapshots** with 30-day retention
- GDPR/data privacy: customer PII encrypted at **field level** (phone, email)

---

## 12. Mobile PWA (Warehouse Staff)

### 12.1 PWA Feature Support

| Feature | Online | Offline |
|---|:---:|:---:|
| Barcode scanning (camera) | ✓ | ✓ (queued) |
| Stock lookup by SKU/location | ✓ | ✓ (cached data) |
| Add stock entry | ✓ | ✓ (sync on reconnect) |
| View product location | ✓ | ✓ (cached) |
| Create sales bill | ✓ | ✗ |
| View low-stock alerts | ✓ | ✓ (last sync) |
| Push notifications | ✓ | ✓ (service worker) |

### 12.2 Offline Strategy

- **Service worker** caches product catalog and locations on first load
- Offline stock additions stored in **IndexedDB**, synced to server on reconnect
- **Background Sync API** used for queue management
- Conflict resolution: server timestamp wins; employee notified of conflicts

---

## 13. Development Roadmap

| Phase | Duration | Key Deliverable |
|---|---|---|
| Phase 1 — Foundation | Weeks 1–4 | Auth, DB, Product & Employee core |
| Phase 2 — Core Modules | Weeks 5–10 | Inventory + Billing system live |
| Phase 3 — Automation & AI | Weeks 11–14 | Reminders, Dashboard, Alerts |
| Phase 4 — Voice AI & PWA | Weeks 15–18 | Voice agent + mobile PWA |
| Phase 5 — Testing & Launch | Weeks 19–22 | Production go-live |

### Phase 1 — Foundation (Weeks 1–4)
1. Database schema setup and Prisma migration scripts
2. JWT Authentication and RBAC middleware
3. Employee management CRUD
4. Product catalog and location management
5. Basic React frontend scaffolding with routing

### Phase 2 — Core Modules (Weeks 5–10)
1. Inventory management — add stock, bulk UI, location tracking
2. Billing system — purchase and sales bills with PDF generation
3. Real-time stock sync on bill confirmation
4. Customer and supplier management
5. Activity logging

### Phase 3 — Automation & AI (Weeks 11–14)
1. WhatsApp Business API integration for bill sharing
2. SMS/Email payment reminder automation with BullMQ
3. Dashboard KPIs and charts (Recharts)
4. System AI — low stock alerts, reorder suggestions
5. Barcode/QR scanning integration

### Phase 4 — Voice AI & PWA (Weeks 15–18)
1. Twilio Voice webhook + Whisper STT integration
2. GPT-4o intent extraction and stock lookup for voice queries
3. Demand logging and WhatsApp manager alerts
4. Mobile PWA with offline capabilities
5. Excel/PDF report exports

### Phase 5 — Testing & Launch (Weeks 19–22)
1. End-to-end testing with Playwright
2. Load testing with k6
3. Security audit and penetration testing
4. Staff training and documentation
5. Production deployment and go-live

---

## 14. Appendix

### 14.1 Naming Conventions

| Item | Convention | Example |
|---|---|---|
| Database tables | snake_case, plural | `stock_entries`, `bill_items` |
| DB columns | snake_case | `created_at`, `bill_reference` |
| API endpoints | lowercase, kebab-case | `/bill-items`, `/stock-entries` |
| React components | PascalCase | `BillForm`, `StockTable` |
| React hooks | camelCase with `use` prefix | `useInventory`, `useBilling` |
| Environment vars | SCREAMING_SNAKE_CASE | `DATABASE_URL`, `JWT_SECRET` |
| Bill numbers | TYPE-YYYY-NNNN | `SALE-2025-0482`, `PUR-2025-0011` |
| Employee codes | EMP-NNNN | `EMP-0001`, `EMP-0042` |

### 14.2 Glossary

| Term | Definition |
|---|---|
| SKU | Stock Keeping Unit — unique identifier for each product variant |
| Kabat | Local term for Cabinet — a physical storage unit in the warehouse |
| FIFO | First In, First Out — oldest stock batch is consumed first on sales |
| Reorder Level | Minimum qty threshold below which a restock alert is triggered |
| Bill Reference | Supplier's own invoice or bill number, used for reconciliation |
| Voice AI Agent | Automated phone system using Twilio + Whisper + GPT-4o |
| PWA | Progressive Web App — web app installable on mobile with offline support |
| BullMQ | Redis-backed job queue for background tasks like sending reminders |
| Presigned URL | Time-limited URL for secure, direct access to S3 files |

### 14.3 Key Dependencies

| Package | Version | Purpose |
|---|---|---|
| `express` | ^4.19 | Node.js HTTP server framework |
| `prisma` | ^5.0 | ORM for PostgreSQL |
| `jsonwebtoken` | ^9.0 | JWT creation and verification |
| `bcrypt` | ^5.1 | Password hashing |
| `bullmq` | ^5.0 | Background job queue |
| `twilio` | ^5.0 | SMS, Voice, and WhatsApp |
| `openai` | ^4.0 | GPT-4o + Whisper API client |
| `pdfkit` | ^0.14 | PDF bill generation |
| `exceljs` | ^4.4 | Excel report generation |
| `zod` | ^3.0 | Request validation schema |
| `react` | ^18.3 | Frontend framework |
| `@tanstack/react-query` | ^5.0 | Server state management |
| `recharts` | ^2.0 | Dashboard charts |
| `zustand` | ^4.0 | Client state management |

---

*End of Document — SIBMS v1.0*
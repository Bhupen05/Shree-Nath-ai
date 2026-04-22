# 🚀 IMMEDIATE ACTION PLAN
## What Needs to Be Built - Week by Week

**Project:** Shree-Nath Motors ERP - Core Features  
**Timeline:** 8-10 weeks  
**Created:** April 19, 2026  
**Status:** 🔴 NOT STARTED - Ready for Implementation

---

## 📊 PRIORITY MATRIX

```
CRITICAL (Week 1-4)          IMPORTANT (Week 5-7)      NICE-TO-HAVE (Week 8+)
─────────────────────────────────────────────────────────────────────────
✅ Stock Management           ✅ Reminders System       ✅ Advanced Reports
✅ Bill Management            ✅ Customer Portal        ✅ Multi-location
✅ Stock-Bill Integration     ✅ Analytics              ✅ Supplier Mgmt
✅ QR Code System             ⚠️ AI Voice Agent        ⚠️ Mobile App
✅ Customer Management        ⚠️ Payment Integration   ⚠️ Predictive Stock
```

---

## 📅 WEEK-BY-WEEK BREAKDOWN

---

## WEEK 1-2: FOUNDATION - STOCK MANAGEMENT SYSTEM

### Goal
**Build core inventory system with QR codes and location tracking**

### Backend Tasks

#### Task 1.1: Create MongoDB Collections & Schema
**Owner:** Backend Dev  
**Time:** 2 hours  
**Priority:** 🔴 CRITICAL

```javascript
// File: backend/src/db/migrations/create-collections.js

Create Collections:
1. Products
   - Fields: name, sku, category, costPrice, sellingPrice, gst
   - Indexes: sku (unique), category, createdDate

2. StockBatches
   - Fields: productId, batchId, quantity, room, cabinet, section, qrCode
   - Indexes: productId, batchId (unique), room+cabinet+section

3. InventoryTransactions
   - Fields: type (IN/OUT), productId, quantity, date, relatedDocument
   - Indexes: productId, date (descending), type, relatedDocument

4. QRCodes
   - Fields: code (unique), productId, batchId, location, status
   - Indexes: code (unique), productId, status

Seed test data:
- 5-10 sample products
- A few batches of stock
- Test QR codes
```

**Verification:**
```
- [ ] Collections created in MongoDB
- [ ] Indexes working
- [ ] Test data inserted
- [ ] No duplicate SKUs allowed
```

---

#### Task 1.2: Stock In Endpoint
**Owner:** Backend Dev  
**Time:** 4 hours  
**Priority:** 🔴 CRITICAL

```javascript
// File: backend/src/routes/api/inventory.js

Route: POST /api/inventory/stock-in
Purpose: Record new stock received from supplier

Request Body:
{
  productName: "Oil Filter",
  sku: "OIL-FILTER-i10-001",  // auto-generate if not provided
  category: "Filters",
  quantity: 10,
  costPrice: 250,
  sellingPrice: 350,
  unit: "pcs",
  supplierName: "XYZ Motors Parts",
  invoiceDate: "2026-04-19",
  invoiceNumber: "INV-SUP-2026-001",
  location: {
    room: "Storage-1",
    cabinet: "A",
    section: "Top-Left"
  }
}

Logic:
1. Validate all required fields
2. Check if product exists by SKU
   - If exists: Add to existing product
   - If not exists: Create new product
3. Create stock batch entry
4. Generate QR codes (one per unit or per batch)
5. Update product quantities
6. Create inventory transaction (IN)
7. Return success with QR codes

Response:
{
  success: true,
  product: {
    _id: ObjectId,
    name: "Oil Filter",
    sku: "OIL-FILTER-i10-001",
    currentStock: 10,
    updatedDate: "2026-04-19"
  },
  batch: {
    batchId: "BATCH-2026-001",
    quantity: 10,
    location: { room: "Storage-1", cabinet: "A", section: "Top-Left" },
    qrCodes: ["QR-2026-001-001", "QR-2026-001-002", ...]
  },
  transaction: {
    _id: ObjectId,
    type: "IN",
    quantity: 10,
    date: "2026-04-19 10:30"
  }
}

Error Handling:
- [ ] Duplicate SKU check
- [ ] Location validation (room/cabinet/section required)
- [ ] Quantity > 0 validation
- [ ] Cost > 0 validation
- [ ] Try-catch for DB errors
```

**Tests:**
```
- [ ] Test valid stock in
- [ ] Test duplicate SKU
- [ ] Test invalid location
- [ ] Test batch creation
- [ ] Test QR code generation
- [ ] Test transaction logging
```

---

#### Task 1.3: Stock Out Endpoint (Manual)
**Owner:** Backend Dev  
**Time:** 3 hours  
**Priority:** 🔴 CRITICAL

```javascript
// File: backend/src/routes/api/inventory.js

Route: POST /api/inventory/stock-out
Purpose: Remove stock (manual adjustment, damage, etc.)

Request Body:
{
  productId: ObjectId,
  batchId: "BATCH-2026-001",
  quantity: 2,
  reason: "MANUAL_ADJUSTMENT" | "DAMAGE" | "LOSS" | "BILL",
  relatedBillId: ObjectId (optional, if reason is BILL),
  notes: "Damaged in transit"
}

Logic:
1. Validate product & batch exist
2. Validate quantity ≤ available quantity
3. Reduce batch quantity
4. Update product total quantities
5. Create inventory transaction (OUT)
6. If reason is DAMAGE, mark batch status accordingly
7. Return success

Response:
{
  success: true,
  product: {
    _id: ObjectId,
    name: "Oil Filter",
    currentStock: 8,  // Reduced from 10
  },
  batch: {
    batchId: "BATCH-2026-001",
    quantity: 8,      // Reduced from 10
  },
  transaction: {
    _id: ObjectId,
    type: "OUT",
    quantity: 2,
    reason: "DAMAGE",
    date: "2026-04-19 12:30"
  }
}

Error Handling:
- [ ] Product not found
- [ ] Batch not found
- [ ] Insufficient quantity
- [ ] Invalid reason
```

**Tests:**
```
- [ ] Test valid stock out
- [ ] Test insufficient quantity
- [ ] Test damage recording
- [ ] Test transaction creation
```

---

#### Task 1.4: QR Code Generation
**Owner:** Backend Dev  
**Time:** 3 hours  
**Priority:** 🔴 CRITICAL

```javascript
// File: backend/src/lib/qrcode-generator.js

Function: generateQRCodes(productId, batchId, quantity, location)

Logic:
1. For each unit (or batch), generate unique QR code
   - Format: QR-{TIMESTAMP}-{BATCH}-{SEQUENCE}
   - Example: QR-2026041910-BATCH001-001
2. Encode information in QR:
   {
     productId,
     batchId,
     room: location.room,
     cabinet: location.cabinet,
     section: location.section,
     timestamp: "2026-04-19T10:30:00Z"
   }
3. Generate PNG images
4. Save to file system: /public/qr-codes/{batchId}/
5. Store QR code records in database
6. Return array of QR code URLs

Return:
[
  {
    code: "QR-2026041910-BATCH001-001",
    url: "/public/qr-codes/BATCH001/QR-001.png",
    data: { productId, batchId, location }
  },
  ...
]

Route: GET /api/inventory/qr/generate
Body: { productId, batchId, quantity, location }

Response: 
{
  qrCodes: [...],
  pdfUrl: "/public/qr-codes/BATCH001/labels.pdf"  // Printable
}

Libraries:
- qrcode (npm package)
- canvas or puppeteer (for PDF generation)
```

**Tests:**
```
- [ ] QR code generation
- [ ] Unique codes
- [ ] PNG file creation
- [ ] PDF generation
- [ ] Database storage
```

---

### Frontend Tasks

#### Task 1.5: Inventory Dashboard
**Owner:** Frontend Dev  
**Time:** 5 hours  
**Priority:** 🔴 CRITICAL

```javascript
// File: frontend/src/components/Inventory.jsx

Components:
1. InventoryDashboard (Main container)
   - Show overview stats
   - Search & filter
   - Recent activity

2. InventoryOverview (Stats cards)
   - Total Products: 45
   - Total Quantity: 1,234 units
   - Total Value: ₹5,67,890
   - Categories: 12
   - Low Stock Alerts: 3

3. ProductList (Table)
   - Columns: Name | SKU | Qty | Cost | Selling | Locations | Actions
   - Sort by: Name, Qty, Value
   - Filter by: Category, Low stock, Location
   - Actions: View Details, Edit, Stock In, Stock Out, Print QR

4. ProductCard (Detail modal)
   - Product info
   - All batches & locations
   - QR codes (display + download)
   - Transaction history
   - Price history

5. SearchBar
   - Search by product name
   - Search by SKU
   - Search by location

UI Features:
- [ ] Responsive design
- [ ] Real-time updates (if using WebSocket)
- [ ] Loading states
- [ ] Error messages
- [ ] Empty states

Data Display:
- [ ] Show current stock
- [ ] Show available vs reserved
- [ ] Show location tree (Room → Cabinet → Section)
- [ ] Show QR codes with visual preview
- [ ] Show recent transactions
```

**API Calls:**
```
GET /api/inventory/dashboard → Get overview stats
GET /api/inventory/products → Get all products
GET /api/inventory/search?q=oil → Search products
GET /api/inventory/product/:id → Get product details
GET /api/inventory/transactions → Get recent transactions
```

**Tests:**
```
- [ ] Dashboard loads
- [ ] Search works
- [ ] Filtering works
- [ ] Product details open
- [ ] Real-time updates
```

---

#### Task 1.6: Stock In Form
**Owner:** Frontend Dev  
**Time:** 4 hours  
**Priority:** 🔴 CRITICAL

```javascript
// File: frontend/src/components/StockInForm.jsx

Form Fields:
1. Product Information
   - Product Name (required, searchable dropdown)
   - SKU (auto-generated if new product)
   - Category (required, dropdown)
   - Unit (pcs, ltr, kg, etc.)

2. Stock Details
   - Quantity (required, number)
   - Cost Price per Unit (required)
   - Total Cost (auto-calculated)
   - Selling Price per Unit (optional, suggested)

3. Supplier Information
   - Supplier Name (required)
   - Invoice Number (optional)
   - Invoice Date (required)
   - Invoice File Upload (optional, PDF/image)

4. Location Details
   - Room (required, dropdown with existing rooms)
   - Cabinet/Shelf (required, text input)
   - Section (required, dropdown: Top, Middle, Bottom, Custom)
   - Add Location Button

5. Batch Information
   - Batch ID (auto-generated or manual)
   - Expiry Date (optional, for perishables)

Form Actions:
- Save as Draft
- Save & Generate QR
- Save & Print QR Labels
- Clear Form
- Cancel

Validations:
- [ ] All required fields
- [ ] Quantity > 0
- [ ] Cost > 0
- [ ] Valid date format
- [ ] SKU uniqueness

Success Flow:
1. Form submitted
2. API call to POST /api/inventory/stock-in
3. Success response received
4. Show QR codes generated
5. Option to:
   - Print labels
   - Download PDF
   - View on map
   - Continue adding stock

Errors:
- [ ] Duplicate SKU handling
- [ ] API error handling
- [ ] Validation error display
- [ ] Retry mechanism
```

**Components:**
```
- StockInForm (parent)
- ProductSelector
- LocationSelector
- FileUpload
- SuccessModal (show QR codes)
```

---

#### Task 1.7: QR Code Display & Print
**Owner:** Frontend Dev  
**Time:** 3 hours  
**Priority:** 🔴 CRITICAL

```javascript
// File: frontend/src/components/QRCodeDisplay.jsx

Features:
1. Display QR Codes
   - Show grid of QR codes
   - Each QR shows: Code, Product, Location, Date
   - Click to enlarge
   - Downloadable PNG

2. Print Interface
   - Print all QR codes for batch
   - Print specific QR codes (select checkboxes)
   - Print labels with text (product name, location)
   - Custom label template

3. QR Code Format
   [QR CODE IMAGE] 
   Oil Filter - i10
   Room: Storage-1 | Cabinet: A | Section: Top-Left
   QR-2026041910-BATCH001-001
   Date: 2026-04-19

4. Actions
   - [ ] Download as PDF
   - [ ] Download as ZIP (all PNGs)
   - [ ] Print directly
   - [ ] Email labels
   - [ ] Copy QR code links

Print Options:
- A4 page layout (2x5 labels per page)
- 4x6 label format
- Single QR per page
- Custom grid layout
```

---

### Testing Tasks

#### Task 1.8: Write Unit Tests
**Owner:** Backend Dev  
**Time:** 3 hours  
**Priority:** 🟡 HIGH

```javascript
// File: backend/test/unit/inventory.test.js

Tests to Write:
1. Product Creation
   - [ ] Create new product
   - [ ] Prevent duplicate SKU
   - [ ] Calculate selling price
   - [ ] Set default values

2. Stock Batch Management
   - [ ] Create batch
   - [ ] Add to existing batch
   - [ ] Calculate totals
   - [ ] Validate location

3. Stock Calculations
   - [ ] Add stock increases total
   - [ ] Remove stock decreases total
   - [ ] Available = Total - Reserved - Damaged
   - [ ] Cannot remove more than available

4. QR Code Generation
   - [ ] Unique codes generated
   - [ ] Codes have batch info
   - [ ] Codes are stored in DB
   - [ ] PDF generation works

5. Transaction Logging
   - [ ] IN transaction created
   - [ ] OUT transaction created
   - [ ] Transaction linked to document
   - [ ] Timestamp recorded

Tests Framework: Jest
Coverage Target: 80%+
```

---

## WEEK 3-4: BILL MANAGEMENT & INTEGRATION

### Goal
**Create bills that automatically manage stock in/out**

### Backend Tasks

#### Task 3.1: Create Bill Schema & Model
**Owner:** Backend Dev  
**Time:** 2 hours  
**Priority:** 🔴 CRITICAL

```javascript
// File: backend/src/models/Bill.js

Schema Fields:
- billNumber (String, unique, auto-generated)
- customerId (ObjectId, required)
- vehicleRegNo (String)
- vehicleModel (String)
- items (Array of line items)
- totals (subtotal, tax, discount, final)
- status (DRAFT, PENDING, COMPLETED, PAID)
- paymentStatus (UNPAID, PARTIAL, PAID)
- paymentMethod (CASH, CARD, UPI, CREDIT)
- dates (created, completed, paid)

Indexes:
- billNumber (unique)
- customerId (for quick lookup)
- status (for filtering)
- createdDate (descending)
```

---

#### Task 3.2: Bill Creation Endpoint
**Owner:** Backend Dev  
**Time:** 6 hours  
**Priority:** 🔴 CRITICAL

```javascript
// File: backend/src/routes/api/bills.js

Route: POST /api/bills
Purpose: Create new bill

Request Body:
{
  customerId: ObjectId,
  vehicleRegNo: "DL-01-AB-1234",
  vehicleModel: "Hyundai i10",
  
  items: [
    {
      description: "Oil Filter",
      type: "PARTS",
      productId: ObjectId,
      batchId: "BATCH-2026-001",
      quantity: 1,
      unitPrice: 350
    },
    {
      description: "Oil Change Service",
      type: "LABOR",
      quantity: 1,
      unitPrice: 500
    },
    {
      description: "Alignment Check",
      type: "SERVICE",
      quantity: 1,
      unitPrice: 200
    }
  ]
}

Logic:
1. Validate customer exists
2. Validate all items
3. For PARTS items:
   - Validate product & batch exist
   - Check sufficient quantity available
   - RESERVE quantity (not yet deduct)
4. Calculate totals:
   - Subtotal = Sum of all items
   - Tax = Subtotal × 18% (or configured GST)
   - Final Amount = Subtotal + Tax - Discount
5. Auto-generate bill number (INV-YYYY-XXXXXX)
6. Save bill with status DRAFT
7. Save reserved stock references
8. Return bill with all details

Response:
{
  success: true,
  bill: {
    _id: ObjectId,
    billNumber: "INV-2026-00001",
    customerId: ObjectId,
    items: [...],
    totals: {
      subtotal: 1050,
      tax: 189,
      finalAmount: 1239
    },
    status: "DRAFT"
  }
}

Error Handling:
- [ ] Customer not found
- [ ] Product not found
- [ ] Insufficient stock (check available)
- [ ] Invalid item type
- [ ] Negative prices
```

---

#### Task 3.3: Bill Status Update & Stock Deduction
**Owner:** Backend Dev  
**Time:** 5 hours  
**Priority:** 🔴 CRITICAL

```javascript
// File: backend/src/routes/api/bills.js

Route: PATCH /api/bills/:billId/status
Purpose: Update bill status and trigger stock deduction

Request Body:
{
  newStatus: "COMPLETED" | "PAID" | "CANCELLED"
}

Logic (when status → COMPLETED):
1. Validate bill exists and current status
2. For each PARTS item in bill:
   - Find the stock batch
   - Reduce quantity: batch.quantity -= item.quantity
   - Update product totals:
     * total -= quantity
     * available -= quantity
   - Create InventoryTransaction (OUT)
3. Update bill status to COMPLETED
4. Set completedDate = now
5. Trigger reminders (optional)

Logic (when status → PAID):
1. Validate bill status is COMPLETED
2. Update paymentStatus = PAID
3. Set paidDate = now
4. Cancel any pending reminders
5. Log payment transaction

Logic (when status → CANCELLED):
1. If DRAFT or PENDING:
   - Release reserved stock
   - Delete any reservations
2. If COMPLETED:
   - Reverse stock deduction
   - Put items back in stock
   - Create REVERSAL transaction
3. Update status to CANCELLED

Verification After Update:
- [ ] Stock quantities updated
- [ ] Transactions logged
- [ ] Bill status changed
- [ ] No double-deduction
- [ ] Audit trail complete

Response:
{
  success: true,
  bill: { ...updated bill... },
  stockUpdates: [
    { productId, batchId, oldQty, newQty },
    ...
  ],
  transaction: { _id, type: "OUT", ... }
}
```

---

#### Task 3.4: Bill Search & Retrieval
**Owner:** Backend Dev  
**Time:** 3 hours  
**Priority:** 🟡 HIGH

```javascript
// File: backend/src/routes/api/bills.js

Routes:
1. GET /api/bills → Get all bills (paginated)
   Query params:
   - page: 1
   - limit: 20
   - status: PENDING | COMPLETED | PAID
   - customerId: ObjectId (filter by customer)
   - startDate: 2026-04-01
   - endDate: 2026-04-30

2. GET /api/bills/:billId → Get single bill with details

3. GET /api/customers/:customerId/bills
   → Get all bills for specific customer
   Params:
   - page, limit
   - status (filter)
   - sortBy: date (descending)

4. GET /api/bills/search
   Query params:
   - q: search term (searches billNumber, customerName)
   - type: PENDING | UNPAID | OVERDUE

Response:
{
  bills: [
    {
      _id: ObjectId,
      billNumber: "INV-2026-00001",
      customerId: ObjectId,
      customerName: "John Sharma",
      totalAmount: 1239,
      status: "COMPLETED",
      paymentStatus: "UNPAID",
      createdDate: "2026-04-19",
      dueDate: "2026-04-24"
    },
    ...
  ],
  total: 47,
  page: 1,
  pages: 3
}
```

---

#### Task 3.5: PDF Invoice Generation
**Owner:** Backend Dev  
**Time:** 4 hours  
**Priority:** 🟡 HIGH

```javascript
// File: backend/src/lib/pdf-generator.js

Function: generateInvoicePDF(billId)

Logic:
1. Fetch bill details from DB
2. Fetch customer details
3. Create PDF layout:

   ────────────────────────────────────────
   | SHREE NATH MOTORS                   |
   | Mob: 98765-43210                    |
   ────────────────────────────────────────
   | INVOICE                              |
   | Invoice #: INV-2026-00001           |
   | Date: 2026-04-19                    |
   ────────────────────────────────────────
   | CUSTOMER                             |
   | Name: John Sharma                   |
   | Phone: 98765-43210                  |
   ────────────────────────────────────────
   | VEHICLE                              |
   | Reg: DL-01-AB-1234                  |
   | Model: Hyundai i10                  |
   ────────────────────────────────────────
   | ITEMS                                |
   | Description  | Qty | Price | Total |
   | Oil Filter   | 1   | 350   | 350   |
   | Oil Change   | 1   | 500   | 500   |
   | Alignment    | 1   | 200   | 200   |
   ────────────────────────────────────────
   | SUBTOTAL: 1050                       |
   | TAX (18%): 189                       |
   | DISCOUNT: 0                          |
   | TOTAL: 1239                          |
   ────────────────────────────────────────
   | PAYMENT METHOD: CASH                 |
   | STATUS: PENDING                      |
   ────────────────────────────────────────
   | Thank you for your business!         |
   ────────────────────────────────────────

4. Save PDF to file system: /public/invoices/{billNumber}.pdf
5. Return URL to PDF

Libraries:
- pdfkit or pdf-lib
- For HTML-to-PDF: html2pdf or puppeteer

Route: GET /api/bills/:billId/pdf
Response: PDF file (download or preview)
```

---

### Frontend Tasks

#### Task 3.6: Bill Creation Form
**Owner:** Frontend Dev  
**Time:** 7 hours  
**Priority:** 🔴 CRITICAL

```javascript
// File: frontend/src/components/BillCreationForm.jsx

Components:
1. BillHeader
   - Show bill number (auto)
   - Show bill date
   - Show status (DRAFT)

2. CustomerSection
   - Customer lookup (search by phone/name)
   - Show customer details
   - Show recent bills

3. VehicleSection
   - Select from customer's vehicles
   - OR enter new vehicle details

4. LineItemsSection
   - List of items already added
   - Add new item buttons (Labor / Parts / Other)

5. AddItemModal (for each type)
   LABOR:
   - Description (e.g., "Oil Change Service")
   - Quantity (usually 1)
   - Unit Price
   
   PARTS:
   - Search inventory
   - Select product → Shows available qty & locations
   - Select specific batch
   - Quantity (validate against available)
   - Unit price (pre-filled from product)
   
   OTHER:
   - Description (e.g., "Alignment Check")
   - Quantity
   - Unit Price

6. TotalsSection
   - Subtotal (auto-calculated)
   - Tax breakdown (show calculation)
   - Discount (optional, input field)
   - FINAL TOTAL (large, bold)
   - Show all amounts in currency

7. ActionsSection
   - Save as Draft (blue button)
   - Complete & Print (green button)
   - Cancel (gray button)

Form Validations:
- [ ] Customer selected
- [ ] At least 1 item
- [ ] All prices > 0
- [ ] Sufficient stock for parts

State Management:
- Store form data locally
- Auto-calculate totals on item change
- Disable Complete if any validation fails
- Show loading state on submit

Error Handling:
- [ ] Customer not found
- [ ] Product not in stock
- [ ] Insufficient quantity
- [ ] Network error
- [ ] Validation errors with helpful messages
```

---

#### Task 3.7: Bill List & Details Page
**Owner:** Frontend Dev  
**Time:** 5 hours  
**Priority:** 🔴 CRITICAL

```javascript
// File: frontend/src/pages/modules/BillsPage.jsx

Components:
1. BillsList (Table/Grid view)
   - Columns: Bill # | Date | Customer | Amount | Status | Payment | Actions
   - Filter by status (All, Pending, Completed, Paid)
   - Filter by date range
   - Search by bill number or customer name
   - Sort by date, amount
   - Pagination (20 per page)

2. BillCard (Grid view alternative)
   - Bill number
   - Customer name
   - Date
   - Total amount (prominent)
   - Status badge
   - Payment status badge

3. BillDetailsModal
   - Full bill details
   - Customer info
   - Vehicle info
   - Line items (table)
   - Payment status
   - Change status dropdown
   - Print button
   - Edit button (if DRAFT)
   - Delete button (if DRAFT)

4. BillActions Menu
   - View Details
   - Print / Download PDF
   - Edit (if DRAFT)
   - Change Status (PENDING → COMPLETED → PAID)
   - Send Invoice (email/WhatsApp)
   - Delete (if DRAFT)

UI Features:
- [ ] Responsive table
- [ ] Loading states
- [ ] Empty state message
- [ ] Error handling
- [ ] Success notifications
- [ ] Confirmation dialogs for destructive actions
```

**API Calls:**
```
GET /api/bills → Get bills list
GET /api/bills/:billId → Get bill details
PATCH /api/bills/:billId/status → Update status
GET /api/bills/:billId/pdf → Download PDF
DELETE /api/bills/:billId → Delete bill
```

---

#### Task 3.8: Parts Selection Modal
**Owner:** Frontend Dev  
**Time:** 4 hours  
**Priority:** 🔴 CRITICAL

```javascript
// File: frontend/src/components/PartsSelectionModal.jsx

Features:
1. Search & Filter
   - Search by product name
   - Filter by category
   - Show only items with available stock

2. Product List
   - Product name
   - SKU
   - Available quantity (e.g., "12 available")
   - Selling price
   - Cost price (internal)

3. Click Product → Show Locations
   - "Oil Filter" → Available in:
     - Storage-1, Cabinet A, Section Top (5 units)
     - Storage-1, Cabinet B, Section Middle (7 units)
   - User selects which location/batch to use
   - Shows QR code for batch

4. Select Quantity
   - Input field
   - Validate ≤ available quantity
   - Show remaining after selection

5. Add to Bill
   - Calculate line total
   - Close modal
   - Add item to bill items list

State Management:
- [ ] Search state
- [ ] Selected product state
- [ ] Selected batch state
- [ ] Quantity state
- [ ] Validation state

Optimizations:
- [ ] Debounce search
- [ ] Cache product list
- [ ] Show loading state
```

---

### Integration Tasks

#### Task 3.9: Stock Deduction on Bill
**Owner:** Backend Dev  
**Time:** 3 hours  
**Priority:** 🔴 CRITICAL

**Verification:**
```
Scenario: Create bill with 1 Oil Filter
Initial State:
- Product "Oil Filter" total: 25 units
- Batch "BATCH-001" quantity: 5 units

Steps:
1. Create bill with 1 Oil Filter from BATCH-001
2. Bill status: COMPLETED
3. Trigger stock deduction

Expected Result:
- Product total: 24 units (25 - 1)
- Batch quantity: 4 units (5 - 1)
- InventoryTransaction created (OUT)
- Related to bill ID

Tests:
- [ ] Stock reduced correctly
- [ ] Correct batch reduced
- [ ] Transaction logged
- [ ] Cannot exceed available qty
- [ ] Multiple items from same batch
- [ ] Multiple items from different batches
```

---

## WEEK 5: CUSTOMER MANAGEMENT

### Backend Tasks

#### Task 5.1: Customer Model & Database
**Owner:** Backend Dev  
**Time:** 2 hours  
**Priority:** 🔴 CRITICAL

```javascript
// File: backend/src/models/Customer.js

Fields:
- customerId (String, unique, "CUST-00001")
- name (String)
- phone (String, required for Whatsapp)
- alternatePhone (String)
- email (String)
- address (String)
- city (String)
- gst (String, optional)
- vehicles (Array of ObjectId references)
- preferences (remind channel, language)
- createdDate (Date)

Indexes:
- customerId (unique)
- phone (for SMS/WhatsApp lookup)
- email (for email lookup)
```

---

#### Task 5.2: Customer CRUD Endpoints
**Owner:** Backend Dev  
**Time:** 3 hours  
**Priority:** 🟡 HIGH

```javascript
Routes:
1. POST /api/customers → Create new customer
2. GET /api/customers/:customerId → Get customer details
3. PATCH /api/customers/:customerId → Update customer
4. GET /api/customers/search?q=john → Search customers
5. GET /api/customers/:customerId/bills → Get customer bills
6. GET /api/customers/:customerId/vehicles → Get vehicles
```

---

### Frontend Tasks

#### Task 5.3: Customer Registration Form
**Owner:** Frontend Dev  
**Time:** 4 hours  
**Priority:** 🟡 HIGH

```javascript
Components:
1. Registration Form
   - Name (required)
   - Phone (required, validated)
   - Alternate phone (optional)
   - Email (optional, validated)
   - Address (required)
   - City (required, dropdown)
   - GST (optional)
   - Add Vehicle button

2. Vehicle Section
   - Vehicle registration number
   - Model
   - Year
   - Color
   - Add multiple vehicles

3. Preferences
   - Reminder channel (SMS/Email/WhatsApp)
   - Preferred language

4. Actions
   - Save (auto-generate Customer ID)
   - Cancel
```

---

#### Task 5.4: Customer Portal / Dashboard
**Owner:** Frontend Dev  
**Time:** 5 hours  
**Priority:** 🟡 HIGH

```javascript
// File: frontend/src/pages/CustomerPortal.jsx

Features:
1. Customer Info Section
   - Name, Phone, Email
   - Edit profile link
   - Customer ID (bold, copyable)

2. Vehicles Section
   - List of vehicles
   - Last service date
   - Next service due
   - Add vehicle button

3. Bills Summary
   - Total bills: 47
   - Total spent: ₹45,000
   - Pending amount: ₹2,500

4. Bills List
   - Show all bills for customer
   - Filter: All / Pending / Paid / Overdue
   - Each bill shows:
     - Bill number (clickable → details)
     - Date
     - Amount
     - Status
     - Payment status

5. Bill Details Modal
   - Full invoice details
   - Items list
   - Totals
   - Download/Print option

6. Statistics
   - Average bill amount
   - Most used service
   - Last 6 months spending trend (chart)
```

---

## WEEK 6: REMINDER SYSTEM

### Backend Tasks

#### Task 6.1: Reminder Model & Scheduler
**Owner:** Backend Dev  
**Time:** 4 hours  
**Priority:** 🟡 HIGH

```javascript
// File: backend/src/models/Reminder.js

Fields:
- type (BILL, SERVICE, STOCK)
- relatedId (ObjectId - bill/vehicle/product)
- recipient (phone, email, customerId)
- message (template, subject, body)
- channels (sms, email, whatsapp)
- nextSendDate (Date)
- sentCount (Number)
- status (SCHEDULED, SENT, FAILED, CANCELLED)

// File: backend/src/jobs/reminder-scheduler.js

Cron Job (runs daily at 9 AM):
1. Find all SCHEDULED reminders with nextSendDate ≤ today
2. For each reminder:
   - Prepare message with personalization
   - Send via selected channels
   - Log result
   - Update status
   - Schedule next reminder (if recurring)

Examples:
BILL REMINDER:
- Bill created: 2026-04-19
- Remind on: 2026-04-22, 2026-04-25, 2026-04-27 (3, 6, 8 days)
- Stop if: PAID

SERVICE REMINDER:
- Last service: 2026-03-15
- Remind on: 2026-04-15 (1 month)
- Then: 2026-05-15, 2026-06-15 (monthly)
```

---

#### Task 6.2: SMS Integration (Twilio)
**Owner:** Backend Dev  
**Time:** 3 hours  
**Priority:** 🟡 HIGH

```javascript
// File: backend/src/lib/sms-service.js

Setup:
1. Install: npm install twilio
2. Get Twilio credentials: Account SID, Auth Token, Phone
3. Store in .env file

Function: sendSMS(phoneNumber, message)
Logic:
1. Validate phone number
2. Truncate message to 160 chars (SMS limit)
3. Send via Twilio API
4. Log send attempt
5. Store result in database

Error Handling:
- Invalid phone number
- API rate limiting
- Network errors
- Retry with exponential backoff

Route: POST /api/reminders/send-sms
Body: { phoneNumber, message, reminderId }

Response:
{
  success: true,
  messageId: "SM123456789",
  status: "SENT",
  timestamp: "2026-04-19 10:30"
}

Test:
- [ ] Send test SMS to test number
- [ ] Verify delivery
- [ ] Log in database
```

---

#### Task 6.3: Email Integration
**Owner:** Backend Dev  
**Time:** 2 hours  
**Priority:** 🟡 HIGH

```javascript
// File: backend/src/lib/email-service.js

Setup:
1. Install: npm install nodemailer (or sendgrid)
2. Configure SMTP or SendGrid API

Function: sendEmail(recipient, subject, htmlTemplate, data)
Logic:
1. Render HTML template with data
2. Send via SMTP/SendGrid
3. Log send attempt
4. Store result

Email Templates:
- Bill Due Reminder
- Bill Overdue Reminder
- Service Reminder
- Welcome Email
- Payment Confirmation

Test:
- [ ] Send test email
- [ ] Verify formatting
- [ ] Links work
```

---

#### Task 6.4: WhatsApp Integration
**Owner:** Backend Dev  
**Time:** 3 hours  
**Priority:** 🟡 HIGH

```javascript
// File: backend/src/lib/whatsapp-service.js

Setup:
1. Twilio WhatsApp API
2. Create message templates (pre-approved by WhatsApp)
3. Store template IDs

Function: sendWhatsApp(phoneNumber, templateId, parameters)

Examples:
Template 1: "bill_due_reminder"
Message: "Hi {{1}}, your bill {{2}} for ₹{{3}} is due on {{4}}."
Parameters: [customerName, billNumber, amount, dueDate]

Template 2: "payment_received"
Message: "Hi {{1}}, we received your payment of ₹{{2}}. Thank you!"

Test:
- [ ] Send test WhatsApp message
- [ ] Verify delivery
```

---

### Frontend Tasks

#### Task 6.5: Reminder Settings Dashboard
**Owner:** Frontend Dev  
**Time:** 3 hours  
**Priority:** 🟡 HIGH

```javascript
// File: frontend/src/components/ReminderSettings.jsx

Features:
1. Reminder Configuration
   - Enable/disable by type (BILL, SERVICE, STOCK)
   - Configure timing (1, 3, 7 days before due)
   - Max reminders (before stop)

2. Channels Configuration
   - SMS (checkbox)
   - Email (checkbox)
   - WhatsApp (checkbox)
   - Set preferred channel

3. Templates
   - Show template text
   - Edit templates (with preview)
   - Personalization tags

4. Test Reminder
   - Send test SMS
   - Send test Email
   - Send test WhatsApp
   - Verify delivery

5. Reminder History Log
   - List all sent reminders
   - Filter by type, status, date
   - Show delivery status
   - Resend failed reminders
   - Search by customer/bill
```

---

## WEEK 7-8: AI VOICE AGENT

### Backend Tasks

#### Task 7.1: Twilio Voice Integration
**Owner:** Backend Dev  
**Time:** 5 hours  
**Priority:** 🟡 HIGH

```javascript
// File: backend/src/lib/twilio-voice.js

Setup:
1. Install: npm install twilio
2. Get phone number from Twilio
3. Configure webhook URL

Function: handleIncomingCall(req, res)
Logic:
1. Receive call from Twilio
2. Generate TwiML response (Twilio Markup Language)
3. Record call (optional)
4. Gather user input (speech)

Flow:
Caller → Twilio → Webhook (our server)
↓
Send TwiML response with IVR options
↓
"Welcome to Shree Nath Motors!
 Say what you need:
 - Search for a product
 - Check bill status
 - Reserve a part"
↓
Twilio records speech
↓
Send audio to Whisper (speech-to-text)
↓
Process query with AI
↓
Generate response
↓
Send response to Twilio
↓
TTS converts to audio
↓
Stream to caller

Route: POST /api/voice/webhook
(This is called by Twilio)

Response: TwiML XML
```

---

#### Task 7.2: Speech Recognition (OpenAI Whisper)
**Owner:** Backend Dev  
**Time:** 3 hours  
**Priority:** 🟡 HIGH

```javascript
// File: backend/src/lib/speech-service.js

Setup:
1. Install: npm install openai
2. Get OpenAI API key
3. Store in .env

Function: transcribeAudio(audioUrl)
Logic:
1. Fetch audio from URL (from Twilio)
2. Send to OpenAI Whisper API
3. Get transcription text
4. Return text with confidence

Response:
{
  text: "I need oil filter for i10",
  confidence: 0.95,
  language: "en"
}

Error Handling:
- Low confidence → Ask user to repeat
- No speech detected
- Audio quality issues
```

---

#### Task 7.3: Natural Language Processing (Intent Recognition)
**Owner:** Backend Dev  
**Time:** 5 hours  
**Priority:** 🟡 HIGH

```javascript
// File: backend/src/lib/ai-intent-processor.js

Setup:
1. Option A: Use OpenAI GPT-4 (easy, requires API)
2. Option B: Use fine-tuned LLaMA (free, local, harder setup)

Intents to Recognize:
1. PRODUCT_SEARCH
   Input: "oil filter for i10"
   Extract: productName="oil filter", vehicle="i10"
   Query DB: Find oil filters for i10
   Response: Product details + Locations + Availability

2. PRODUCT_SEARCH_BY_CATEGORY
   Input: "How many filters do you have?"
   Extract: category="filters"
   Response: All filters + Quantities

3. CHECK_AVAILABILITY
   Input: "Do you have oil filter in stock?"
   Extract: productName="oil filter"
   Response: Available qty + Locations

4. PRICE_CHECK
   Input: "How much for oil filter?"
   Extract: productName="oil filter"
   Response: Selling price

5. RESERVE_PRODUCT
   Input: "Reserve 2 oil filters for me"
   Extract: productName, qty=2, customerId (from phone)
   Response: Reservation confirmation + Reference ID + Validity

6. BILL_STATUS
   Input: "What's my bill status?"
   Extract: customerId (from phone)
   Response: Pending bills + Amounts + Due dates

7. FALLBACK
   Input: Unknown query
   Response: "Sorry, I didn't understand. Can you repeat?"

Function: processIntent(text, phoneNumber, callId)
Logic:
1. Call GPT-4 with prompt:
   "User said: '{{text}}'
    Phone: {{phoneNumber}}
    Intent: [PRODUCT_SEARCH | AVAILABILITY | ...]
    Extracted entities: ..."
    
2. Parse response
3. Execute corresponding action (DB query)
4. Generate response

Response:
{
  intent: "PRODUCT_SEARCH",
  confidence: 0.92,
  entities: {
    productName: "oil filter",
    vehicle: "i10"
  },
  results: [
    { productId, name, qty, locations, price }
  ],
  responseText: "Yes, we have 12 oil filters...",
  nextAction: "WAIT_FOR_RESPONSE"
}
```

---

#### Task 7.4: Text-to-Speech (Response Generation)
**Owner:** Backend Dev  
**Time:** 2 hours  
**Priority:** 🟡 HIGH

```javascript
// File: backend/src/lib/tts-service.js

Setup:
1. Option A: Google gTTS (free)
2. Option B: AWS Polly (paid, better quality)
3. Option C: Azure TTS (paid)

Function: textToSpeech(text, language="en-IN")
Logic:
1. Convert text to speech
2. Save audio file
3. Return audio URL (for Twilio)

Example:
text: "Yes, we have 12 oil filters in stock..."
↓
Generate MP3
↓
Save to /public/audio/tts-{callId}-{timestamp}.mp3
↓
Return: https://example.com/audio/tts-12345.mp3

Twilio uses this URL to stream audio to caller

Libraries:
- gtts (Google)
- aws-sdk (AWS Polly)
- @microsoft/cognitiveservices-speech (Azure)
```

---

#### Task 7.5: AI Agent Conversation Management
**Owner:** Backend Dev  
**Time:** 4 hours  
**Priority:** 🟡 HIGH

```javascript
// File: backend/src/models/VoiceConversation.js

Fields:
- callId (String, unique)
- phoneNumber (String)
- customerId (ObjectId, optional)
- startTime (Date)
- endTime (Date)
- duration (Number, seconds)
- transcript (String)
- messages (Array of exchanges)
- intent (String)
- action (What was done: SEARCH, RESERVE, CHECK)
- result (Success, Fallback, Error)
- recordings (Array of audio URLs)

Store each interaction:
1. User says something
2. STT converts to text
3. NLP identifies intent
4. DB query executed
5. Response generated
6. TTS converts to audio
7. Audio sent to caller
8. Entire exchange logged

Conversation Flow:
[
  {
    userInput: "I need oil filter for i10",
    userInputAudio: "url-to-audio",
    processedText: "I need oil filter for i10",
    intent: "PRODUCT_SEARCH",
    dbQuery: { ... },
    systemResponse: "Yes we have 12 oil filters...",
    responseAudio: "url-to-audio",
    timestamp: "2026-04-19 10:30:45"
  },
  {
    userInput: "Yes reserve 2 for me",
    ...
  }
]
```

---

#### Task 7.6: Knowledge Base Queries
**Owner:** Backend Dev  
**Time:** 3 hours  
**Priority:** 🟡 HIGH

```javascript
// File: backend/src/lib/knowledge-base.js

DB Queries for AI Agent:
1. searchProductByName(query)
2. searchProductByCategory(category)
3. getProductAvailability(productId)
4. getProductLocation(productId)
5. getProductPrice(productId)
6. getCustomerBills(phoneNumber)
7. getCustomerPendingBills(phoneNumber)
8. createReservation(productId, quantity, phoneNumber)
9. checkReservationStatus(reservationId)
10. getServiceDueDate(phoneNumber)

Each query returns formatted data for voice response
```

---

### Testing & Integration

#### Task 7.7: Voice Call Testing
**Owner:** Backend Dev + Frontend Dev  
**Time:** 4 hours  
**Priority:** 🟡 HIGH

```
Test Scenarios:

1. Basic Product Search
   Call → "I need oil filter for i10"
   Expected: "Yes, we have 12 units in Storage-1-A"
   
2. Availability Check
   Call → "Do you have spark plugs?"
   Expected: "We don't have spark plugs in stock"
   
3. Price Query
   Call → "How much for oil filter?"
   Expected: "Oil filter costs 350 rupees"
   
4. Reservation
   Call → "Reserve 2 air filters"
   Expected: "Done. Reference RES-12345. Valid till 6 PM"
   
5. Bill Status
   Call → "What's my bill status?"
   Expected: "You have 1 pending bill of 1189 rupees"
   
6. Multiple Turns
   - User asks question 1
   - System responds
   - User says something else
   - System responds again
   - Test full conversation flow

Test Tools:
- [ ] Call the system from test phone
- [ ] Verify speech recognition
- [ ] Verify intent matching
- [ ] Verify DB queries
- [ ] Verify voice response
- [ ] Check logs & transcript
```

---

## FINAL VERIFICATION

### Week 9: Integration & QA

#### Task 9.1: End-to-End Testing
```
Test Scenarios:

1. Complete Stock to Bill Flow
   - Add stock (Stock In)
   - Create bill with that stock
   - Verify stock reduced
   - Check bill created
   - Verify customer can see bill
   - Send reminder to customer
   - Verify reminder sent

2. AI Agent End-to-End
   - Call system
   - Ask about stock
   - Get correct response
   - Verify location shown
   - Make reservation
   - Verify system creates reservation
   - Check DB for confirmation

3. Customer Portal
   - Register new customer
   - Create bill for customer
   - View bill in portal
   - Download/print invoice
   - Check bill status updates
```

---

## 📊 IMPLEMENTATION SUMMARY

### By Week:
- **Week 1-2:** Stock management + QR codes
- **Week 3-4:** Bills + stock integration
- **Week 5:** Customer management
- **Week 6:** Reminders (SMS/Email/WhatsApp)
- **Week 7-8:** AI voice agent
- **Week 9:** Testing & bugfixes
- **Week 10:** Deployment & training

### Database Collections to Create:
- [ ] Products
- [ ] StockBatches
- [ ] InventoryTransactions
- [ ] QRCodes
- [ ] Bills
- [ ] Customers
- [ ] Vehicles
- [ ] Reminders
- [ ] VoiceConversations

### Backend Routes (30+):
- [ ] Inventory endpoints (8)
- [ ] Bill endpoints (8)
- [ ] Customer endpoints (6)
- [ ] Reminder endpoints (4)
- [ ] Voice agent endpoints (4)

### Frontend Components (20+):
- [ ] Inventory dashboard
- [ ] Stock in/out forms
- [ ] Bill creation & management
- [ ] Customer management
- [ ] Reminder configuration
- [ ] Voice agent testing

---

**STATUS: Ready for Implementation**

Start with Week 1-2 (Stock System). This is the foundation everything else depends on.

Next: Begin Task 1.1 (Create MongoDB collections)

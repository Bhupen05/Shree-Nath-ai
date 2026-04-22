# 🏗️ SHREE-NATH ERP - CORE FEATURES ARCHITECTURE
## Complete System Design Document (April 19, 2026)

---

## 📋 EXECUTIVE SUMMARY

You are building an **Automotive Service Management ERP** that tracks inventory with precision, manages bills with stock integration, and uses AI voice agents for customer interactions.

### What You Want to Build:
```
✅ Stock Management
   - Track items with QR codes (Room/Cabinet/Section)
   - Link stock to bills (auto-deduction)
   - Maintain stock levels per product
   - Log all incoming/outgoing transactions

✅ Bill Management  
   - Create bills with Parts/Labor/Other charges
   - Automatically reduce stock when parts used
   - Calculate totals, tax, discounts
   - Track payment status
   - Send reminders (SMS/WhatsApp/Email)

✅ Customer Management
   - Unique customer IDs
   - Vehicle tracking per customer
   - Complete bill history
   - Show complete & pending bills
   - Customer dashboard/portal

✅ AI Voice Agent
   - Answer phone calls
   - Process queries like: "I need oil filter for i10"
   - Check stock availability
   - Show location: "Room 2, Cabinet A, Section 3"
   - Reserve items
   - Answer: "We have 3 in stock at 350 rupees each"

✅ Reminder System
   - SMS reminders for due bills
   - WhatsApp templates
   - Email notifications
   - Service reminders
   - Stock alerts
```

---

## 🗄️ DATABASE DESIGN (Core Collections)

### 1. Products (Stock Items)
```javascript
{
  _id: ObjectId,
  name: "Oil Filter",
  sku: "OIL-FILTER-i10-001",
  category: "Filters",
  
  // Current stock
  stockSummary: {
    total: 15,           // 15 units total
    available: 12,       // 12 available to sell
    reserved: 2,         // 2 reserved in pending bills
    damaged: 1           // 1 damaged/unusable
  },
  
  // Each batch of stock has location
  stockBatches: [
    {
      batchId: "BATCH-2026-001",
      quantity: 5,
      room: "Storage-1",
      cabinet: "A",
      section: "Top-Left",
      qrCode: "QR-2026-001-A",
      dateAdded: "2026-04-01",
      expiryDate: null,
      status: "available"
    },
    {
      batchId: "BATCH-2026-002",
      quantity: 7,
      room: "Storage-1",
      cabinet: "B",
      section: "Middle",
      qrCode: "QR-2026-002-B",
      dateAdded: "2026-04-10",
      expiryDate: null,
      status: "available"
    },
    {
      batchId: "BATCH-2026-003",
      quantity: 3,
      room: "Storage-2",
      cabinet: "A",
      section: "Bottom",
      qrCode: "QR-2026-003-A",
      dateAdded: "2026-04-15",
      expiryDate: "2026-06-01",
      status: "available"
    }
  ],
  
  // Pricing
  costPrice: 250,        // Cost from supplier
  sellingPrice: 350,     // Price to customer
  gst: 18,              // Tax percentage
  
  // Track when added to system
  createdDate: "2026-03-15",
  lastModified: "2026-04-19"
}
```

**Key Features:**
- Stock divided into **batches** by location
- Each batch has a **unique QR code**
- Track **available vs reserved** qty
- Know exactly **where every item is**

---

### 2. Bills (Invoices)
```javascript
{
  _id: ObjectId,
  billNumber: "INV-2026-00001",  // Auto-generated
  
  // Customer info
  customerId: ObjectId,
  customerName: "John Sharma",
  customerPhone: "+91-98765-43210",
  
  // Vehicle info
  vehicleRegNo: "DL-01-AB-1234",
  vehicleModel: "Hyundai i10",
  
  // Line items (what's on the bill)
  items: [
    {
      description: "Oil Filter",
      type: "PARTS",
      quantity: 1,
      unitPrice: 350,
      totalPrice: 350,
      
      // Link to product & stock
      productId: ObjectId,
      batchId: "BATCH-2026-001",
      qrCode: "QR-2026-001-A",
      stockDeducted: true    // ✅ Stock reduced!
    },
    {
      description: "Oil Change Service",
      type: "LABOR",
      quantity: 1,
      unitPrice: 500,
      totalPrice: 500,
      stockDeducted: null    // No stock for labor
    },
    {
      description: "Alignment Check",
      type: "SERVICE",
      quantity: 1,
      unitPrice: 200,
      totalPrice: 200,
      stockDeducted: null
    }
  ],
  
  // Totals
  totals: {
    partsCost: 350,
    laborCost: 500,
    serviceCost: 200,
    subtotal: 1050,
    gst: 189,              // 18% of 1050
    discount: 50,          // If any
    finalAmount: 1189
  },
  
  // Status tracking
  status: "COMPLETED",              // DRAFT → PENDING → COMPLETED → PAID
  paymentStatus: "UNPAID",          // UNPAID → PARTIAL → PAID
  paymentMethod: "CASH",            // CASH / CARD / UPI / CREDIT
  
  // Dates
  createdDate: "2026-04-19 10:30",
  completedDate: "2026-04-19 12:30",
  paidDate: null
}
```

**Key Features:**
- Auto-generated **bill number**
- Parts **linked to stock** with QR codes
- Stock **automatically reduced** when bill created/completed
- Track **payment status**
- Show **labor + parts + service** separate

---

### 3. Customers
```javascript
{
  _id: ObjectId,
  customerId: "CUST-00001",         // Auto-generated
  
  // Personal info
  name: "John Sharma",
  phone: "+91-98765-43210",
  alternatePhone: "+91-87654-32109",
  email: "john@email.com",
  address: "123 Main Street, Delhi",
  
  // Vehicles they own
  vehicles: [
    {
      registrationNo: "DL-01-AB-1234",
      model: "Hyundai i10",
      year: 2020,
      color: "White",
      lastServiceDate: "2026-03-15",
      nextServiceDue: "2026-06-15"
    },
    {
      registrationNo: "DL-01-CD-5678",
      model: "Toyota Fortuner",
      year: 2022,
      color: "Black",
      lastServiceDate: "2026-02-01",
      nextServiceDue: "2026-05-01"
    }
  ],
  
  // All bills for this customer
  bills: [
    { billId: ObjectId, date: "2026-04-19", amount: 1189, status: "PENDING" },
    { billId: ObjectId, date: "2026-03-15", amount: 2500, status: "PAID" },
    { billId: ObjectId, date: "2026-02-01", amount: 800, status: "PAID" }
  ],
  
  // Statistics
  stats: {
    totalBills: 47,
    totalSpent: 45000,
    averageBillAmount: 958,
    lastBillDate: "2026-04-19",
    lastBillAmount: 1189
  },
  
  // Preferences
  preferences: {
    preferredReminder: "SMS",        // SMS / EMAIL / WHATSAPP
    language: "EN"
  },
  
  // Registration
  registeredDate: "2025-01-15"
}
```

**Key Features:**
- **Unique customer ID** (starts with CUST-)
- Multiple **vehicles per customer**
- **Complete bill history**
- Show **completed & pending bills**
- Track **spending patterns**

---

### 4. Stock Transactions (Audit Trail)
```javascript
{
  _id: ObjectId,
  type: "IN",                        // IN / OUT / ADJUSTMENT
  
  // What moved
  productId: ObjectId,
  productName: "Oil Filter",
  quantity: 5,
  
  // Where it went/came from
  fromLocation: null,                // Where from (for OUT)
  toLocation: {
    room: "Storage-1",
    cabinet: "A",
    section: "Top-Left"
  },
  
  // Why it moved
  relatedDocument: {
    type: "BILL",
    billNumber: "INV-2026-00001",
    billId: ObjectId
  },
  
  // Cost impact
  costPerUnit: 250,
  totalCost: 1250,
  
  // Metadata
  date: "2026-04-19 10:30",
  createdBy: "admin",                // User who recorded it
  notes: "Oil filter for bill INV-2026-00001"
}
```

---

## 🔄 CORE FLOWS

### Flow 1: Stock Incoming (New Stock Received)
```
Step 1: Receive Supplier Bill
        ↓
Step 2: Create "Stock Incoming" Entry
        - Select Product (Oil Filter)
        - Quantity: 10 units
        - Cost: 250 each (2500 total)
        - Supplier: XYZ Parts
        - Invoice date: 2026-04-19
        ↓
Step 3: System Generates QR Codes
        - Create 10 unique QR codes (or batch)
        - Print labels with QR + location
        ↓
Step 4: Physical Stock Stored
        - Place 10 Oil Filters in Storage-1, Cabinet A, Top-Left
        - Scan QR code to confirm (optional)
        ↓
Step 5: Stock Available
        - Product "Oil Filter" now has +10 units
        - visible in Inventory Dashboard
        - Available for bills

UPDATE IN DB:
Product.stockSummary.total: 15 → 25
Product.stockBatches: Add new batch with 10 units
InventoryTransaction: Create IN record
```

---

### Flow 2: Bill Creation (Customer comes in)
```
Step 1: Create New Bill
        ↓
Step 2: Enter Customer Details
        - Name: John Sharma
        - Vehicle: DL-01-AB-1234 (Hyundai i10)
        - Phone: 98765-43210
        ↓
Step 3: Add Items to Bill
        
        ITEM 1: Oil Filter (PARTS)
        - Search Inventory → Find "Oil Filter"
        - Qty: 1 @ 350 each
        - System shows: "12 available in Stock-1-A"
        - Select batch: BATCH-2026-001 (5 units there)
        - Item added with QR code linked
        
        ITEM 2: Oil Change Service (LABOR)
        - Description: "Oil Change Service"
        - Qty: 1 @ 500
        - No stock link (it's labor, not physical)
        
        ITEM 3: Other Charge (OTHER)
        - Description: "Alignment Check"
        - Qty: 1 @ 200
        - No stock link
        ↓
Step 4: System Calculates
        - Subtotal: 350 + 500 + 200 = 1050
        - Tax (18%): 189
        - Discount (if any): 0
        - TOTAL: 1189
        ↓
Step 5: Save Bill (DRAFT)
        - Bill created with status DRAFT
        - Stock NOT yet reduced
        ↓
Step 6: Mark Complete
        - Status: COMPLETED
        - TRIGGER: Auto-reduce stock!
        
UPDATE IN DB:
Product "Oil Filter":
  stockBatches[0].quantity: 5 → 4 (one removed)
  stockSummary.total: 25 → 24
  stockSummary.available: 12 → 11
  
InventoryTransaction: Create OUT record
  - Type: OUT
  - Product: Oil Filter
  - Qty: 1
  - Related: Bill INV-2026-00001
  - Timestamp: 2026-04-19 12:30
        ↓
Step 7: Payment
        - Customer pays 1189
        - Mark as PAID
        - Print invoice
```

---

### Flow 3: AI Voice Agent Call
```
Customer Calls: +91-XXXX-XXXX

SYSTEM:
↓
"Welcome to Shree Nath Motors! How can I help you?"

CUSTOMER:
"I need an oil filter for my i10 car"
(Voice recorded + converted to text by Whisper AI)

SYSTEM NLP PROCESSING:
↓
- Intent: "SEARCH_PRODUCT"
- Entity: Product = "oil filter"
- Entity: Vehicle = "i10 car"
- Query DB:
  • Find: Oil filters compatible with i10
  • Current stock: 12 units available
  • Locations: 5 in Storage-1-A, 7 in Storage-1-B
  • Price: 350 per unit
↓
RESPONSE (Text-to-Speech):
"Yes, we have oil filters for i10 in stock!
 12 units available.
 Location 1: Storage Room 1, Cabinet A, Top Shelf - 5 units
 Location 2: Storage Room 1, Cabinet B, Middle - 7 units
 Price: 350 rupees per unit.
 Would you like me to reserve one for you?"

CUSTOMER:
"Yes, reserve 2 for me"

SYSTEM:
↓
- Create reservation record
- Stock updated: available 12 → 10, reserved +2
- Response: "Done! 2 units reserved for John Sharma.
             Valid until today 6 PM.
             Reference: RES-12345
             Please visit us to complete purchase. Thank you!"
↓
FOLLOW-UP:
- Send SMS: "2 Oil filters reserved. Valid till 6 PM. Ref: RES-12345"
- Log conversation in database
- Create follow-up reminder for 5 PM
```

---

### Flow 4: Reminder System
```
BILL CREATED:
Bill: INV-2026-00001
Amount: 1189
Customer: John Sharma
Phone: 98765-43210
Status: PENDING
Due Date: 2026-04-24 (5 days)

REMINDER SCHEDULER (Daily 9 AM):
↓
Check all pending bills
↓
Bill INV-2026-00001:
- Created: 2026-04-19
- Due: 2026-04-24
- Days remaining: 5 days

ON DAY 3 (2026-04-22):
- Send Reminder
- Channel: SMS (customer preference)
- Message: "Hi John, your bill INV-2026-00001 for Rs.1189 
           is due in 2 days. Please pay at your earliest convenience."
- Log: SMS sent successfully

ON DAY 5 (2026-04-24):
- Bill unpaid & due date reached
- Send urgent reminder
- Message: "Hi John, your bill INV-2026-00001 for Rs.1189 
           is now DUE. Please pay immediately."

ON DAY 7 (2026-04-26):
- Bill 2 days overdue
- Send final reminder
- Try WhatsApp template (if SMS failed)

IF PAID:
- Status: PAID
- Stop all reminders
- Send receipt

REMINDERS LOGGED:
ScheduledReminder {
  billId: ObjectId,
  customerId: ObjectId,
  date: "2026-04-22",
  channel: "SMS",
  message: "...",
  status: "SENT",
  deliveryTime: "2026-04-22 09:15"
}
```

---

## 🎯 IMMEDIATE IMPLEMENTATION (Next 2 Weeks)

### Backend to Build:

#### 1. Stock In Endpoint (POST /api/inventory/stock-in)
```javascript
POST /api/inventory/stock-in
Body: {
  productName: "Oil Filter",
  sku: "OIL-FILTER-i10-001",
  quantity: 10,
  costPrice: 250,
  supplierName: "XYZ Parts",
  invoiceDate: "2026-04-19",
  
  location: {
    room: "Storage-1",
    cabinet: "A",
    section: "Top-Left"
  }
}

Response: {
  success: true,
  product: { _id, name, sku, ... },
  qrCodes: ["QR-001", "QR-002", ..., "QR-010"],
  transaction: { _id, type: "IN", qty: 10, ... }
}
```

#### 2. Stock Out / Bill Creation Endpoint (POST /api/bills)
```javascript
POST /api/bills
Body: {
  customerId: ObjectId,
  vehicleRegNo: "DL-01-AB-1234",
  
  items: [
    {
      type: "PARTS",
      productId: ObjectId,
      batchId: "BATCH-2026-001",
      quantity: 1,
      unitPrice: 350
    },
    {
      type: "LABOR",
      description: "Oil Change",
      quantity: 1,
      unitPrice: 500
    }
  ]
}

Response: {
  billId: ObjectId,
  billNumber: "INV-2026-00001",
  status: "COMPLETED",
  stockDeducted: true,
  totalAmount: 1189
}
```

#### 3. QR Code Generation (GET /api/inventory/qr/:productId)
```javascript
GET /api/inventory/qr/BATCH-2026-001/quantity/10

Response: {
  qrCodes: [
    { code: "QR-2026-001-01", productId, batchId, ... },
    { code: "QR-2026-001-02", productId, batchId, ... },
    ...
  ],
  pdfLink: "https://example.com/qr-codes-batch-001.pdf"
}
```

#### 4. Customer Lookup (GET /api/customers/bills/:customerId)
```javascript
GET /api/customers/CUST-00001/bills

Response: {
  customer: { _id, name, phone, ... },
  bills: [
    { billNumber, date, amount, status: "PENDING", ... },
    { billNumber, date, amount, status: "PAID", ... }
  ]
}
```

#### 5. AI Voice Handler (POST /api/ai-agent/call)
```javascript
POST /api/ai-agent/call
Body: {
  query: "I need oil filter for i10",
  phoneNumber: "+91-98765-43210",
  callId: "CALL-12345"
}

Response: {
  intent: "PRODUCT_SEARCH",
  results: [
    {
      product: "Oil Filter",
      quantity: 12,
      price: 350,
      locations: [...],
      canReserve: true
    }
  ],
  voiceResponse: "Yes, we have 12 oil filters...",
  nextAction: "WAIT_FOR_RESPONSE"
}
```

---

### Frontend to Build:

#### 1. Inventory Dashboard
- Show total stock by category
- Quick search by product name
- Show each product with available qty
- Show locations (Room, Cabinet, Section)
- Show QR codes (display + print)

#### 2. Stock In Form
- Select/create product
- Enter quantity & cost
- Assign location (Room/Cabinet/Section)
- Upload supplier bill (PDF)
- Auto-generate QR codes
- Print QR labels

#### 3. Bill Creation Form
- Customer lookup
- Vehicle selection
- Add items:
  - Labor items (text input)
  - Parts items (search + select from inventory)
  - Other charges (text)
- Real-time total calculation
- Save as DRAFT / COMPLETE
- Print PDF invoice

#### 4. Customer Portal
- Search customer by phone/name
- Show all bills for customer
- Filter by date/status/amount
- Download/print bill
- Show vehicle list

#### 5. AI Agent Testing UI
- Test text queries
- See NLP results
- Mock voice responses
- Conversation history

---

## ✅ SUCCESS CHECKLIST (Week 1-2)

### Database Setup
- [ ] Product schema finalized
- [ ] Bill schema finalized
- [ ] Customer schema finalized
- [ ] Transaction log schema
- [ ] All collections created
- [ ] Indexes created for performance

### Backend APIs
- [ ] Stock In endpoint working
- [ ] Stock Out endpoint working
- [ ] QR code generation working
- [ ] Bill creation with auto-stock-deduction
- [ ] Customer bill history endpoint
- [ ] Inventory search endpoint
- [ ] All tests passing

### Frontend UI
- [ ] Inventory dashboard loads
- [ ] Stock In form works
- [ ] Bill creation form works
- [ ] Customer lookup works
- [ ] PDF generation works
- [ ] QR code display works

### Integration
- [ ] Bill creation → Stock reduced automatically
- [ ] QR codes link to batches
- [ ] Customer bills show properly
- [ ] No data inconsistencies

---

**THIS IS YOUR ROADMAP**

Follow this plan, and you'll have a complete, functional ERP system in 8-10 weeks. Start with Stock + Bills, then add Customers + Reminders, finally AI Voice Agent.

Ready to build?

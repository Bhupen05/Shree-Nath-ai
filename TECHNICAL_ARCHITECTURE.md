# 🔧 TECHNICAL ARCHITECTURE DOCUMENT
## Shree-Nath ERP - Complete System Design

**Document Date:** April 19, 2026  
**Version:** 1.0  
**Status:** Active Planning

---

## 🏛️ SYSTEM OVERVIEW

```
┌─────────────────────────────────────────────────────────────────┐
│                     SHREE-NATH ERP SYSTEM                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Frontend   │  │   AI Voice   │  │   Mobile    │          │
│  │   (React)    │  │   Agent      │  │   App       │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                  │                  │                 │
│         └──────────────────┼──────────────────┘                 │
│                            │                                    │
│                    ┌───────▼────────┐                           │
│                    │   API Gateway  │                           │
│                    │   (Express)    │                           │
│                    └───────┬────────┘                           │
│                            │                                    │
│  ┌─────────────────────────┼─────────────────────────┐          │
│  │                         │                         │          │
│  ▼                         ▼                         ▼          │
│ ┌──────────┐    ┌──────────────────┐    ┌──────────────────┐  │
│ │Inventory │    │    Bill          │    │   Customer      │  │
│ │Service   │    │    Service       │    │   Service       │  │
│ │          │    │                  │    │                 │  │
│ │- Stock   │    │- Create bills    │    │- Manage users   │  │
│ │- QR      │    │- Track payment   │    │- Track vehicles │  │
│ │- Location│    │- Link stock      │    │- History        │  │
│ └────┬─────┘    └────┬─────────────┘    └────┬────────────┘  │
│      │               │                        │                 │
│      └───────────────┼────────────────────────┘                 │
│                      │                                          │
│            ┌─────────▼──────────┐                              │
│            │   Core Services    │                              │
│            │                    │                              │
│            │ - Auth & Roles     │                              │
│            │ - PDF Gen          │                              │
│            │ - QR Gen           │                              │
│            │ - Calculations     │                              │
│            │ - Logging          │                              │
│            └─────────┬──────────┘                              │
│                      │                                          │
│            ┌─────────▼──────────────────────┐                  │
│            │      DATA LAYER               │                  │
│            │                               │                  │
│            │  ┌─────────┐  ┌──────────┐   │                  │
│            │  │ MongoDB │  │  Redis   │   │                  │
│            │  │ (Main   │  │ (Cache)  │   │                  │
│            │  │  DB)    │  └──────────┘   │                  │
│            │  └─────────┘                  │                  │
│            └───────────────────────────────┘                  │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │         BACKGROUND SERVICES & INTEGRATIONS            │  │
│  │                                                        │  │
│  │  ┌──────────┐  ┌──────────┐  ┌─────────────────────┐ │  │
│  │  │ Reminder │  │ SMS/Email│  │ Twilio Voice/SMS   │ │  │
│  │  │Scheduler │  │ Service  │  │ WhatsApp           │ │  │
│  │  │(Cron)    │  │(SendGrid)│  │                     │ │  │
│  │  └──────────┘  └──────────┘  └─────────────────────┘ │  │
│  │                                                        │  │
│  │  ┌──────────────┐         ┌──────────────────────┐   │  │
│  │  │ Whisper AI   │         │ OpenAI / LLaMA      │   │  │
│  │  │(Speech-Text) │         │ (Intent Processing) │   │  │
│  │  └──────────────┘         └──────────────────────┘   │  │
│  │                                                        │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

---

## 📡 DATA FLOW ARCHITECTURE

### Data Flow 1: Stock Reception
```
SUPPLIER → SYSTEM
│
├─ Bill Upload (PDF)
│  └─ Extract: supplier, items, costs, date
│
└─ Create Stock Batch
   ├─ Validate inputs
   ├─ Create product (if new)
   ├─ Create batch entry
   ├─ Generate QR codes
   ├─ Update stock totals
   ├─ Create transaction (IN)
   └─ Store in MongoDB

Database Result:
Products { 
  _id, name, sku, 
  stockBatches: [{ batchId, quantity, room, cabinet, section, qr }],
  currentStock: { total, available, reserved, damaged }
}

InventoryTransactions {
  type: "IN",
  productId, quantity,
  date, supplierName
}
```

### Data Flow 2: Bill Creation & Stock Deduction
```
BILL REQUEST
│
├─ Validate customer
├─ Validate items
│  ├─ For LABOR: Validate price
│  └─ For PARTS: 
│      ├─ Fetch product
│      ├─ Check batch exists
│      ├─ Verify available qty
│      └─ RESERVE quantity
│
├─ Calculate totals
│  ├─ Subtotal = sum(items)
│  ├─ Tax = subtotal × 18%
│  └─ Final = subtotal + tax - discount
│
├─ Save bill to DB
│  └─ Status: DRAFT (stock not yet reduced)
│
└─ On BILL COMPLETION:
   ├─ For each PARTS item:
   │  ├─ Find batch
   │  ├─ Reduce batch.quantity
   │  ├─ Update product totals
   │  ├─ Create transaction (OUT)
   │  └─ Link to bill ID
   │
   ├─ Update bill status: COMPLETED
   └─ Log all changes

Database Result:
Bills {
  billNumber, customerId,
  items: [{ productId, batchId, quantity }],
  status: "COMPLETED",
  totals: { subtotal, tax, final }
}

Products { 
  stockBatches: [{ quantity: reduced }],
  currentStock: { total, available }
}

InventoryTransactions {
  type: "OUT",
  productId, quantity,
  relatedBillId, billNumber
}
```

### Data Flow 3: Customer Bill Tracking
```
CUSTOMER PORTAL REQUEST
│
├─ GET /api/customers/:id/bills
│  └─ Query: Bills { customerId }
│
└─ Return to Customer:
   ├─ Personal info
   ├─ All bills (created, completed, pending, paid)
   ├─ Bill details (items, amounts, dates)
   ├─ Payment status
   ├─ Download/Print options
   └─ Statistics (total spent, last bill, etc.)

Customer Sees:
- Bill INV-2026-00001 | 2026-04-19 | ₹1,189 | COMPLETED | UNPAID
  └─ [View Details] [Download] [Print]
  
- Bill INV-2026-00002 | 2026-04-10 | ₹2,500 | COMPLETED | PAID
  └─ [View Details] [Download] [Print]
```

### Data Flow 4: AI Voice Agent Query
```
PHONE CALL IN
│
├─ Twilio receives call
├─ Webhook to backend: POST /api/voice/webhook
│
├─ TwiML response sent back to Twilio
│  └─ "Welcome to Shree Nath Motors! Say what you need"
│
├─ Caller speaks: "I need oil filter for i10"
├─ Twilio records audio
├─ Webhook: POST /api/voice/process-call
│
├─ Speech Recognition (Whisper AI)
│  ├─ Download audio from Twilio
│  ├─ Send to OpenAI Whisper API
│  └─ Receive text: "I need oil filter for i10"
│
├─ Intent Processing (LLM)
│  ├─ Call OpenAI/LLaMA with text
│  ├─ Identify: intent=PRODUCT_SEARCH, entity=oil filter, vehicle=i10
│  └─ Extract parameters
│
├─ Database Query
│  ├─ Find products matching "oil filter for i10"
│  ├─ Get availability: 12 units
│  ├─ Get locations:
│  │  - Storage-1, Cabinet A, Section Top: 5 units
│  │  - Storage-1, Cabinet B, Section Middle: 7 units
│  └─ Get price: ₹350
│
├─ Response Generation
│  └─ Format natural response:
│     "Yes, we have oil filter for i10 in stock.
│      12 units available.
│      Location 1: Storage Room 1, Cabinet A, Top shelf - 5 units.
│      Location 2: Storage Room 1, Cabinet B, Middle - 7 units.
│      Price: 350 rupees per unit.
│      Would you like to reserve?"
│
├─ Text-to-Speech (gTTS)
│  ├─ Convert response to audio
│  └─ Save MP3 file
│
├─ Stream Audio to Caller
│  ├─ Twilio plays MP3
│  └─ Caller hears response
│
├─ Wait for User Response
│  ├─ "Yes, reserve 2 for me"
│  └─ Loop back to step: Speech Recognition
│
└─ End of Call
   ├─ Save conversation transcript
   ├─ Save all audio files
   ├─ Create VoiceConversation record
   └─ Log all interactions

Database Result:
VoiceConversations {
  callId, phoneNumber, customerId,
  transcript: [
    { userInput, intent, response, timestamp }
  ],
  startTime, endTime, duration,
  action: "PRODUCT_SEARCH",
  result: "SUCCESS"
}

If Reservation Made:
StockReservations {
  reservationId, productId, quantity,
  phoneNumber, customerId,
  createdDate, expiryDate: (today + 8 hours),
  status: "ACTIVE"
}
```

### Data Flow 5: Reminder System
```
SCHEDULED REMINDER JOB (Daily 9 AM)
│
├─ Query: Reminders { status: "SCHEDULED", nextSendDate ≤ today }
│
├─ For each reminder:
│  ├─ Get related document (bill, customer, product)
│  │
│  ├─ Prepare message based on type:
│  │  ├─ BILL_DUE: "Bill {{billNumber}} due on {{date}}"
│  │  ├─ BILL_OVERDUE: "Bill {{billNumber}} is overdue!"
│  │  ├─ SERVICE_DUE: "Service due for {{vehicle}}"
│  │  └─ STOCK_LOW: "{{product}} stock low ({{qty}} left)"
│  │
│  ├─ Select channels (SMS, Email, WhatsApp)
│  │
│  ├─ Send SMS (Twilio)
│  │  ├─ Validate phone number
│  │  ├─ Send message
│  │  └─ Log result
│  │
│  ├─ Send Email (SendGrid/Nodemailer)
│  │  ├─ Render HTML template
│  │  ├─ Send email
│  │  └─ Log result
│  │
│  ├─ Send WhatsApp (Twilio)
│  │  ├─ Use approved template
│  │  ├─ Insert parameters
│  │  └─ Log result
│  │
│  ├─ Update reminder status:
│  │  ├─ status: "SENT"
│  │  ├─ sentCount++
│  │  └─ lastSentDate = now
│  │
│  ├─ Schedule next reminder:
│  │  ├─ If recurring: nextSendDate = now + interval
│  │  └─ If one-time: status = "COMPLETED"
│  │
│  └─ Log interaction
│     └─ ReminderLog {
│           reminderId, date, channel, status, error
│         }

Database Result:
Reminders {
  type: "BILL_DUE",
  billId, customerId,
  nextSendDate: "2026-04-22",
  sentCount: 1,
  status: "SENT",
  lastSentDate: "2026-04-19 09:15"
}

ReminderLogs {
  reminderId, date, channel, status,
  messageId, deliveryStatus
}
```

---

## 🗄️ DATABASE SCHEMA (Complete)

### Collection 1: Products
```javascript
{
  _id: ObjectId,
  
  // Basic Info
  name: "Oil Filter",
  sku: "OIL-FILTER-i10-001",
  category: "Filters",
  subcategory: "Engine",
  unit: "pcs",
  
  // Stock Summary
  stock: {
    total: 25,              // Total in system
    available: 12,          // Available to sell
    reserved: 2,            // Reserved in pending bills
    damaged: 1,             // Damaged/unusable
    inTransit: 10           // Ordered but not received
  },
  
  // Stock Locations (Batches)
  batches: [
    {
      _id: ObjectId,
      batchId: "BATCH-2026-001",
      quantity: 5,
      
      // Location
      location: {
        room: "Storage-1",
        cabinet: "A",
        section: "Top-Left"
      },
      
      // QR & Tracking
      qrCode: "QR-2026-001-A",
      dateAdded: "2026-04-01T10:30:00Z",
      expiryDate: null,
      
      // Status
      status: "available",   // available | reserved | damaged | expired
      
      // Cost
      costPrice: 250,
      totalCost: 1250        // 5 × 250
    },
    {
      batchId: "BATCH-2026-002",
      quantity: 7,
      location: { room: "Storage-1", cabinet: "B", section: "Middle" },
      qrCode: "QR-2026-002-B",
      dateAdded: "2026-04-10T14:00:00Z",
      status: "available",
      costPrice: 250,
      totalCost: 1750
    }
  ],
  
  // Pricing
  costPrice: 250,           // Cost from supplier
  sellingPrice: 350,        // Price to customer
  gst: 18,                  // Tax percentage
  margin: 40,               // Margin %
  
  // Supplier Info
  primarySupplier: {
    supplierId: ObjectId,
    name: "XYZ Motors Parts",
    lastBillDate: "2026-04-19",
    lastOrderDate: "2026-04-19",
    leadTime: 3              // days
  },
  
  // Audit
  createdDate: "2026-03-15T08:00:00Z",
  lastModified: "2026-04-19T10:30:00Z",
  lastPhysicalCount: "2026-04-15T09:00:00Z",
  
  // Metadata
  image: "url-to-image",
  description: "Engine Oil Filter for Hyundai i10",
  manufacturer: "Mahle",
  partNumber: "26300-2B100",
  
  // Track reorder
  reorderLevel: 5,
  reorderQuantity: 20,
  lastReorderDate: "2026-04-19"
}
```

### Collection 2: InventoryTransactions
```javascript
{
  _id: ObjectId,
  
  // Transaction Type
  type: "IN",               // IN | OUT | ADJUSTMENT | RETURN | DAMAGED
  
  // Product Reference
  productId: ObjectId,
  productName: "Oil Filter",
  sku: "OIL-FILTER-i10-001",
  quantity: 5,              // Positive for IN, negative for OUT
  
  // Location
  fromLocation: null,
  toLocation: {
    room: "Storage-1",
    cabinet: "A",
    section: "Top-Left"
  },
  
  // Related Document
  relatedDocument: {
    type: "BILL",           // BILL | PURCHASE_ORDER | ADJUSTMENT | DAMAGE
    id: ObjectId,
    number: "INV-2026-00001"
  },
  
  // Cost
  unitCost: 250,
  totalCost: 1250,          // 5 × 250
  
  // Reason
  reason: "Stock received from supplier",
  notes: "Invoice INV-SUP-2026-001",
  
  // Audit
  date: "2026-04-19T10:30:00Z",
  createdBy: ObjectId,      // User ID
  approvedBy: ObjectId,     // For damage/adjustment
  approvalDate: "2026-04-19T11:00:00Z"
}
```

### Collection 3: Bills
```javascript
{
  _id: ObjectId,
  
  // Bill Identity
  billNumber: "INV-2026-00001",
  billStatus: "COMPLETED",          // DRAFT | PENDING | COMPLETED | PAID | CANCELLED
  
  // Customer
  customer: {
    customerId: ObjectId,
    name: "John Sharma",
    phone: "+91-98765-43210",
    email: "john@example.com",
    address: "123 Main Street, Delhi"
  },
  
  // Vehicle
  vehicle: {
    registrationNo: "DL-01-AB-1234",
    model: "Hyundai i10",
    year: 2020,
    color: "White"
  },
  
  // Line Items
  items: [
    {
      _id: ObjectId,
      description: "Oil Filter",
      type: "PARTS",                // PARTS | LABOR | SERVICE | OTHER
      quantity: 1,
      unitPrice: 350,
      totalPrice: 350,
      
      // For PARTS type
      productId: ObjectId,
      batchId: "BATCH-2026-001",
      qrCode: "QR-2026-001-A",
      stockBatch: {
        previousQty: 5,
        newQty: 4
      },
      stockDeducted: true,
      
      // Timestamps
      addedDate: "2026-04-19T10:30:00Z"
    },
    {
      description: "Oil Change Service",
      type: "LABOR",
      quantity: 1,
      unitPrice: 500,
      totalPrice: 500,
      stockDeducted: null    // N/A for labor
    },
    {
      description: "Car Wash",
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
    gstAmount: 189,           // 18% of 1050
    gstPercent: 18,
    discount: 0,
    discountReason: null,
    finalAmount: 1239,
    amountPaid: 0,
    amountRemaining: 1239
  },
  
  // Payment
  payment: {
    status: "UNPAID",         // UNPAID | PARTIAL | PAID
    method: "CASH",           // CASH | CARD | UPI | CREDIT | CHEQUE
    
    paymentHistory: [
      {
        date: "2026-04-20",
        amount: 600,
        method: "CASH",
        reference: "PAY-00001"
      }
    ]
  },
  
  // Dates
  dates: {
    createdDate: "2026-04-19T10:30:00Z",
    completedDate: "2026-04-19T12:30:00Z",
    paidDate: null,
    dueDate: "2026-04-24T23:59:59Z",
    cancelledDate: null
  },
  
  // Reminders
  reminders: {
    billDueReminders: [ObjectId],   // Reminder IDs
    overdueBillReminders: [ObjectId],
    paymentReminderSent: false,
    lastReminderDate: null
  },
  
  // Notes
  notes: "Customer requested invoice copy via email",
  
  // Invoice & Documents
  invoiceUrl: "https://example.com/invoices/INV-2026-00001.pdf",
  invoiceGeneratedDate: "2026-04-19T10:35:00Z"
}
```

### Collection 4: Customers
```javascript
{
  _id: ObjectId,
  
  // Customer ID
  customerId: "CUST-00001",
  
  // Personal Info
  personal: {
    name: "John Sharma",
    phone: "+91-98765-43210",
    alternatePhone: "+91-87654-32109",
    email: "john@example.com",
    address: "123 Main Street",
    city: "Delhi",
    
    // Business Info (optional)
    gstNumber: "27AABCT1234H1Z0",
    businessName: null
  },
  
  // Vehicles
  vehicles: [
    {
      _id: ObjectId,
      registrationNo: "DL-01-AB-1234",
      model: "Hyundai i10",
      year: 2020,
      color: "White",
      
      // Service tracking
      lastServiceDate: "2026-03-15T10:00:00Z",
      lastServiceAmount: 1500,
      lastServiceDescription: "Regular service",
      
      // Service due
      nextServiceDueDate: "2026-06-15T23:59:59Z",
      serviceIntervalDays: 90,
      serviceIntervalKM: 5000,
      
      // Mileage (optional)
      currentMileage: 45000,
      
      addedDate: "2025-01-15T08:00:00Z"
    }
  ],
  
  // Bill History
  billHistory: [
    {
      billId: ObjectId,
      billNumber: "INV-2026-00001",
      date: "2026-04-19T10:30:00Z",
      amount: 1239,
      status: "COMPLETED",
      paymentStatus: "UNPAID"
    },
    {
      billId: ObjectId,
      billNumber: "INV-2026-00002",
      date: "2026-04-10T09:00:00Z",
      amount: 2500,
      status: "COMPLETED",
      paymentStatus: "PAID",
      paidDate: "2026-04-10T14:30:00Z"
    }
  ],
  
  // Statistics
  stats: {
    totalBills: 47,
    totalSpent: 45000,
    totalPaid: 42500,
    totalUnpaid: 2500,
    averageBillAmount: 958,
    averageBillValue: 958,
    
    // Payment patterns
    lastBillDate: "2026-04-19T10:30:00Z",
    lastBillAmount: 1239,
    lastPaymentDate: "2026-04-10T14:30:00Z",
    lastPaymentAmount: 2500,
    
    // Behavior
    daysAsCustomer: 455,       // Days since first bill
    booksPerMonth: 4,          // Average bookings
    avgPaymentDays: 2,         // Days to pay after bill
    
    // Risk
    overdueCount: 0,
    totalOverdue: 0,
    maxOverdueAmount: 0
  },
  
  // Communication Preferences
  preferences: {
    preferredReminder: "SMS",   // SMS | EMAIL | WHATSAPP
    language: "EN",
    preferredTime: "09:00",     // 24-hour format
    doNotDisturb: {
      enabled: false,
      startTime: "22:00",
      endTime: "08:00"
    },
    subscriptions: {
      billReminder: true,
      serviceReminder: true,
      promotions: false
    }
  },
  
  // Audit
  createdDate: "2025-01-15T08:00:00Z",
  lastModified: "2026-04-19T10:30:00Z",
  lastContactDate: "2026-04-19T10:30:00Z"
}
```

### Collection 5: Reminders
```javascript
{
  _id: ObjectId,
  
  // Type
  type: "BILL_DUE",             // BILL_DUE | BILL_OVERDUE | SERVICE_DUE | STOCK_LOW
  
  // Related Entity
  relatedEntity: {
    entityType: "BILL",         // BILL | CUSTOMER | PRODUCT
    entityId: ObjectId,
    entityNumber: "INV-2026-00001"
  },
  
  // Recipient
  recipient: {
    customerId: ObjectId,
    customerName: "John Sharma",
    phone: "+91-98765-43210",
    email: "john@example.com"
  },
  
  // Message Template
  template: {
    templateId: "BILL_DUE_TEMPLATE",
    subject: "Your Bill {{billNumber}} is Due",
    
    body: "Hi {{customerName}},\n\nYour bill {{billNumber}} " +
          "for ₹{{amount}} is due on {{dueDate}}.\n\n" +
          "Please pay at your earliest convenience.\n\n" +
          "Thank you!"
  },
  
  // Personalized Message
  personalizedMessage: {
    subject: "Your Bill INV-2026-00001 is Due",
    body: "Hi John,\n\nYour bill INV-2026-00001 for ₹1239 " +
          "is due on 2026-04-24.\n\n" +
          "Please pay at your earliest convenience.\n\n" +
          "Thank you!"
  },
  
  // Channels
  channels: {
    sms: true,
    email: true,
    whatsapp: false
  },
  
  // Schedule
  schedule: {
    createdDate: "2026-04-19T10:30:00Z",
    firstScheduledDate: "2026-04-22T09:00:00Z",
    nextSendDate: "2026-04-22T09:00:00Z",
    
    // Recurring
    recurring: true,
    interval: 3,              // days between reminders
    maxReminders: 3,
    
    lastSentDate: null,
    sentCount: 0,
    
    // Execution
    status: "SCHEDULED",      // SCHEDULED | SENT | FAILED | CANCELLED
    error: null
  },
  
  // Send History
  sendHistory: [
    {
      sendDate: "2026-04-22T09:15:00Z",
      channel: "SMS",
      status: "SENT",
      messageId: "SM123456789",
      error: null
    }
  ],
  
  // Conditions
  conditions: {
    stopIfPaid: true,         // Stop if bill is paid
    stopIfCancelled: true,    // Stop if bill is cancelled
    skipWeekends: false
  }
}
```

### Collection 6: VoiceConversations
```javascript
{
  _id: ObjectId,
  
  // Call Identity
  callId: "CALL-2026-04-19-12345",
  
  // Caller
  phoneNumber: "+91-98765-43210",
  customerId: ObjectId,           // Null if not identified
  customerName: null,             // Identified during call
  
  // Call Details
  duration: 180,                  // seconds
  recordingUrl: "url-to-recording",
  
  // Dates
  startTime: "2026-04-19T10:30:00Z",
  endTime: "2026-04-19T10:33:00Z",
  
  // Conversation Flow
  messages: [
    {
      sequence: 1,
      role: "assistant",
      type: "SYSTEM_GREETING",
      
      text: "Welcome to Shree Nath Motors! How can I help you?",
      audioUrl: "url-to-audio",
      timestamp: "2026-04-19T10:30:05Z"
    },
    {
      sequence: 2,
      role: "user",
      type: "USER_QUERY",
      
      userSaidText: "I need oil filter for i10",
      audioUrl: "url-to-audio",
      
      // Processing
      whisperResponse: {
        text: "I need oil filter for i10",
        confidence: 0.95
      },
      
      // Intent
      intentResponse: {
        intent: "PRODUCT_SEARCH",
        confidence: 0.92,
        entities: {
          productName: "oil filter",
          vehicle: "i10"
        }
      },
      
      timestamp: "2026-04-19T10:30:15Z"
    },
    {
      sequence: 3,
      role: "assistant",
      type: "PRODUCT_RESPONSE",
      
      dbQuery: {
        type: "PRODUCT_SEARCH",
        filters: { productName: "oil filter", vehicle: "i10" },
        results: [
          {
            productId: ObjectId,
            name: "Oil Filter for i10",
            sku: "OIL-FILTER-i10-001",
            availability: 12,
            locations: [
              { room: "Storage-1", cabinet: "A", section: "Top", qty: 5 },
              { room: "Storage-1", cabinet: "B", section: "Middle", qty: 7 }
            ],
            price: 350
          }
        ]
      },
      
      text: "Yes, we have oil filter for i10 in stock. 12 units available. " +
            "Location 1: Storage Room 1, Cabinet A, Top shelf - 5 units. " +
            "Location 2: Storage Room 1, Cabinet B, Middle - 7 units. " +
            "Price: 350 rupees per unit. Would you like to reserve?",
      
      audioUrl: "url-to-audio",
      timestamp: "2026-04-19T10:30:25Z"
    },
    {
      sequence: 4,
      role: "user",
      type: "CONFIRMATION",
      
      userSaidText: "Yes, reserve 2 for me",
      audioUrl: "url-to-audio",
      whisperResponse: { text: "Yes, reserve 2 for me", confidence: 0.98 },
      intentResponse: { intent: "MAKE_RESERVATION", entities: { qty: 2 } },
      
      timestamp: "2026-04-19T10:30:35Z"
    },
    {
      sequence: 5,
      role: "assistant",
      type: "CONFIRMATION",
      
      dbQuery: {
        type: "CREATE_RESERVATION",
        productId: ObjectId,
        quantity: 2,
        customerId: ObjectId,
        phoneNumber: "+91-98765-43210",
        expiryTime: "2026-04-19T18:00:00Z"
      },
      
      result: {
        reservationId: "RES-2026-00001",
        status: "SUCCESS"
      },
      
      text: "Great! 2 oil filters reserved for you. Reference number: RES-2026-00001. " +
            "Valid until today 6 PM. Please visit us to complete the purchase. Thank you!",
      
      audioUrl: "url-to-audio",
      timestamp: "2026-04-19T10:30:45Z"
    }
  ],
  
  // Summary
  summary: {
    intent: "PRODUCT_SEARCH",
    action: "RESERVATION",
    status: "SUCCESS",
    queriesAnswered: 1,
    reservationsMade: 1,
    billsChecked: 0
  },
  
  // Flags
  flags: {
    handedOffToAgent: false,
    requiresFollowUp: false,
    sentiment: "POSITIVE"
  }
}
```

---

## 🔌 API ENDPOINTS (Complete List)

### Inventory Endpoints (Base: /api/inventory)
```
1. POST /stock-in
   Purpose: Record new stock
   Body: { productName, sku, quantity, costPrice, location, supplierName }
   Response: { product, batch, qrCodes, transaction }

2. POST /stock-out
   Purpose: Remove stock (manual)
   Body: { productId, batchId, quantity, reason, billId }
   Response: { product, batch, transaction }

3. GET /products
   Purpose: Get all products
   Query: { page, limit, category, search }
   Response: { products, total, pages }

4. GET /product/:id
   Purpose: Get product details
   Response: { product with batches, transactions, history }

5. GET /search
   Purpose: Search products
   Query: { q, category, location }
   Response: { results }

6. GET /qr/generate/:batchId
   Purpose: Get QR codes for batch
   Response: { qrCodes, pdfUrl }

7. GET /transactions
   Purpose: Get transaction history
   Query: { page, limit, type, productId, startDate, endDate }
   Response: { transactions, total }

8. GET /locations
   Purpose: Get all storage locations
   Response: { locations: [{room, cabinets, sections}] }
```

### Bill Endpoints (Base: /api/bills)
```
1. POST /
   Purpose: Create new bill
   Body: { customerId, vehicleRegNo, items }
   Response: { bill }

2. PATCH /:billId/status
   Purpose: Update bill status
   Body: { newStatus }
   Response: { bill, stockUpdates, transaction }

3. PATCH /:billId/payment
   Purpose: Record payment
   Body: { amount, method, date }
   Response: { bill, paymentStatus }

4. GET /
   Purpose: Get bills list
   Query: { page, limit, status, customerId, dateRange }
   Response: { bills, total, pages }

5. GET /:billId
   Purpose: Get bill details
   Response: { bill with full details }

6. GET /:billId/pdf
   Purpose: Download invoice PDF
   Response: { PDF file }

7. DELETE /:billId
   Purpose: Delete bill (DRAFT only)
   Response: { success }
```

### Customer Endpoints (Base: /api/customers)
```
1. POST /
   Purpose: Create customer
   Body: { name, phone, email, address, city }
   Response: { customer }

2. GET /:customerId
   Purpose: Get customer details
   Response: { customer with vehicles and stats }

3. PATCH /:customerId
   Purpose: Update customer
   Body: { name, email, address, preferences }
   Response: { customer }

4. GET /:customerId/bills
   Purpose: Get customer bills
   Query: { page, limit, status }
   Response: { bills, total }

5. GET /:customerId/vehicles
   Purpose: Get customer vehicles
   Response: { vehicles }

6. POST /:customerId/vehicles
   Purpose: Add vehicle for customer
   Body: { registrationNo, model, year, color }
   Response: { vehicle }

7. GET /search
   Purpose: Search customers
   Query: { q }
   Response: { customers }
```

### Reminder Endpoints (Base: /api/reminders)
```
1. GET /settings
   Purpose: Get reminder configuration
   Response: { settings }

2. PATCH /settings
   Purpose: Update reminder settings
   Body: { types, channels, frequencies }
   Response: { settings }

3. POST /test-send
   Purpose: Send test reminder
   Body: { type, recipientPhone, channel }
   Response: { status, messageId }

4. GET /history
   Purpose: Get reminder history
   Query: { page, limit, type, status, dateRange }
   Response: { reminders, total }

5. PATCH /:reminderId/cancel
   Purpose: Cancel a reminder
   Response: { reminder }
```

### Voice Agent Endpoints (Base: /api/voice)
```
1. POST /webhook
   Purpose: Receive incoming call from Twilio
   (Webhook - no authentication needed)
   Response: { TwiML XML }

2. POST /process-call
   Purpose: Process voice call
   Body: { callId, audioUrl, phoneNumber }
   Response: { transcription, intent, response, nextAction }

3. POST /make-reservation
   Purpose: Make reservation during call
   Body: { callId, productId, quantity, phoneNumber }
   Response: { reservationId, expiryTime }

4. GET /conversations
   Purpose: Get call history
   Query: { page, limit, phoneNumber }
   Response: { conversations, total }

5. GET /conversations/:callId
   Purpose: Get call transcript
   Response: { conversation with full transcript }
```

---

## 🔐 Authentication & Authorization

### JWT Token Structure
```javascript
Token Payload:
{
  userId: ObjectId,
  role: "ADMIN" | "STAFF" | "MANAGER" | "CUSTOMER",
  permissions: ["inventory.read", "inventory.write", "bill.create"],
  iat: timestamp,
  exp: timestamp + 24 hours
}

Roles & Permissions:
- ADMIN: All access
- MANAGER: Inventory + Bills + Customers (no deletions)
- STAFF: Inventory (read/write) + Bills (read/create)
- CUSTOMER: Customer portal only
```

---

## 📊 Performance Optimization

### Caching Strategy
```
1. Products (1 hour cache)
   - GET /api/inventory/products
   - GET /api/inventory/search
   - Invalidate on: Stock in/out

2. Customer Info (30 min cache)
   - GET /api/customers/:id
   - Invalidate on: Customer update

3. Bills (1 hour cache)
   - GET /api/bills (paginated)
   - Invalidate on: New bill created

4. QR Codes (permanent, unless regenerated)
   - Store URLs permanently
   - Generate once, use forever

Redis Keys:
- products:{productId}
- customer:{customerId}
- bills:{page}:{limit}:{filters}
```

### Database Indexing
```
Products Collection:
- Index on: sku (unique)
- Index on: category
- Index on: batches.room + batches.cabinet + batches.section

Bills Collection:
- Index on: billNumber (unique)
- Index on: customerId
- Index on: status
- Index on: createdDate (descending)

Customers Collection:
- Index on: customerId (unique)
- Index on: phone
- Index on: email

InventoryTransactions:
- Index on: productId + date
- Index on: type
- Index on: relatedDocument.id

Reminders:
- Index on: nextSendDate
- Index on: status
- Index on: type + relatedEntity.id
```

---

## 🚨 Error Handling

### Error Codes
```
2xx - Success
  200: OK
  201: Created
  204: No Content

4xx - Client Error
  400: Bad Request (validation failed)
  401: Unauthorized (no token)
  403: Forbidden (no permission)
  404: Not Found
  409: Conflict (duplicate SKU, etc.)
  422: Unprocessable Entity

5xx - Server Error
  500: Internal Server Error
  503: Service Unavailable

Error Response Format:
{
  success: false,
  error: {
    code: "VALIDATION_ERROR",
    message: "Product SKU already exists",
    details: {
      field: "sku",
      value: "OIL-FILTER-001"
    }
  }
}
```

### Validation Rules
```
Stock In:
- productName: required, string
- quantity: required, > 0
- costPrice: required, > 0
- location.room: required
- location.cabinet: required
- location.section: required

Bill Creation:
- customerId: required, valid ObjectId
- items: required, at least 1
- items[].quantity: required, > 0
- items[].unitPrice: required, > 0
- items[PARTS].productId: valid ObjectId if PARTS
- items[PARTS].batchId: must have available qty

Payment:
- amount: required, > 0
- method: required, valid enum
- date: required, valid ISO date
```

---

## 📱 Frontend Architecture

### State Management (Zustand)
```javascript
Store: inventoryStore
State: {
  products: [],
  selectedProduct: null,
  filters: { category, location, search },
  loading: false,
  error: null,
  cache: { timestamp, data }
}

Store: billStore
State: {
  bills: [],
  currentBill: null,
  lineItems: [],
  totals: { subtotal, tax, final },
  loading: false,
  error: null
}

Store: customerStore
State: {
  customers: [],
  currentCustomer: null,
  selectedVehicle: null,
  loading: false,
  error: null
}

Store: authStore
State: {
  user: null,
  token: null,
  role: null,
  isAuthenticated: false
}
```

### Component Structure
```
App
├── Layout
│   ├── Header
│   ├── Sidebar
│   ├── MainContent
│   └── Footer
├── Pages
│   ├── Dashboard
│   ├── Inventory
│   │   ├── ProductList
│   │   ├── ProductDetail
│   │   ├── StockInForm
│   │   └── QRCodeDisplay
│   ├── Bills
│   │   ├── BillList
│   │   ├── BillDetail
│   │   └── BillCreationForm
│   │       ├── CustomerSelector
│   │       ├── VehicleSelector
│   │       ├── LineItemsEditor
│   │       │   └── PartsSelectionModal
│   │       ├── TotalsDisplay
│   │       └── ActionsBar
│   ├── Customers
│   │   ├── CustomerList
│   │   ├── CustomerDetail
│   │   ├── CustomerRegistration
│   │   └── CustomerPortal
│   ├── Reminders
│   │   ├── ReminderSettings
│   │   ├── ReminderHistory
│   │   └── TestSender
│   └── Reports
│       ├── StockReport
│       ├── BillReport
│       └── Analytics
└── Common
    ├── Header
    ├── Sidebar
    ├── Modal
    ├── Toast
    └── Loading
```

---

## 🔄 Integration Points

### External Services
```
1. Twilio (SMS, WhatsApp, Voice)
   - POST https://api.twilio.com/...
   - Authentication: Account SID + Auth Token

2. OpenAI (Whisper, GPT-4)
   - POST https://api.openai.com/v1/audio/transcriptions
   - POST https://api.openai.com/v1/chat/completions
   - Authentication: API Key

3. SendGrid (Email)
   - POST https://api.sendgrid.com/v3/mail/send
   - Authentication: API Key

4. Google TTS (Text-to-Speech)
   - gTTS library (local or API)

5. AWS S3 (File Storage - optional)
   - For storing QR codes, invoices, recordings
   - Authentication: AWS credentials
```

---

## 📈 Scalability Considerations

### Current Architecture
- Single server deployment
- MongoDB database
- Redis cache

### Scale to Millions
1. **Horizontal Scaling**
   - Load balancer (Nginx)
   - Multiple API servers
   - Session storage in Redis

2. **Database Sharding**
   - Shard by customerId or region
   - Separate collections by date ranges

3. **Async Processing**
   - Queue reminders (Bull/BullMQ)
   - Process voice calls asynchronously
   - Generate PDFs in background

4. **CDN**
   - Cache QR code images
   - Serve PDFs from CDN

5. **Monitoring**
   - Application Performance Monitoring (APM)
   - Error tracking (Sentry)
   - Log aggregation (ELK)

---

**Status: ✅ READY FOR IMPLEMENTATION**

Start with Week 1 (Stock Management). Build incrementally, test thoroughly, deploy cautiously.

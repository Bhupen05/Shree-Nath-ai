# ⚡ DEVELOPER QUICK REFERENCE
## Copy-Paste Ready Code Examples & API Specs

**Updated:** April 19, 2026  
**For:** Backend & Frontend Developers

---

## 🔧 BACKEND - STOCK IN ENDPOINT

### Express Route
```javascript
// backend/src/routes/api/inventory.js

router.post('/stock-in', authenticate, async (req, res) => {
  try {
    const {
      productName,
      sku,
      category,
      quantity,
      costPrice,
      sellingPrice,
      supplierName,
      invoiceNumber,
      invoiceDate,
      location: { room, cabinet, section }
    } = req.body;

    // 1. Validate inputs
    if (!productName || !quantity || quantity <= 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid input' }
      });
    }

    // 2. Check if product exists by SKU
    let product = await Product.findOne({ sku });
    
    if (!product) {
      // Create new product
      product = await Product.create({
        name: productName,
        sku: sku || generateSKU(),
        category,
        costPrice,
        sellingPrice,
        unit: 'pcs'
      });
    }

    // 3. Create stock batch
    const batchId = `BATCH-${Date.now()}`;
    const qrCode = `QR-${Date.now()}-${room}-${cabinet}`;
    
    const batch = {
      batchId,
      quantity,
      location: { room, cabinet, section },
      qrCode,
      dateAdded: new Date(),
      status: 'available',
      costPrice
    };

    product.batches.push(batch);
    product.stock.total += quantity;
    product.stock.available += quantity;

    await product.save();

    // 4. Create transaction
    const transaction = await InventoryTransaction.create({
      type: 'IN',
      productId: product._id,
      productName,
      quantity,
      toLocation: { room, cabinet, section },
      relatedDocument: {
        type: 'PURCHASE_ORDER',
        number: invoiceNumber
      },
      unitCost: costPrice,
      totalCost: costPrice * quantity,
      date: new Date(),
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      product: {
        _id: product._id,
        name: product.name,
        sku: product.sku,
        currentStock: product.stock.total
      },
      batch,
      transaction
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
});
```

---

## 🗄️ MONGODB - PRODUCT SCHEMA

### Mongoose Schema
```javascript
// backend/src/models/Product.js

const productSchema = new Schema({
  name: { type: String, required: true },
  sku: { type: String, required: true, unique: true },
  category: String,
  
  stock: {
    total: { type: Number, default: 0 },
    available: { type: Number, default: 0 },
    reserved: { type: Number, default: 0 },
    damaged: { type: Number, default: 0 }
  },
  
  batches: [
    {
      batchId: String,
      quantity: Number,
      location: {
        room: String,
        cabinet: String,
        section: String
      },
      qrCode: String,
      dateAdded: Date,
      status: String
    }
  ],
  
  costPrice: Number,
  sellingPrice: Number,
  
  createdDate: { type: Date, default: Date.now }
});

// Indexes
productSchema.index({ sku: 1 });
productSchema.index({ category: 1 });
productSchema.index({ 'batches.location.room': 1 });

module.exports = model('Product', productSchema);
```

---

## 💳 BILL CREATION - KEY LOGIC

### Bill Creation Handler
```javascript
// Calculate totals
function calculateBillTotals(items) {
  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const gst = Math.round(subtotal * 0.18); // 18% tax
  const finalAmount = subtotal + gst;
  
  return { subtotal, gst, finalAmount };
}

// Validate stock availability
async function validateStockAvailability(items) {
  for (const item of items) {
    if (item.type !== 'PARTS') continue;
    
    const product = await Product.findById(item.productId);
    const batch = product.batches.find(b => b.batchId === item.batchId);
    
    if (!batch || batch.quantity < item.quantity) {
      throw new Error(`Insufficient stock for ${product.name}`);
    }
  }
}

// Deduct stock on bill completion
async function deductStockForBill(bill) {
  for (const item of bill.items) {
    if (item.type !== 'PARTS') continue;
    
    const product = await Product.findById(item.productId);
    const batch = product.batches.find(b => b.batchId === item.batchId);
    
    if (!batch) throw new Error('Batch not found');
    
    // Reduce batch quantity
    batch.quantity -= item.quantity;
    
    // Update product totals
    product.stock.total -= item.quantity;
    product.stock.available -= item.quantity;
    
    await product.save();
    
    // Log transaction
    await InventoryTransaction.create({
      type: 'OUT',
      productId: item.productId,
      quantity: item.quantity,
      relatedDocument: {
        type: 'BILL',
        id: bill._id,
        number: bill.billNumber
      },
      date: new Date()
    });
  }
}
```

---

## 📱 REACT - BILL CREATION FORM

### Component Structure
```javascript
// frontend/src/components/BillCreationForm.jsx

import React, { useState, useCallback } from 'react';
import axios from 'axios';

export function BillCreationForm() {
  const [formData, setFormData] = useState({
    customerId: '',
    vehicleRegNo: '',
    items: [],
    discount: 0
  });

  const [totals, setTotals] = useState({
    subtotal: 0,
    gst: 0,
    finalAmount: 0
  });

  const [loading, setLoading] = useState(false);

  // Calculate totals when items change
  useEffect(() => {
    const subtotal = formData.items.reduce(
      (sum, item) => sum + (item.quantity * item.unitPrice),
      0
    );
    const gst = Math.round(subtotal * 0.18);
    const finalAmount = subtotal + gst - formData.discount;

    setTotals({ subtotal, gst, finalAmount });
  }, [formData.items, formData.discount]);

  const addItem = (item) => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { ...item, _id: Date.now() }]
    }));
  };

  const removeItem = (itemId) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item._id !== itemId)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate
      if (!formData.customerId) {
        alert('Please select a customer');
        return;
      }
      if (formData.items.length === 0) {
        alert('Add at least one item');
        return;
      }

      // Create bill
      const response = await axios.post('/api/bills', {
        customerId: formData.customerId,
        vehicleRegNo: formData.vehicleRegNo,
        items: formData.items.map(item => ({
          description: item.description,
          type: item.type,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          productId: item.productId,
          batchId: item.batchId
        }))
      });

      if (response.data.success) {
        alert('Bill created successfully!');
        // Reset form or redirect
        setFormData({ customerId: '', vehicleRegNo: '', items: [], discount: 0 });
      }
    } catch (error) {
      alert('Error: ' + error.response?.data?.error?.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bill-form">
      {/* Customer Selection */}
      <section>
        <h3>Customer & Vehicle</h3>
        <CustomerSelector
          value={formData.customerId}
          onChange={(id) => setFormData({...formData, customerId: id})}
        />
      </section>

      {/* Line Items */}
      <section>
        <h3>Items</h3>
        <LineItemsList
          items={formData.items}
          onRemove={removeItem}
        />
        <AddItemButtons onAdd={addItem} />
      </section>

      {/* Totals */}
      <section className="totals">
        <div>Subtotal: ₹{totals.subtotal}</div>
        <div>GST (18%): ₹{totals.gst}</div>
        <div>Discount: ₹{formData.discount}</div>
        <div className="final">Total: ₹{totals.finalAmount}</div>
      </section>

      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Complete & Print Bill'}
      </button>
    </form>
  );
}
```

### Parts Selection Modal
```javascript
// frontend/src/components/PartsSelectionModal.jsx

export function PartsSelectionModal({ onSelect, onClose }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    // Fetch products
    if (searchTerm.length > 2) {
      axios.get(`/api/inventory/search?q=${searchTerm}`)
        .then(res => setProducts(res.data.results))
        .catch(err => console.error(err));
    }
  }, [searchTerm]);

  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    setSelectedBatch(null);
    setQuantity(1);
  };

  const handleSelectBatch = (batch) => {
    setSelectedBatch(batch);
  };

  const handleAddToCart = () => {
    if (!selectedBatch || quantity > selectedBatch.quantity) {
      alert('Invalid quantity');
      return;
    }

    onSelect({
      description: selectedProduct.name,
      type: 'PARTS',
      quantity,
      unitPrice: selectedProduct.sellingPrice,
      productId: selectedProduct._id,
      batchId: selectedBatch.batchId,
      qrCode: selectedBatch.qrCode
    });

    onClose();
  };

  return (
    <div className="modal">
      <div className="modal-content">
        <h2>Select Parts</h2>

        {/* Search */}
        <input
          type="text"
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        {/* Products List */}
        {!selectedProduct && (
          <div className="products-list">
            {products.map(product => (
              <div
                key={product._id}
                className="product-item"
                onClick={() => handleSelectProduct(product)}
              >
                <div>{product.name}</div>
                <div>{product.stock.available} available @ ₹{product.sellingPrice}</div>
              </div>
            ))}
          </div>
        )}

        {/* Batches Selection */}
        {selectedProduct && !selectedBatch && (
          <div className="batches-list">
            <button onClick={() => setSelectedProduct(null)}>← Back</button>
            <h3>{selectedProduct.name}</h3>
            {selectedProduct.batches.map(batch => (
              <div
                key={batch.batchId}
                className="batch-item"
                onClick={() => handleSelectBatch(batch)}
              >
                <div>
                  Location: {batch.location.room}/{batch.location.cabinet}
                  /{batch.location.section}
                </div>
                <div>Qty: {batch.quantity} @ ₹{selectedProduct.sellingPrice}</div>
                <div>QR: {batch.qrCode}</div>
              </div>
            ))}
          </div>
        )}

        {/* Quantity Selection */}
        {selectedProduct && selectedBatch && (
          <div>
            <button onClick={() => setSelectedBatch(null)}>← Back</button>
            <h3>{selectedProduct.name}</h3>
            <p>Batch: {selectedBatch.batchId}</p>
            <p>Available: {selectedBatch.quantity}</p>
            <input
              type="number"
              min="1"
              max={selectedBatch.quantity}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value))}
            />
            <p>Total: ₹{quantity * selectedProduct.sellingPrice}</p>
            <button onClick={handleAddToCart}>Add to Bill</button>
          </div>
        )}

        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
```

---

## 🚀 QR CODE GENERATION

### Node.js Service
```javascript
// backend/src/lib/qr-service.js

const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

async function generateQRCode(productId, batchId, quantity, location) {
  const qrCodes = [];

  for (let i = 1; i <= quantity; i++) {
    const qrCode = `QR-${Date.now()}-${batchId}-${String(i).padStart(3, '0')}`;
    
    const qrData = {
      productId,
      batchId,
      room: location.room,
      cabinet: location.cabinet,
      section: location.section,
      generated: new Date().toISOString()
    };

    // Generate QR code image
    const fileName = `${batchId}-${i}.png`;
    const filePath = path.join(__dirname, '../../public/qr-codes', fileName);
    
    await QRCode.toFile(filePath, JSON.stringify(qrData), {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 0.95,
      margin: 1,
      width: 200
    });

    qrCodes.push({
      code: qrCode,
      url: `/public/qr-codes/${fileName}`,
      data: qrData
    });
  }

  return qrCodes;
}

async function generateQRLabelsPDF(qrCodes, productName) {
  // Use PDFKit to create printable labels
  // A4 page: 2 columns × 5 rows = 10 labels per page
  // Each label: 10cm × 5cm with QR + product name + location
  
  // Implementation using pdfkit library
}

module.exports = { generateQRCode, generateQRLabelsPDF };
```

---

## 📧 SMS REMINDER (Twilio)

### Send SMS Function
```javascript
// backend/src/lib/sms-service.js

const twilio = require('twilio');

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

async function sendSMS(phoneNumber, message, reminderId) {
  try {
    const result = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber
    });

    // Log successful send
    await ReminderLog.create({
      reminderId,
      date: new Date(),
      channel: 'SMS',
      status: 'SENT',
      messageId: result.sid
    });

    return { success: true, messageId: result.sid };
  } catch (error) {
    // Log failed send
    await ReminderLog.create({
      reminderId,
      date: new Date(),
      channel: 'SMS',
      status: 'FAILED',
      error: error.message
    });

    throw error;
  }
}

module.exports = { sendSMS };
```

---

## 🔔 REMINDER SCHEDULER (Node Cron)

### Daily Reminder Job
```javascript
// backend/src/jobs/reminder-scheduler.js

const cron = require('node-cron');
const { sendSMS } = require('../lib/sms-service');

// Run every day at 9 AM
cron.schedule('0 9 * * *', async () => {
  console.log('Running reminder scheduler...');

  try {
    // Find all reminders due today
    const reminders = await Reminder.find({
      status: 'SCHEDULED',
      nextSendDate: { $lte: new Date() }
    });

    for (const reminder of reminders) {
      // Get related entity (bill, customer, etc.)
      let entity;
      if (reminder.relatedEntity.entityType === 'BILL') {
        entity = await Bill.findById(reminder.relatedEntity.entityId);
      }

      // Prepare personalized message
      const message = reminder.personalizedMessage.body;

      // Send via configured channels
      if (reminder.channels.sms) {
        await sendSMS(reminder.recipient.phone, message, reminder._id);
      }

      if (reminder.channels.email) {
        // Send email
      }

      if (reminder.channels.whatsapp) {
        // Send WhatsApp
      }

      // Update reminder
      reminder.lastSentDate = new Date();
      reminder.sentCount += 1;

      if (reminder.schedule.recurring && reminder.sentCount < reminder.schedule.maxReminders) {
        reminder.nextSendDate = new Date(Date.now() + reminder.schedule.interval * 24 * 60 * 60 * 1000);
      } else {
        reminder.status = 'COMPLETED';
      }

      await reminder.save();
    }

    console.log(`Processed ${reminders.length} reminders`);
  } catch (error) {
    console.error('Reminder scheduler error:', error);
  }
});

module.exports = startReminderScheduler;
```

---

## 🎤 VOICE AGENT - TWILIO WEBHOOK

### Receive Call & Send TwiML
```javascript
// backend/src/routes/api/voice.js

const VoiceResponse = require('twilio').twiml.VoiceResponse;

router.post('/webhook', (req, res) => {
  const response = new VoiceResponse();

  // Incoming call greeting
  response.say('Welcome to Shree Nath Motors! Please say what you need.');

  // Gather voice input
  const gather = response.gather({
    numDigits: 1,
    action: '/api/voice/process-call',
    method: 'POST',
    timeout: 10,
    speechTimeout: 'auto',
    language: 'en-IN'
  });

  gather.say('Say: product search, check bill, or reserve item.');

  res.type('text/xml');
  res.send(response.toString());
});

// Process call input
router.post('/process-call', async (req, res) => {
  const response = new VoiceResponse();
  const phoneNumber = req.body.Caller;
  const speechResult = req.body.SpeechResult;

  try {
    // 1. Speech to text (Whisper)
    const transcription = speechResult; // Already provided by Twilio

    // 2. Intent processing (GPT-4)
    const intent = await processIntent(transcription);

    // 3. Database query
    let responseText;
    if (intent.type === 'PRODUCT_SEARCH') {
      const products = await searchProducts(intent.productName);
      responseText = formatProductResponse(products);
    } else if (intent.type === 'MAKE_RESERVATION') {
      await createReservation(intent.productId, intent.quantity, phoneNumber);
      responseText = 'Great! Your reservation is confirmed.';
    }

    // 4. Text to speech
    response.say(responseText);

    // 5. Ask for next action
    const gather = response.gather({
      numDigits: 1,
      action: '/api/voice/process-call',
      method: 'POST'
    });
    gather.say('What else can I help you with?');

    res.type('text/xml');
    res.send(response.toString());
  } catch (error) {
    response.say('Sorry, I had trouble processing that. Please try again.');
    res.type('text/xml');
    res.send(response.toString());
  }
});

module.exports = router;
```

---

## 📊 CUSTOMER DASHBOARD - React

### Get Customer Bills
```javascript
// frontend/src/pages/CustomerPortal.jsx

import { useEffect, useState } from 'react';
import axios from 'axios';

export function CustomerPortal({ customerId }) {
  const [customer, setCustomer] = useState(null);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const customerRes = await axios.get(`/api/customers/${customerId}`);
        setCustomer(customerRes.data.customer);

        const billsRes = await axios.get(`/api/customers/${customerId}/bills`);
        setBills(billsRes.data.bills);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [customerId]);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="customer-portal">
      {/* Header */}
      <div className="header">
        <h1>Customer Portal</h1>
        <p>ID: {customer?.customerId}</p>
      </div>

      {/* Customer Info */}
      <section className="customer-info">
        <h2>{customer?.personal.name}</h2>
        <p>Phone: {customer?.personal.phone}</p>
        <p>Email: {customer?.personal.email}</p>
        <p>Total Bills: {customer?.stats.totalBills}</p>
        <p>Total Spent: ₹{customer?.stats.totalSpent}</p>
      </section>

      {/* Bills */}
      <section className="bills">
        <h2>Your Bills</h2>
        <table>
          <thead>
            <tr>
              <th>Bill #</th>
              <th>Date</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Payment</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {bills.map(bill => (
              <tr key={bill._id}>
                <td>{bill.billNumber}</td>
                <td>{new Date(bill.dates.createdDate).toLocaleDateString()}</td>
                <td>₹{bill.totals.finalAmount}</td>
                <td>{bill.billStatus}</td>
                <td>{bill.payment.status}</td>
                <td>
                  <a href={`/api/bills/${bill._id}/pdf`} download>
                    Download
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
```

---

## ✅ TESTING - Unit Test Example

### Jest Test for Stock Deduction
```javascript
// backend/test/unit/stock-deduction.test.js

describe('Stock Deduction', () => {
  let product, bill;

  beforeEach(async () => {
    // Create test product with stock
    product = await Product.create({
      name: 'Oil Filter',
      sku: 'TEST-001',
      batches: [{
        batchId: 'BATCH-001',
        quantity: 10,
        location: { room: 'R1', cabinet: 'C1', section: 'S1' }
      }],
      stock: { total: 10, available: 10 }
    });

    // Create test bill
    bill = await Bill.create({
      customerId: 'test-customer',
      items: [{
        type: 'PARTS',
        productId: product._id,
        batchId: 'BATCH-001',
        quantity: 3,
        unitPrice: 350
      }]
    });
  });

  test('Stock reduced when bill status becomes COMPLETED', async () => {
    // Initial stock
    expect(product.stock.available).toBe(10);

    // Update bill status
    await updateBillStatus(bill._id, 'COMPLETED');

    // Fetch updated product
    const updatedProduct = await Product.findById(product._id);

    // Stock should be reduced
    expect(updatedProduct.stock.available).toBe(7);
    expect(updatedProduct.stock.total).toBe(7);
  });

  test('Batch quantity reduced correctly', async () => {
    await updateBillStatus(bill._id, 'COMPLETED');
    const updatedProduct = await Product.findById(product._id);
    const batch = updatedProduct.batches[0];

    expect(batch.quantity).toBe(7);
  });

  test('Transaction created for stock out', async () => {
    await updateBillStatus(bill._id, 'COMPLETED');
    
    const transaction = await InventoryTransaction.findOne({
      'relatedDocument.id': bill._id
    });

    expect(transaction).toBeTruthy();
    expect(transaction.type).toBe('OUT');
    expect(transaction.quantity).toBe(3);
  });

  test('Cannot deduct more than available', async () => {
    const bigBill = await Bill.create({
      customerId: 'test-customer',
      items: [{
        type: 'PARTS',
        productId: product._id,
        batchId: 'BATCH-001',
        quantity: 15 // More than available
      }]
    });

    expect(async () => {
      await updateBillStatus(bigBill._id, 'COMPLETED');
    }).rejects.toThrow('Insufficient stock');
  });
});
```

---

## 🔐 ENVIRONMENT VARIABLES

### .env Template
```
# Server
NODE_ENV=development
PORT=5000
JWT_SECRET=your-secret-key-here

# Database
MONGODB_URI=mongodb://localhost:27017/shree-nath
MONGODB_USER=admin
MONGODB_PASSWORD=password

# Redis
REDIS_URL=redis://localhost:6379

# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890

# OpenAI
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# SendGrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# AWS S3 (optional)
AWS_ACCESS_KEY_ID=xxxxxxxxxxxxx
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxx
AWS_REGION=us-east-1
AWS_S3_BUCKET=shree-nath-erp

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Logging
LOG_LEVEL=debug
```

---

## 🎯 NPM PACKAGES TO INSTALL

### Backend
```bash
npm install \
  express \
  mongoose \
  redis \
  jsonwebtoken \
  bcryptjs \
  dotenv \
  cors \
  multer \
  qrcode \
  pdfkit \
  pdf-lib \
  node-cron \
  twilio \
  openai \
  nodemailer \
  axios \
  joi \
  morgan \
  helmet \
  express-validator

# Dev
npm install --save-dev \
  jest \
  supertest \
  nodemon \
  eslint
```

### Frontend
```bash
npm install \
  react@19 \
  react-dom@19 \
  react-router-dom@7 \
  axios \
  zustand \
  tailwindcss \
  date-fns \
  qrcode.react \
  react-qr-reader \
  html2pdf \
  chart.js \
  react-chartjs-2 \
  react-toastify \
  react-icons \
  clsx

# Dev
npm install --save-dev \
  vite@8 \
  eslint-config-react \
  prettier
```

---

## 🏃 Quick Start Commands

### Backend
```bash
# Setup
npm install
cp .env.example .env
node backend/src/db/seed.js

# Development
npm run dev

# Testing
npm test

# Production build
npm run build
npm start
```

### Frontend
```bash
# Setup
npm install
npm run dev

# Build
npm run build

# Lint
npm run lint
```

---

## 🐛 COMMON BUGS & FIXES

### "Duplicate key error on SKU"
```javascript
// Fix: Check if product exists BEFORE creating
const existing = await Product.findOne({ sku: req.body.sku });
if (existing) {
  return res.status(409).json({ error: 'SKU already exists' });
}
```

### "Stock not deducted on bill completion"
```javascript
// Fix: Make sure you're calling stock deduction in status update
if (newStatus === 'COMPLETED') {
  await deductStockForBill(bill);  // This line is critical!
}
```

### "Reminders sending duplicate messages"
```javascript
// Fix: Check if reminder already sent today
const lastSent = reminder.sendHistory[reminder.sendHistory.length - 1];
if (isSameDay(lastSent.date, new Date())) {
  return; // Skip if already sent today
}
```

### "Phone number validation errors"
```javascript
// Fix: Normalize phone numbers
function normalizePhone(phone) {
  return phone.replace(/\D/g, ''); // Remove non-digits
  // Then validate: must be 10 digits after country code
}
```

---

**Last Updated:** April 19, 2026  
**Version:** 1.0  
**Status:** Ready to Use

Copy code snippets as needed. Modify for your specific requirements. Test thoroughly before deploying to production.

**Happy Coding! 🚀**

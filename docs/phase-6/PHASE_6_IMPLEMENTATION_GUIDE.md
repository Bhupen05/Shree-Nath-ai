# Phase 6: Bill-to-Stock Integration - Implementation Guide

## Overview

Phase 6 implements bidirectional integration between the billing system and stock management system. This enables:

- **Automatic stock creation** when purchase bills are confirmed
- **Automatic stock allocation** when sales bills are created
- **FIFO-based fulfillment** using oldest stock batches first
- **Complete audit trail** linking bills to stock movements
- **Real-time stock availability** checking

## Architecture

### Data Flow

```
PURCHASE BILL WORKFLOW:
┌─────────────┐     CONFIRM      ┌────────────────┐     AUTO      ┌──────────────────┐
│ DRAFT Bill  │ ─────────────────>│ CONFIRMED Bill │ ──────────────>│ Stock Entries    │
│ + Items     │                   │ (PURCHASE)     │                │ Created (Incoming)│
└─────────────┘                   └────────────────┘                └──────────────────┘
                                        │
                                        v
                                  ┌──────────────┐
                                  │ Stock Logs   │
                                  │ (ADD action) │
                                  └──────────────┘

SALES BILL WORKFLOW:
┌─────────────┐     CONFIRM      ┌────────────────┐     ALLOCATE   ┌────────────────┐
│ DRAFT Bill  │ ─────────────────>│ CONFIRMED Bill │ ──────────────>│ Stock Reserved │
│ + Items     │                   │ (SALE)         │   (FIFO)       │ (Reservations) │
└─────────────┘                   └────────────────┘                └────────────────┘
                                        │
                                        v
                                  ┌──────────────┐
                                  │ Stock Logs   │
                                  │ (RESERVE)    │
                                  └──────────────┘

FULFILLMENT WORKFLOW:
┌────────────────┐     FULFILL    ┌─────────────────────┐     UPDATE    ┌─────────────┐
│ Reserved Stock │ ──────────────>│ Reservation.status  │ ─────────────>│ Stock Logs  │
│ (Reservations) │                │ = FULFILLED         │                │ (FULFILL)   │
└────────────────┘                └─────────────────────┘                └─────────────┘
                                        │
                                        v
                                  ┌──────────────────┐
                                  │ Bill Item status │
                                  │ = FULFILLED      │
                                  └──────────────────┘
```

### Database Schema Enhancements

#### 1. stock_entries Table Additions
```sql
- incoming_bill_id (INTEGER): FK to bills (PURCHASE bills)
- outgoing_bill_id (INTEGER): FK to bills (SALE bills)
- bill_item_id (INTEGER): FK to bill_items
- status (VARCHAR): ACTIVE, ARCHIVED, etc.
```

#### 2. stock_reservations Table Enhancements
```sql
- bill_item_id (INTEGER): FK to bill_items
- fulfilled_from_entry_id (INTEGER): FK to stock_entries
- fulfilled_quantity (INTEGER): Amount actually fulfilled
- fulfilled_at (TIMESTAMP): When fulfillment occurred
```

#### 3. bill_items Table Additions
```sql
- stock_fulfilled (INTEGER): Qty actually used from stock
- stock_reserved (INTEGER): Qty reserved/allocated
- fulfillment_status (VARCHAR): PENDING, RESERVED, PARTIALLY_FULFILLED, FULFILLED
- notes (TEXT): Additional tracking info
```

### New Database Views

#### v_bill_stock_status
Shows fulfillment status for each bill item
- bill_item_id, bill_id, product info, fulfillment status, quantities

#### v_stock_from_bills
Shows stock entries linked to bills
- stock_entry_id, bill linkage, stock_source (FROM_PURCHASE, FROM_SALE, MANUAL)

#### v_pending_bill_allocations
Shows bill items waiting for stock allocation
- bill_item_id, available_stock, needed quantity, reservation status

### New Database Functions

#### allocate_stock_to_bill_item()
FIFO-based stock allocation with automatic reservation

#### fulfill_bill_item_from_reservations()
Converts reserved stock to actual fulfillment

#### create_stock_from_bill()
Auto-creates stock entries from purchase bills

## API Endpoints

### 1. Create Stock from Bill
```
POST /api/bill-stock/create-stock-from-bill
Authentication: Required (Bearer token)
Permission: billing:write

Request:
{
  "billId": 123,
  "locationId": 1
}

Response (Success):
{
  "success": true,
  "data": {
    "billId": 123,
    "entriesCreated": 5,
    "totalQuantity": 100,
    "totalCost": 5000
  },
  "message": "Created 5 stock entries from bill BILL-001"
}

Response (Error):
{
  "success": false,
  "error": "Bill not found"
}

Usage:
- Called after purchase bill confirmation
- Automatically in production (see Implementation section)
- Manual call for testing/recovery
```

### 2. Allocate Stock
```
POST /api/bill-stock/allocate-stock
Authentication: Required
Permission: billing:write

Request:
{
  "billItemId": 456,
  "productId": 789,
  "quantity": 10,
  "locationId": null
}

Response (Success):
{
  "success": true,
  "data": {
    "billItemId": 456,
    "allocated": 10,
    "requested": 10,
    "shortage": 0,
    "entries": [
      {
        "stockEntryId": 111,
        "allocatedQuantity": 10,
        "reservationId": 999
      }
    ]
  },
  "message": "Successfully allocated 10 units"
}

Response (Partial):
{
  "success": true,
  "data": {
    "allocated": 7,
    "requested": 10,
    "shortage": 3
  },
  "message": "Allocated 7 of 10 requested units"
}

Usage:
- Called during bill creation for SALE bills
- FIFO selection: oldest batches allocated first
- Can be called multiple times to fulfill demand
```

### 3. Fulfill Bill Item
```
POST /api/bill-stock/fulfill-item
Authentication: Required
Permission: billing:write

Request:
{
  "billItemId": 456,
  "quantity": 10
}

Response:
{
  "success": true,
  "data": {
    "billItemId": 456,
    "fulfilled": 10,
    "requested": 10,
    "totalFulfilled": 10,
    "fulfillmentStatus": "FULFILLED",
    "records": [
      {
        "reservationId": 999,
        "stockEntryId": 111,
        "fulfilledQuantity": 10
      }
    ]
  },
  "message": "Fulfilled 10 units for bill item 456"
}

Usage:
- Called on bill confirmation to finalize fulfillment
- Converts reservations to actual fulfillment
- Updates stock_fulfilled counter on bill_items
```

### 4. Get Bill Stock Status
```
GET /api/bill-stock/status/:billId
Authentication: Required

Response:
{
  "success": true,
  "data": {
    "id": 123,
    "bill_number": "BILL-001",
    "bill_type": "SALE",
    "status": "CONFIRMED",
    "total_items": 5,
    "fulfilled_items": 3,
    "partial_items": 1,
    "pending_items": 1,
    "items": [
      {
        "billItemId": 456,
        "productId": 789,
        "productName": "Widget A",
        "ordered": 10,
        "fulfilled": 8,
        "reserved": 2,
        "pending": 0,
        "fulfillmentStatus": "FULFILLED"
      }
    ]
  }
}

Usage:
- Frontend: Show stock allocation status
- Frontend: Display fulfillment progress
- Admin: Monitor bill status
```

### 5. Get Pending Allocations
```
GET /api/bill-stock/pending/:billId
Authentication: Required

Response:
{
  "success": true,
  "data": [
    {
      "bill_item_id": 456,
      "product_id": 789,
      "product_name": "Widget A",
      "needed": 10,
      "reserved": 5,
      "fulfilled": 0,
      "pending": 5,
      "available": 20
    }
  ]
}

Usage:
- Get items needing allocation
- Display availability before allocation
- Check for shortages
```

### 6. Get Bill-Stock Linkage
```
GET /api/bill-stock/linkage?billType=PURCHASE&days=30
Authentication: Required

Response:
{
  "success": true,
  "data": [
    {
      "bill_id": 123,
      "bill_number": "BILL-001",
      "bill_type": "PURCHASE",
      "status": "CONFIRMED",
      "created_at": "2024-04-19T10:00:00Z",
      "linked_stock_entries": 5,
      "total_quantity": 100,
      "total_value": 5000,
      "stock_direction": "Incoming Stock"
    }
  ]
}

Query Parameters:
- billType (optional): PURCHASE or SALE
- days (optional): Last N days (default: 30)

Usage:
- Report: Stock created from purchases
- Report: Stock consumed by sales
- Analytics: Bill-stock tracking
```

### 7. Auto-Allocate Bill Stock
```
POST /api/bill-stock/auto-allocate/:billId
Authentication: Required
Permission: billing:write

Response:
{
  "success": true,
  "data": {
    "allocatedItems": 3,
    "failedItems": 1,
    "totalItems": 4,
    "results": [
      {
        "billItemId": 456,
        "status": "success",
        "allocated": 10,
        "shortage": 0
      },
      {
        "billItemId": 457,
        "status": "failed",
        "error": "Insufficient stock"
      }
    ]
  },
  "message": "Auto-allocated 3 items, 1 failed"
}

Usage:
- Allocate all items in a bill at once
- Partial success: Some items allocated, some fail
- Returns detailed per-item results
```

## Implementation Integration Points

### 1. Bill Confirmation Endpoint Updates

When a bill is confirmed, the system should:

#### For PURCHASE bills:
```javascript
// After existing confirmation logic
if (bill.bill_type === 'PURCHASE' && bill.status === 'CONFIRMED') {
  // Create stock entries from bill items
  await billStockService.createStockFromPurchaseBill(
    billId,
    defaultLocationId, // e.g., 1 (receiving area)
    userId
  );
}
```

#### For SALE bills:
```javascript
// After existing confirmation logic
if (bill.bill_type === 'SALE' && bill.status === 'CONFIRMED') {
  // Auto-allocate stock
  const allocateResult = await billStockService.allocateStockToBillItem(
    // Call for each bill item
  );
  
  if (allocateResult.allocated >= billItem.quantity) {
    // All stock allocated, can proceed
    // Fulfill the allocation
    await billStockService.fulfillBillItem(billItemId, null, userId);
  } else if (allocateResult.allocated > 0) {
    // Partial allocation, bill can be partially fulfilled
    await billStockService.fulfillBillItem(billItemId, allocateResult.allocated, userId);
  } else {
    // No stock available, raise error
    throw new Error(`Insufficient stock for ${billItem.product_id}`);
  }
}
```

### 2. Bill Creation - Stock Reservation

When a bill is created (DRAFT state):
```javascript
// Reserve stock for all items (optional - for sales bills)
for (const item of billItems) {
  try {
    await billStockService.allocateStockToBillItem(
      billItemId,
      item.product_id,
      item.quantity,
      null,
      userId
    );
  } catch (error) {
    // Log warning but allow bill creation
    console.warn(`Could not reserve stock for item ${billItemId}: ${error.message}`);
  }
}
```

### 3. Bill Cancellation - Release Stock

When a bill is cancelled:
```javascript
if (bill.status === 'CANCELLED') {
  // Get all bill items
  const items = await client.query(
    'SELECT id, stock_reserved FROM bill_items WHERE bill_id = $1',
    [billId]
  );
  
  // Release all reservations
  for (const item of items.rows) {
    await client.query(
      `UPDATE stock_reservations
       SET status = 'CANCELLED'
       WHERE bill_item_id = $1 AND status IN ('RESERVED', 'PARTIALLY_FULFILLED')`
      [item.id]
    );
    
    // Return stock to available pool
    await client.query(
      `UPDATE stock_entries
       SET quantity = quantity + (
         SELECT SUM(reserved_quantity) FROM stock_reservations
         WHERE bill_item_id = $1 AND status = 'CANCELLED'
       )
       WHERE id IN (
         SELECT stock_entry_id FROM stock_reservations
         WHERE bill_item_id = $1 AND status = 'CANCELLED'
       )`,
      [item.id]
    );
  }
}
```

## Workflow Scenarios

### Scenario 1: Purchase Bill Complete Workflow

1. **Purchase bill created** (DRAFT)
   - Items entered with quantities and prices
   - No stock changes yet

2. **Purchase bill confirmed** (CONFIRMED)
   - System calls `createStockFromPurchaseBill()`
   - Stock entries created for each item
   - Batch numbers: `BILL-{billId}-ITEM-{itemId}-{timestamp}`
   - Stock logs record: ADD action, reference to bill
   - incoming_bill_id set to this bill ID

3. **Stock transferred to warehouse**
   - Warehouse receives goods matching batch numbers
   - Stock locations updated if needed
   - Transfer tracked in stock movement

### Scenario 2: Sales Bill Complete Workflow

1. **Sales bill created** (DRAFT)
   - Customer and items entered
   - System attempts to allocate stock (optional reservation)
   - If allocation fails: returns shortage message
   - Bill still created (can be corrected later)

2. **Sales bill confirmed** (CONFIRMED)
   - System allocates remaining stock
   - Uses FIFO: oldest batches selected first
   - Stock reservations created for selected entries
   - stock_reserved counter updated

3. **Goods picked and packed**
   - warehouse worker picks items
   - System calls `fulfillBillItem()` for each item
   - Reservations converted to fulfilled
   - stock_fulfilled counter updated

4. **Shipment sent to customer**
   - Bill status: PARTIALLY_PAID or PAID
   - Stock entries marked: outgoing_bill_id set
   - Stock logs record: FULFILL action

### Scenario 3: FIFO Selection Example

Existing stock:
- Batch A: 50 units, created 2024-01-01
- Batch B: 30 units, created 2024-01-05
- Batch C: 20 units, created 2024-01-10

Sales bill needs 75 units:
```
1. Reserve 50 from Batch A (oldest)
2. Reserve 25 from Batch B (next oldest)
3. Result: 75 units allocated, 5 units remaining in Batch B
```

### Scenario 4: Insufficient Stock

Stock available: 40 units
Sales bill needs: 100 units

```
1. allocateStockToBillItem() called
2. Returns: allocated=40, shortage=60
3. Bill item status: PARTIALLY_RESERVED
4. Cannot confirm bill until more stock available
5. Options:
   - Wait for purchase bill
   - Split bill into two
   - Fulfill partially (backorder)
```

## Testing Workflow

### Unit Tests
```bash
npm test -- backend/test/unit/stock.service.test.js
```

### Integration Tests
```bash
npm test -- backend/test/integration/bill-stock.integration.test.js
```

### Manual Testing

1. **Create Purchase Bill**
   ```bash
   POST /api/billing/bills
   {
     "billType": "PURCHASE",
     "partyId": 1,
     "items": [
       {"partId": 1, "quantity": 50, "unitPrice": 100}
     ]
   }
   ```

2. **Confirm Purchase Bill**
   ```bash
   POST /api/billing/bills/:billId/confirm
   ```

3. **Verify Stock Created**
   ```bash
   GET /api/inventory/stock/entries
   Filter by: incoming_bill_id = billId
   ```

4. **Create Sales Bill**
   ```bash
   POST /api/billing/bills
   {
     "billType": "SALE",
     "partyId": 2,
     "items": [
       {"partId": 1, "quantity": 30, "unitPrice": 150}
     ]
   }
   ```

5. **Check Allocations**
   ```bash
   GET /api/bill-stock/pending/:billId
   ```

6. **Confirm Sales Bill**
   ```bash
   POST /api/billing/bills/:billId/confirm
   ```

7. **Verify Stock Allocated**
   ```bash
   GET /api/bill-stock/status/:billId
   ```

## Error Handling

| Error | Cause | Resolution |
|-------|-------|-----------|
| Bill not found | Invalid billId | Verify bill exists in database |
| Only PURCHASE bills | Wrong bill type for operation | Use correct endpoint for bill type |
| Insufficient stock | Not enough quantity available | Wait for purchase or split bill |
| Product ID mismatch | Wrong product for allocation | Verify bill item product_id |
| Bill item not found | Invalid billItemId | Verify bill_items exists |
| Location not found | Invalid locationId | Verify locations exists |

## Performance Considerations

### Query Optimization
- Index on: `stock_entries(product_id, deleted_at, outgoing_bill_id)`
- Index on: `stock_reservations(bill_item_id, status)`
- Index on: `bill_items(fulfillment_status, stock_fulfilled)`

### Transaction Handling
- All allocation/fulfillment operations use transactions
- FIFO selection is atomic
- Stock_logs entries created atomically with updates

### Caching Opportunities
- Cache: v_bill_stock_status (updated on each operation)
- Cache: Available stock per product (TTL: 1 minute)
- Cache: Low stock alerts (TTL: 5 minutes)

## Monitoring & Logging

### Stock Logs Entries
Each operation creates audit trail:
```
entry_id: Which stock entry
action: ADD, RESERVE, FULFILL, REMOVE
quantity_delta: Change in quantity
reference_id: Bill ID or operation ID
performed_by: User ID
reason: Human-readable reason
```

### Queries for Monitoring
```sql
-- Stock created from bills (last 7 days)
SELECT bill_id, SUM(quantity) as total FROM stock_entries
WHERE incoming_bill_id IS NOT NULL
AND created_at > NOW() - INTERVAL '7 days'
GROUP BY bill_id;

-- Stock used by bills (last 7 days)
SELECT bill_id, SUM(quantity) as total FROM stock_entries
WHERE outgoing_bill_id IS NOT NULL
AND created_at > NOW() - INTERVAL '7 days'
GROUP BY bill_id;

-- Pending allocations
SELECT COUNT(*) as pending_items
FROM bill_items
WHERE fulfillment_status = 'PENDING';

-- Orphaned reservations (>24 hours old)
SELECT COUNT(*) FROM stock_reservations
WHERE status = 'RESERVED'
AND created_at < NOW() - INTERVAL '1 day';
```

## Migration & Rollout

### Prerequisites
1. Phase 5 stock system fully deployed
2. All existing bills in confirmed state
3. No in-flight transactions

### Migration Steps
1. Execute migration: `202604190002__bill_stock_integration.sql`
2. Run: `npm run db:migrate`
3. Verify schema: `SELECT * FROM v_bill_stock_status LIMIT 1;`
4. Mount routes in index.js
5. Deploy code updates
6. Run integration tests

### Rollback Plan
1. Remove routes from index.js
2. Disable bill-stock endpoints (optional)
3. Revert code deployment
4. Run: `npm run db:rollback`
5. Drop migration tables (if needed)

## Future Enhancements

1. **Batch-level Expiry Tracking**
   - Auto-remove expired batches
   - Priority to expiring batches first (FEFO)

2. **Weighted Allocation**
   - Cost-based selection (cheaper first)
   - Location-based preference

3. **Multi-location Transfers**
   - Auto-trigger inter-warehouse transfers
   - Optimize stock distribution

4. **Predictive Allocation**
   - ML-based demand forecasting
   - Pre-allocate for high-probability sales

5. **Reservation Expiry**
   - Auto-release old reservations
   - Prevent stock hoarding

## Troubleshooting

### Stock entries not created after bill confirmation
1. Check bill status: `SELECT status FROM bills WHERE id = ?;`
2. Verify bill_items exist: `SELECT * FROM bill_items WHERE bill_id = ?;`
3. Check migration executed: `SELECT * FROM stock_entries LIMIT 1;`
4. Check logs: `journalctl -u backend -n 100`

### Allocation failing with "Insufficient stock"
1. Check available: `SELECT SUM(quantity) FROM stock_entries WHERE product_id = ? AND deleted_at IS NULL;`
2. Check reservations: `SELECT SUM(reserved_quantity) FROM stock_reservations WHERE status = 'RESERVED';`
3. Verify product_id matches: `SELECT part_id FROM bill_items WHERE id = ?;`

### Fulfillment not updating bill_items
1. Check reservations status: `SELECT status FROM stock_reservations WHERE bill_item_id = ?;`
2. Check bill_items: `SELECT stock_reserved, stock_fulfilled FROM bill_items WHERE id = ?;`
3. Verify trigger: `SELECT COUNT(*) FROM pg_trigger WHERE tgname = 'trigger_bill_items_fulfillment';`


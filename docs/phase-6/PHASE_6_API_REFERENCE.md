# Phase 6: Bill-Stock Integration - API Reference

## Quick Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/bill-stock/create-stock-from-bill` | POST | Create stock from purchase bill |
| `/bill-stock/allocate-stock` | POST | Allocate stock to sales bill item (FIFO) |
| `/bill-stock/fulfill-item` | POST | Fulfill bill item from reserved stock |
| `/bill-stock/status/:billId` | GET | Get bill stock status |
| `/bill-stock/pending/:billId` | GET | Get pending allocations |
| `/bill-stock/linkage` | GET | Get bill-stock linkage report |
| `/bill-stock/auto-allocate/:billId` | POST | Auto-allocate all items in bill |

## Detailed API Reference

### POST /api/bill-stock/create-stock-from-bill

**Purpose**: Create stock entries from a confirmed PURCHASE bill

**Authentication**: Required (Bearer token)
**Permission**: `billing:write`

**Request Body**:
```json
{
  "billId": 123,
  "locationId": 1
}
```

**Parameters**:
- `billId` (number, required): ID of the PURCHASE bill to create stock from
- `locationId` (number, optional, default: 1): Warehouse location for incoming stock

**Validation Rules**:
- billId must exist in bills table
- Bill must have bill_type = 'PURCHASE'
- Bill must have status = 'CONFIRMED'
- Bill must have at least one bill_item
- locationId must exist in locations table

**Response - Success** (201):
```json
{
  "success": true,
  "data": {
    "billId": 123,
    "entriesCreated": 5,
    "totalQuantity": 150,
    "totalCost": 7500
  },
  "message": "Created 5 stock entries from bill BILL-001"
}
```

**Response - Error** (400):
```json
{
  "success": false,
  "error": "Bill not found"
}
```

**Possible Errors**:
- `Bill not found`: billId doesn't exist
- `Only PURCHASE bills can create stock entries`: Wrong bill type
- `Bill must be CONFIRMED to create stock`: Bill status not confirmed
- `Bill has no items`: No bill_items found
- `Location {locationId} not found`: Invalid location

**Example**:
```bash
curl -X POST http://localhost:5000/api/bill-stock/create-stock-from-bill \
  -H "Authorization: Bearer token_here" \
  -H "Content-Type: application/json" \
  -d '{
    "billId": 123,
    "locationId": 1
  }'
```

---

### POST /api/bill-stock/allocate-stock

**Purpose**: Allocate and reserve stock for a sales bill item using FIFO strategy

**Authentication**: Required
**Permission**: `billing:write`

**Request Body**:
```json
{
  "billItemId": 456,
  "productId": 789,
  "quantity": 25,
  "locationId": null
}
```

**Parameters**:
- `billItemId` (number, required): ID of the bill_item to allocate for
- `productId` (number, required): Product/part to allocate
- `quantity` (number, required): Quantity to allocate
- `locationId` (number, optional): Specific location to allocate from (if not specified, searches all locations)

**Validation Rules**:
- billItemId must exist in bill_items
- productId must exist in parts
- productId in request must match bill_item.part_id
- quantity must be > 0
- Sufficient stock must be available

**Response - Full Success** (201):
```json
{
  "success": true,
  "data": {
    "billItemId": 456,
    "allocated": 25,
    "requested": 25,
    "shortage": 0,
    "entries": [
      {
        "stockEntryId": 111,
        "allocatedQuantity": 20,
        "reservationId": 999
      },
      {
        "stockEntryId": 112,
        "allocatedQuantity": 5,
        "reservationId": 1000
      }
    ]
  },
  "message": "Successfully allocated 25 units"
}
```

**Response - Partial Success** (201):
```json
{
  "success": true,
  "data": {
    "billItemId": 456,
    "allocated": 15,
    "requested": 25,
    "shortage": 10,
    "entries": [
      {
        "stockEntryId": 111,
        "allocatedQuantity": 15,
        "reservationId": 999
      }
    ]
  },
  "message": "Allocated 15 of 25 requested units"
}
```

**Response - Error** (400):
```json
{
  "success": false,
  "error": "Insufficient stock: available=10, needed=25"
}
```

**Possible Errors**:
- `Bill item not found`: Invalid billItemId
- `Product ID does not match bill item`: Product mismatch
- `Insufficient stock: available=X, needed=Y`: Not enough stock

**FIFO Algorithm**:
```
1. Query stock_entries ordered by created_at ASC
2. For each entry with available quantity:
   a. Allocate minimum of (remaining needed, entry quantity)
   b. Create stock_reservation record
   c. Decrease stock_entries.quantity
   d. Create stock_log entry
   e. Continue until quantity satisfied
3. Return allocation result
```

**Example**:
```bash
curl -X POST http://localhost:5000/api/bill-stock/allocate-stock \
  -H "Authorization: Bearer token_here" \
  -H "Content-Type: application/json" \
  -d '{
    "billItemId": 456,
    "productId": 789,
    "quantity": 25
  }'
```

---

### POST /api/bill-stock/fulfill-item

**Purpose**: Convert reserved stock allocation into actual fulfillment

**Authentication**: Required
**Permission**: `billing:write`

**Request Body**:
```json
{
  "billItemId": 456,
  "quantity": 20
}
```

**Parameters**:
- `billItemId` (number, required): Bill item to fulfill
- `quantity` (number, optional): Amount to fulfill (if not provided, fulfills all reserved stock)

**Validation Rules**:
- billItemId must exist in bill_items
- quantity (if provided) must not exceed stock_reserved
- Must have stock reservations with status = 'RESERVED'

**Response** (200):
```json
{
  "success": true,
  "data": {
    "billItemId": 456,
    "fulfilled": 20,
    "requested": 20,
    "totalFulfilled": 20,
    "fulfillmentStatus": "FULFILLED",
    "records": [
      {
        "reservationId": 999,
        "stockEntryId": 111,
        "fulfilledQuantity": 20
      }
    ]
  },
  "message": "Fulfilled 20 units for bill item 456"
}
```

**Response - Error** (400):
```json
{
  "success": false,
  "error": "Cannot fulfill 30 units, only 20 reserved"
}
```

**Fulfillment Status Updates**:
- If `stock_fulfilled >= quantity`: status = `FULFILLED`
- If `0 < stock_fulfilled < quantity`: status = `PARTIALLY_FULFILLED`
- If `stock_fulfilled = 0`: status = `PENDING`

**Example**:
```bash
curl -X POST http://localhost:5000/api/bill-stock/fulfill-item \
  -H "Authorization: Bearer token_here" \
  -H "Content-Type: application/json" \
  -d '{
    "billItemId": 456,
    "quantity": 20
  }'
```

---

### GET /api/bill-stock/status/:billId

**Purpose**: Get complete stock status for a bill

**Authentication**: Required

**Path Parameters**:
- `billId` (number): Bill ID

**Query Parameters**: None

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": 123,
    "bill_number": "BILL-001",
    "bill_type": "SALE",
    "status": "CONFIRMED",
    "total_items": 3,
    "fulfilled_items": 2,
    "partial_items": 0,
    "pending_items": 1,
    "items": [
      {
        "billItemId": 456,
        "productId": 789,
        "productName": "Widget Pro",
        "ordered": 25,
        "fulfilled": 25,
        "reserved": 0,
        "pending": 0,
        "fulfillmentStatus": "FULFILLED"
      },
      {
        "billItemId": 457,
        "productId": 790,
        "productName": "Widget Lite",
        "ordered": 15,
        "fulfilled": 0,
        "reserved": 15,
        "pending": 0,
        "fulfillmentStatus": "RESERVED"
      },
      {
        "billItemId": 458,
        "productId": 791,
        "productName": "Widget Plus",
        "ordered": 10,
        "fulfilled": 0,
        "reserved": 0,
        "pending": 10,
        "fulfillmentStatus": "PENDING"
      }
    ]
  }
}
```

**Field Descriptions**:
- `ordered`: Total quantity ordered
- `fulfilled`: Quantity actually used from stock
- `reserved`: Quantity reserved but not yet fulfilled
- `pending`: Quantity not yet allocated or fulfilled
- `fulfillmentStatus`: Current status of the item

**Example**:
```bash
curl -X GET http://localhost:5000/api/bill-stock/status/123 \
  -H "Authorization: Bearer token_here"
```

---

### GET /api/bill-stock/pending/:billId

**Purpose**: Get list of bill items pending stock allocation

**Authentication**: Required

**Path Parameters**:
- `billId` (number): Bill ID

**Response** (200):
```json
{
  "success": true,
  "data": [
    {
      "bill_item_id": 456,
      "product_id": 789,
      "product_name": "Widget Pro",
      "needed": 25,
      "reserved": 0,
      "fulfilled": 0,
      "pending": 25,
      "available": 100
    },
    {
      "bill_item_id": 457,
      "product_id": 790,
      "product_name": "Widget Lite",
      "needed": 15,
      "reserved": 10,
      "fulfilled": 0,
      "pending": 5,
      "available": 20
    }
  ]
}
```

**Field Descriptions**:
- `needed`: Total quantity ordered
- `available`: Total stock available for product
- `pending`: Quantity still to be allocated/fulfilled

**Use Case**: Before auto-allocation, show what's available vs needed

**Example**:
```bash
curl -X GET http://localhost:5000/api/bill-stock/pending/123 \
  -H "Authorization: Bearer token_here"
```

---

### GET /api/bill-stock/linkage

**Purpose**: Report on bill-to-stock linkage

**Authentication**: Required

**Query Parameters**:
- `billType` (string, optional): `PURCHASE` or `SALE`
- `days` (number, optional, default: 30): Last N days

**Response** (200):
```json
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
      "total_quantity": 150,
      "total_value": 7500,
      "stock_direction": "Incoming Stock"
    },
    {
      "bill_id": 124,
      "bill_number": "BILL-002",
      "bill_type": "SALE",
      "status": "PAID",
      "created_at": "2024-04-19T11:00:00Z",
      "linked_stock_entries": 3,
      "total_quantity": 75,
      "total_value": 11250,
      "stock_direction": "Outgoing Stock"
    }
  ]
}
```

**Examples**:
```bash
# All bills in last 30 days
curl -X GET http://localhost:5000/api/bill-stock/linkage \
  -H "Authorization: Bearer token_here"

# Purchase bills in last 60 days
curl -X GET "http://localhost:5000/api/bill-stock/linkage?billType=PURCHASE&days=60" \
  -H "Authorization: Bearer token_here"

# Sales bills in last 7 days
curl -X GET "http://localhost:5000/api/bill-stock/linkage?billType=SALE&days=7" \
  -H "Authorization: Bearer token_here"
```

---

### POST /api/bill-stock/auto-allocate/:billId

**Purpose**: Automatically allocate stock to all pending items in a bill

**Authentication**: Required
**Permission**: `billing:write`

**Path Parameters**:
- `billId` (number): Bill ID

**Request Body**: None

**Response** (200):
```json
{
  "success": true,
  "data": {
    "allocatedItems": 2,
    "failedItems": 1,
    "totalItems": 3,
    "results": [
      {
        "billItemId": 456,
        "status": "success",
        "allocated": 25,
        "shortage": 0
      },
      {
        "billItemId": 457,
        "status": "success",
        "allocated": 15,
        "shortage": 0
      },
      {
        "billItemId": 458,
        "status": "failed",
        "error": "Insufficient stock: available=5, needed=10"
      }
    ]
  },
  "message": "Auto-allocated 2 items, 1 failed"
}
```

**Algorithm**:
```
1. Get all pending bill items
2. For each item:
   a. Call allocateStockToBillItem()
   b. Record result (success/failure)
   c. Continue to next item (don't stop on failure)
3. Return summary with per-item results
```

**Example**:
```bash
curl -X POST http://localhost:5000/api/bill-stock/auto-allocate/123 \
  -H "Authorization: Bearer token_here"
```

---

## Error Response Format

All errors follow this format:

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

**HTTP Status Codes**:
- `201`: Created successfully (POST operations)
- `200`: Success (GET operations, fulfillment)
- `400`: Bad request (validation error, insufficient stock, not found)
- `401`: Unauthorized (missing/invalid token)
- `403`: Forbidden (insufficient permissions)
- `500`: Server error

---

## Request/Response Examples

### Example 1: Complete Purchase Workflow

**Step 1: Create Purchase Bill**
```bash
POST /api/billing/bills
{
  "billType": "PURCHASE",
  "partyId": 5,
  "items": [
    {"partId": 1, "quantity": 100, "unitPrice": 50},
    {"partId": 2, "quantity": 50, "unitPrice": 80}
  ]
}
Response: { "id": 123, "bill_number": "PO-001" }
```

**Step 2: Confirm Bill**
```bash
POST /api/billing/bills/123/confirm
Response: { "status": "CONFIRMED" }
```

**Step 3: Create Stock**
```bash
POST /api/bill-stock/create-stock-from-bill
{
  "billId": 123,
  "locationId": 1
}
Response: {
  "entriesCreated": 2,
  "totalQuantity": 150,
  "totalCost": 8000
}
```

### Example 2: Complete Sales Workflow

**Step 1: Create Sales Bill**
```bash
POST /api/billing/bills
{
  "billType": "SALE",
  "partyId": 10,
  "items": [
    {"partId": 1, "quantity": 30, "unitPrice": 100},
    {"partId": 2, "quantity": 20, "unitPrice": 160}
  ]
}
Response: { "id": 124, "bill_number": "INV-001" }
```

**Step 2: Check Pending**
```bash
GET /api/bill-stock/pending/124
Response: Shows 30 + 20 units needed, available quantities
```

**Step 3: Auto-Allocate**
```bash
POST /api/bill-stock/auto-allocate/124
Response: {
  "allocatedItems": 2,
  "failedItems": 0,
  "results": [
    {"billItemId": 456, "status": "success", "allocated": 30},
    {"billItemId": 457, "status": "success", "allocated": 20}
  ]
}
```

**Step 4: Confirm Bill**
```bash
POST /api/billing/bills/124/confirm
Response: { "status": "CONFIRMED" }
```

**Step 5: Fulfill**
```bash
POST /api/bill-stock/fulfill-item
{ "billItemId": 456 }  // Fulfills all 30 reserved

POST /api/bill-stock/fulfill-item
{ "billItemId": 457 }  // Fulfills all 20 reserved
```

**Step 6: Check Status**
```bash
GET /api/bill-stock/status/124
Response: Shows both items FULFILLED
```

---

## Integration with Frontend

### React Hook Example

```javascript
// Get bill stock status
const useBillStockStatus = (billId) => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(
        `/api/bill-stock/status/${billId}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      const data = await response.json();
      setStatus(data.data);
      setLoading(false);
    };
    
    fetchStatus();
  }, [billId]);

  return { status, loading };
};
```

### Fulfillment Status Component

```javascript
const FulfillmentIndicator = ({ item }) => {
  const percentage = (item.fulfilled / item.ordered) * 100;
  
  return (
    <div>
      <progress value={percentage} max="100" />
      <span>{item.fulfillmentStatus}</span>
      <span>{item.fulfilled} of {item.ordered}</span>
    </div>
  );
};
```


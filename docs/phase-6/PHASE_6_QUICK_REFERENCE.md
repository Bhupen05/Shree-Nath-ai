# Phase 6: Bill-Stock Integration - Quick Reference

## System Overview

**Purpose**: Bidirectional integration between billing and stock management
**Trigger**: Bill confirmation (auto) or manual API calls
**Scope**: Purchase bills → Stock creation, Sales bills → Stock allocation

---

## Quick Facts

- **Database Changes**: 1 migration file (202604190002)
- **New Tables**: None (enhancements to existing)
- **New Columns**: 10 columns across 3 tables
- **New Views**: 3 views
- **New Functions**: 3 database functions
- **New Indexes**: 5 indexes
- **API Endpoints**: 7 new endpoints
- **Service Methods**: 6 public methods
- **Controller Handlers**: 6 handlers

---

## Database Enhancements

### Modified Tables

| Table | New Columns |
|-------|-------------|
| stock_entries | incoming_bill_id, outgoing_bill_id, bill_item_id, status |
| stock_reservations | bill_item_id, fulfilled_from_entry_id, fulfilled_quantity, fulfilled_at |
| bill_items | stock_fulfilled, stock_reserved, fulfillment_status, notes |

### New Views

```
v_bill_stock_status      - Bill item fulfillment status
v_stock_from_bills       - Stock entries linked to bills
v_pending_bill_allocations - Items waiting for allocation
```

### New Functions

```
allocate_stock_to_bill_item()     - FIFO allocation with reservations
fulfill_bill_item_from_reservations() - Convert reservations to fulfillment
create_stock_from_bill()          - Auto-create stock from bills
```

---

## API Endpoints (7 Total)

```
POST   /api/bill-stock/create-stock-from-bill    Create stock from purchase bill
POST   /api/bill-stock/allocate-stock            Allocate stock (FIFO)
POST   /api/bill-stock/fulfill-item              Fulfill from reserved stock
GET    /api/bill-stock/status/:billId            Get bill stock status
GET    /api/bill-stock/pending/:billId           Get pending allocations
GET    /api/bill-stock/linkage                   Get bill-stock report
POST   /api/bill-stock/auto-allocate/:billId     Auto-allocate all items
```

---

## Service Methods (6 Public)

```javascript
createStockFromPurchaseBill(billId, locationId, userId)
allocateStockToBillItem(billItemId, productId, qty, locationId, userId)
fulfillBillItem(billItemId, quantity, userId)
getBillStockStatus(billId)
getPendingAllocations(billId)
getBillStockLinkage(billType, days)
```

---

## Data Flow

### Purchase Bill
```
Bill CONFIRMED
    ↓
createStockFromPurchaseBill()
    ↓
For each item:
  - Create stock_entry (batch = BILL-{id}-ITEM-{id}-{ts})
  - Incoming_bill_id = bill ID
  - Create stock_log (ADD action)
    ↓
Stock available for sales
```

### Sales Bill
```
Bill CONFIRMED
    ↓
allocateStockToBillItem()
    ↓
FIFO Selection:
  - Find oldest batches by created_at
  - Reserve qty from each batch
  - Create stock_reservation
  - Create stock_log (RESERVE action)
    ↓
fulfillBillItem()
    ↓
Convert reservations to fulfilled
  - Update stock_fulfilled
  - Set outgoing_bill_id
  - Create stock_log (FULFILL action)
```

### Bill Cancellation
```
Bill CANCELLED
    ↓
For each item:
  - Get all reservations
  - Set status = CANCELLED
  - Return quantity to stock_entries
  - Update stock_logs
    ↓
Stock available again
```

---

## FIFO Algorithm

```
Query stock_entries:
  WHERE product_id = X
    AND quantity > 0
    AND deleted_at IS NULL
  ORDER BY created_at ASC, id ASC

For each entry:
  allocated = MIN(remaining, entry.quantity)
  Create reservation
  Update entry quantity
  remaining -= allocated
  If remaining = 0: done
```

---

## Fulfillment Status Values

| Status | Meaning |
|--------|---------|
| PENDING | No stock allocated |
| RESERVED | Stock allocated but not yet fulfilled |
| PARTIALLY_FULFILLED | Some stock fulfilled |
| FULFILLED | All stock fulfilled |

---

## Key Validations

| Validation | Where | Error |
|-----------|-------|-------|
| Bill exists | allocate_stock | "Bill not found" |
| Bill type = PURCHASE | create_stock | "Only PURCHASE bills..." |
| Bill status = CONFIRMED | create_stock | "Bill must be CONFIRMED" |
| Bill has items | create_stock | "Bill has no items" |
| Location exists | create_stock | "Location not found" |
| Product matches | allocate_stock | "Product ID mismatch" |
| Sufficient stock | allocate_stock | "Insufficient stock..." |
| Quantity > 0 | allocate_stock | "quantity must be > 0" |
| Quantity available | fulfill_item | "Cannot fulfill X > Y reserved" |

---

## Testing Checklist

- [ ] Unit tests pass: `npm test -- backend/test/unit/bill-stock.service.test.js`
- [ ] Integration tests: `npm test -- backend/test/integration/bill-stock.integration.test.js`
- [ ] Purchase bill workflow: Create → Confirm → Verify stock created
- [ ] Sales bill workflow: Create → Allocate → Fulfill → Verify status
- [ ] FIFO selection: Multiple batches → Oldest selected first
- [ ] Insufficient stock: Bill needs 100, only 50 available
- [ ] Cancellation: Bill cancelled → Reservations released
- [ ] Edge cases: Partial fulfillment, multiple reservations

---

## Common Operations

### Create Stock from Purchase Bill
```bash
curl -X POST http://localhost:5000/api/bill-stock/create-stock-from-bill \
  -H "Authorization: Bearer TOKEN" \
  -d '{"billId": 123, "locationId": 1}' \
  -H "Content-Type: application/json"
```

### Allocate Stock to Sales Item
```bash
curl -X POST http://localhost:5000/api/bill-stock/allocate-stock \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "billItemId": 456,
    "productId": 789,
    "quantity": 25
  }' \
  -H "Content-Type: application/json"
```

### Fulfill Bill Item
```bash
curl -X POST http://localhost:5000/api/bill-stock/fulfill-item \
  -H "Authorization: Bearer TOKEN" \
  -d '{"billItemId": 456}' \
  -H "Content-Type: application/json"
```

### Get Bill Status
```bash
curl -X GET http://localhost:5000/api/bill-stock/status/123 \
  -H "Authorization: Bearer TOKEN"
```

### Auto-Allocate All Items
```bash
curl -X POST http://localhost:5000/api/bill-stock/auto-allocate/123 \
  -H "Authorization: Bearer TOKEN"
```

---

## Useful SQL Queries

### View All Stock from Bills
```sql
SELECT * FROM v_stock_from_bills
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

### Check Bill Fulfillment Status
```sql
SELECT * FROM v_bill_stock_status
WHERE bill_id = 123;
```

### Find Pending Allocations
```sql
SELECT * FROM v_pending_bill_allocations
WHERE pending > 0
ORDER BY bill_id;
```

### Stock Entry Links
```sql
SELECT se.id, se.product_id, b.bill_number, b.bill_type
FROM stock_entries se
LEFT JOIN bills b ON (
  se.incoming_bill_id = b.id OR
  se.outgoing_bill_id = b.id
)
WHERE se.incoming_bill_id IS NOT NULL
   OR se.outgoing_bill_id IS NOT NULL;
```

### Reservations Status
```sql
SELECT 
  sr.bill_item_id,
  sr.status,
  COUNT(*) as count,
  SUM(sr.reserved_quantity) as total_reserved
FROM stock_reservations sr
GROUP BY sr.bill_item_id, sr.status;
```

### Stock Logs for Bill
```sql
SELECT * FROM stock_logs
WHERE reference_id = 123
ORDER BY created_at DESC;
```

---

## Files & Locations

| File | Path | Purpose |
|------|------|---------|
| Migration | `backend/src/db/migrations/202604190002__bill_stock_integration.sql` | Database schema |
| Service | `backend/src/modules/bill-stock/services/bill-stock.service.js` | Business logic |
| Controller | `backend/src/modules/bill-stock/controllers/bill-stock.controller.js` | HTTP handlers |
| Routes | `backend/src/modules/bill-stock/routes/bill-stock.routes.js` | API endpoints |
| Tests | `backend/test/integration/bill-stock.integration.test.js` | Integration tests |
| Docs | `docs/phase-6/` | Documentation (3 files) |

---

## Integration Points in index.js

### Bill Confirmation (Around line 2045)
- Add: Auto-create stock for PURCHASE bills
- Add: Auto-allocate stock for SALES bills

### Bill Cancellation (Around line 2240)
- Add: Release reserved stock

---

## Permission Required

- **Endpoint**: `/api/bill-stock/*`
- **Permission**: `billing:write`
- **Role**: Admin, Manager, Billing Staff

---

## Error Handling

All errors return 400 status with format:
```json
{
  "success": false,
  "error": "Human-readable error message"
}
```

---

## Performance Notes

- FIFO query uses index on `created_at` and `id`
- Allocation is atomic (all or nothing per query)
- Fulfillment updates bill_items status atomically
- No N+1 queries in service methods
- Transaction support for data consistency

---

## Known Limitations

1. **No Expiry-based FEFO**: Uses FIFO, not FEFO (oldest first, not expiring first)
2. **No Cost-based Selection**: FIFO only, no cost optimization
3. **No Batch Splitting**: Reservation is at entry level, not intra-batch
4. **No Location Preference**: All locations searched for FIFO, not preferred first
5. **No Backorder Support**: Cannot split bill across multiple allocations

---

## Future Enhancements

1. **FEFO (First Expiring First Out)**: Prioritize expiring batches
2. **Cost Optimization**: Select batches by lowest cost
3. **Weighted Allocation**: Location/cost/expiry priorities
4. **Auto Reservations**: Reserve on bill creation, not just confirmation
5. **Backorder Management**: Support partial fulfillment workflows

---

## Frequently Asked Questions

### Q: What happens if stock is insufficient?
**A**: Allocation returns shortage info. Bill can proceed but marked as partially allocated. Cannot confirm until sufficient stock available.

### Q: Can I allocate to same item multiple times?
**A**: Yes. Each allocation adds to stock_reserved. Fulfill combines all reservations.

### Q: What if bill is cancelled?
**A**: All reservations are set to CANCELLED status and stock is returned to available pool.

### Q: How is FIFO implemented?
**A**: Stock entries are selected by `ORDER BY created_at ASC, id ASC`, ensuring oldest batches selected first.

### Q: Can I manually create stock entries?
**A**: Yes. Use Phase 5 API. Bill-stock integration uses these entries for allocation.

### Q: What about multiple locations?
**A**: Allocation searches all locations unless locationId specified. Returns entries from nearest or oldest first.

---

## Support & Documentation

- **Implementation Guide**: `PHASE_6_IMPLEMENTATION_GUIDE.md`
- **API Reference**: `PHASE_6_API_REFERENCE.md`
- **Integration Checklist**: `PHASE_6_INTEGRATION_CHECKLIST.md`
- **This File**: `PHASE_6_QUICK_REFERENCE.md`

---

**Version**: 1.0
**Last Updated**: 2024-04-19
**Status**: Ready for Integration

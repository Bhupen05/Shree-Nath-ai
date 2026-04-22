# Phase 6: Bill-Stock Integration Checklist

## Pre-Implementation

### Database Preparation
- [ ] **Backup Production Database**
  - Create backup before any schema changes
  - Verify backup integrity
  - Document backup location and timestamp

- [ ] **Review Existing Data**
  - Check existing bills count: `SELECT COUNT(*) FROM bills;`
  - Check existing bill_items: `SELECT COUNT(*) FROM bill_items;`
  - Check existing stock_entries: `SELECT COUNT(*) FROM stock_entries;`
  - Document baseline for comparison

- [ ] **Test Environment Setup**
  - Create isolated test database
  - Apply existing schema
  - Load test data (sample bills, items, products)

### Code Review
- [ ] **Review Migration File**
  - File: `backend/src/db/migrations/202604190002__bill_stock_integration.sql`
  - Verify table modifications
  - Verify view definitions
  - Verify function implementations
  - No syntax errors in migration

- [ ] **Review Service Code**
  - File: `backend/src/modules/bill-stock/services/bill-stock.service.js`
  - Verify transaction handling
  - Verify error handling
  - Verify FIFO algorithm correctness
  - Check performance implications

- [ ] **Review Controller Code**
  - File: `backend/src/modules/bill-stock/controllers/bill-stock.controller.js`
  - Verify input validation
  - Verify permission checks needed
  - Verify error responses

- [ ] **Review Routes**
  - File: `backend/src/modules/bill-stock/routes/bill-stock.routes.js`
  - Verify endpoint definitions
  - Verify route paths
  - Check for naming conflicts

---

## Database Migration

### Step 1: Execute Migration

- [ ] **Run Migration**
  ```bash
  npm run db:migrate
  # Or manually:
  # psql -U postgres -d shreemath_db -f backend/src/db/migrations/202604190002__bill_stock_integration.sql
  ```

- [ ] **Verify Schema Changes**
  ```sql
  -- Check stock_entries columns
  SELECT column_name FROM information_schema.columns 
  WHERE table_name = 'stock_entries' 
  ORDER BY ordinal_position;
  
  -- Check stock_reservations columns
  SELECT column_name FROM information_schema.columns 
  WHERE table_name = 'stock_reservations' 
  ORDER BY ordinal_position;
  
  -- Check bill_items columns
  SELECT column_name FROM information_schema.columns 
  WHERE table_name = 'bill_items' 
  ORDER BY ordinal_position;
  ```

- [ ] **Verify Views Created**
  ```sql
  SELECT viewname FROM pg_views 
  WHERE viewname LIKE 'v_bill_%' OR viewname LIKE 'v_stock_%';
  ```

- [ ] **Verify Functions Created**
  ```sql
  SELECT proname FROM pg_proc 
  WHERE proname LIKE '%allocate%' 
  OR proname LIKE '%fulfill%' 
  OR proname LIKE '%create_stock%';
  ```

- [ ] **Verify Indexes Created**
  ```sql
  SELECT indexname FROM pg_indexes 
  WHERE tablename IN ('stock_entries', 'stock_reservations', 'bill_items');
  ```

### Step 2: Initialize Data

- [ ] **Add Constraints (if not applied)**
  ```sql
  -- Verify foreign keys exist
  SELECT constraint_name FROM information_schema.table_constraints 
  WHERE table_name = 'stock_entries' AND constraint_type = 'FOREIGN KEY';
  ```

- [ ] **Test Views**
  ```sql
  -- Each view should return without errors
  SELECT COUNT(*) FROM v_bill_stock_status;
  SELECT COUNT(*) FROM v_stock_from_bills;
  SELECT COUNT(*) FROM v_pending_bill_allocations;
  ```

- [ ] **Create Test Bill Data**
  ```sql
  -- Insert test PURCHASE bill if none exist
  INSERT INTO bills (bill_type, bill_number, status, party_id, created_by)
  VALUES ('PURCHASE', 'TEST-001', 'CONFIRMED', 1, 1);
  ```

---

## Backend Integration

### Step 1: Mount Routes

- [ ] **Update backend/src/index.js**
  - Add require statement (around line 1900):
    ```javascript
    const billStockRoutes = require('./modules/bill-stock/routes/bill-stock.routes');
    ```
  - Add route mounting:
    ```javascript
    app.use('/api/bill-stock', requireAuth, billStockRoutes);
    ```
  - Verify syntax and no duplicate routes

- [ ] **Test Route Loading**
  ```bash
  npm start
  # Should start without errors
  # Check console for "Server running on port 5000"
  ```

- [ ] **Verify Routes Mounted**
  ```bash
  curl http://localhost:5000/api/bill-stock/status/1 \
    -H "Authorization: Bearer invalid_token"
  # Should return 401 (token validation error, not 404)
  ```

### Step 2: Update Bill Endpoints

- [ ] **Update Bill Confirmation Endpoint**
  - File: `backend/src/index.js` (around line 2045)
  - After existing bill confirmation logic, add:
    ```javascript
    // AUTO-CREATE STOCK FROM PURCHASE BILLS (Phase 6)
    if (bill.bill_type === 'PURCHASE' && bill.status === 'CONFIRMED') {
      try {
        const billStockService = require('./modules/bill-stock/services/bill-stock.service');
        const result = await billStockService.createStockFromPurchaseBill(
          billId,
          1, // defaultLocationId
          req.user.userId
        );
        console.log('[Stock Auto-Create]', result.message);
      } catch (error) {
        console.error('[Stock Auto-Create Error]', error.message);
        // Don't fail bill confirmation if stock creation fails
      }
    }
    
    // AUTO-ALLOCATE STOCK FOR SALES BILLS (Phase 6)
    if (bill.bill_type === 'SALE' && bill.status === 'CONFIRMED') {
      try {
        const billStockService = require('./modules/bill-stock/services/bill-stock.service');
        const itemsResult = await client.query(
          'SELECT id, part_id, quantity FROM bill_items WHERE bill_id = $1',
          [billId]
        );
        
        for (const item of itemsResult.rows) {
          try {
            const allocResult = await billStockService.allocateStockToBillItem(
              item.id,
              item.part_id,
              item.quantity,
              null,
              req.user.userId
            );
            
            if (allocResult.allocated > 0) {
              // Fulfill the allocated amount
              await billStockService.fulfillBillItem(
                item.id,
                allocResult.allocated,
                req.user.userId
              );
            }
          } catch (error) {
            console.warn(`[Stock Allocation Error] Item ${item.id}:`, error.message);
          }
        }
      } catch (error) {
        console.error('[Stock Allocation Error]', error.message);
      }
    }
    ```

- [ ] **Update Bill Cancellation Endpoint**
  - File: `backend/src/index.js` (around line 2240)
  - Add stock release logic:
    ```javascript
    // RELEASE RESERVED STOCK (Phase 6)
    if (bill.status === 'CANCELLED') {
      try {
        const billStockService = require('./modules/bill-stock/services/bill-stock.service');
        
        // Get all bill items
        const itemsResult = await client.query(
          'SELECT id FROM bill_items WHERE bill_id = $1',
          [billId]
        );
        
        // Release reservations
        for (const item of itemsResult.rows) {
          await client.query(
            `UPDATE stock_reservations
             SET status = 'CANCELLED'
             WHERE bill_item_id = $1 AND status IN ('RESERVED', 'PARTIALLY_FULFILLED')`,
            [item.id]
          );
          
          // Return stock to available
          await client.query(
            `UPDATE stock_entries
             SET quantity = quantity + (
               SELECT COALESCE(SUM(reserved_quantity), 0) FROM stock_reservations
               WHERE bill_item_id = $1 AND status = 'CANCELLED'
             )
             WHERE id IN (
               SELECT stock_entry_id FROM stock_reservations
               WHERE bill_item_id = $1 AND status = 'CANCELLED'
             )`,
            [item.id]
          );
        }
      } catch (error) {
        console.error('[Stock Release Error]', error.message);
      }
    }
    ```

### Step 3: Add Permissions (if using RBAC)

- [ ] **Verify Permission Entries**
  - Check that `billing:write` permission is assigned to roles that should manage stock
  - Verify in database:
    ```sql
    SELECT * FROM permissions WHERE permission_name = 'billing:write';
    SELECT * FROM role_permissions WHERE permission_id = (
      SELECT id FROM permissions WHERE permission_name = 'billing:write'
    );
    ```

---

## Testing

### Step 1: Unit Testing

- [ ] **Run Service Tests**
  ```bash
  npm test -- backend/test/unit/bill-stock.service.test.js
  # Expected: All tests pass
  ```

- [ ] **Test Error Handling**
  - Verify invalid billId handling
  - Verify insufficient stock handling
  - Verify product mismatch handling

### Step 2: Integration Testing

- [ ] **Run Integration Tests**
  ```bash
  npm test -- backend/test/integration/bill-stock.integration.test.js
  # Expected: All tests pass or expected failures documented
  ```

- [ ] **Test Complete Workflows**
  - See "Manual Testing" section

### Step 3: Manual Testing - Purchase Bill

- [ ] **Create Purchase Bill**
  ```bash
  curl -X POST http://localhost:5000/api/billing/bills \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "billType": "PURCHASE",
      "partyId": 1,
      "items": [
        {"partId": 1, "quantity": 50, "unitPrice": 100}
      ]
    }'
  # Response: { "id": 999, "bill_number": "PO-XXX" }
  ```

- [ ] **Confirm Purchase Bill**
  ```bash
  curl -X POST http://localhost:5000/api/billing/bills/999/confirm \
    -H "Authorization: Bearer YOUR_TOKEN"
  # Response: { "status": "CONFIRMED" }
  ```

- [ ] **Verify Stock Created**
  ```bash
  curl -X GET "http://localhost:5000/api/inventory/stock/entries" \
    -H "Authorization: Bearer YOUR_TOKEN"
  # Should show new stock entry with incoming_bill_id = 999
  ```

- [ ] **Check via SQL**
  ```sql
  SELECT * FROM stock_entries WHERE incoming_bill_id = 999;
  SELECT * FROM stock_logs WHERE reference_id = 999;
  ```

### Step 4: Manual Testing - Sales Bill

- [ ] **Create Sales Bill**
  ```bash
  curl -X POST http://localhost:5000/api/billing/bills \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "billType": "SALE",
      "partyId": 2,
      "items": [
        {"partId": 1, "quantity": 20, "unitPrice": 150}
      ]
    }'
  # Response: { "id": 1000, "bill_number": "INV-XXX" }
  ```

- [ ] **Check Pending Allocations**
  ```bash
  curl -X GET http://localhost:5000/api/bill-stock/pending/1000 \
    -H "Authorization: Bearer YOUR_TOKEN"
  # Should show 20 units needed, available quantity
  ```

- [ ] **Confirm Sales Bill**
  ```bash
  curl -X POST http://localhost:5000/api/billing/bills/1000/confirm \
    -H "Authorization: Bearer YOUR_TOKEN"
  # Response: { "status": "CONFIRMED" }
  ```

- [ ] **Verify Stock Allocated**
  ```bash
  curl -X GET http://localhost:5000/api/bill-stock/status/1000 \
    -H "Authorization: Bearer YOUR_TOKEN"
  # Should show fulfillment status for each item
  ```

- [ ] **Check Reservations**
  ```sql
  SELECT * FROM stock_reservations 
  WHERE bill_item_id IN (
    SELECT id FROM bill_items WHERE bill_id = 1000
  );
  ```

### Step 5: Manual Testing - Edge Cases

- [ ] **Test Insufficient Stock**
  ```bash
  # Create bill needing more than available
  curl -X POST http://localhost:5000/api/billing/bills ...
  
  # Confirm and verify error
  curl -X POST http://localhost:5000/api/billing/bills/ID/confirm ...
  # Should return error about insufficient stock
  ```

- [ ] **Test Multiple Allocations**
  ```bash
  # Allocate stock multiple times to same bill item
  # Verify FIFO order respected
  ```

- [ ] **Test Bill Cancellation**
  ```bash
  # Confirm sales bill
  # Cancel bill
  # Verify reservations released
  # Verify stock returned to available
  ```

- [ ] **Test FIFO Selection**
  ```sql
  -- Create stock with known creation times
  -- Verify oldest batches selected first
  ```

---

## Frontend Integration

### Step 1: Update Bill Creation Form

- [ ] **Add Stock Availability Check**
  - When user selects product in bill form
  - Show current available stock
  - Warn if insufficient stock

- [ ] **Add Stock Status Display**
  - Show fulfillment status for each item
  - Display progress bar: fulfilled/total

### Step 2: Update Bill Detail View

- [ ] **Add Fulfillment Tab**
  - Show stock allocation status
  - Show FIFO batch allocation
  - Display reserved vs fulfilled quantities

- [ ] **Add Stock Linkage**
  - Show which batches used for this bill
  - Link to source bill (if from purchase)

### Step 3: Add Bill-Stock Dashboard

- [ ] **Create New Dashboard Component**
  - Show pending allocations
  - Show fulfillment status by product
  - Show stock in/out by bill

---

## Documentation

- [ ] **API Documentation**
  - File: `docs/phase-6/PHASE_6_API_REFERENCE.md` ✅ Created

- [ ] **Implementation Guide**
  - File: `docs/phase-6/PHASE_6_IMPLEMENTATION_GUIDE.md` ✅ Created

- [ ] **Database Schema Changes**
  - Document new tables/columns
  - Document new views
  - Document new functions

- [ ] **Integration Points**
  - Document bill confirmation updates
  - Document bill cancellation updates
  - Document data flow diagrams

---

## Performance & Monitoring

### Step 1: Performance Testing

- [ ] **Load Test FIFO Allocation**
  - Allocate stock to 1000 items
  - Measure allocation time
  - Verify no performance degradation

- [ ] **Test Large Bills**
  - Create bill with 100+ items
  - Verify confirmation time reasonable
  - Monitor database queries

### Step 2: Monitoring Setup

- [ ] **Query Monitoring**
  ```sql
  -- Monitor slow queries (>1 second)
  SELECT * FROM pg_stat_statements
  WHERE query LIKE '%stock%'
  ORDER BY mean_time DESC;
  ```

- [ ] **Table Statistics**
  ```sql
  -- Check table sizes
  SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
  FROM pg_tables
  WHERE schemaname NOT IN ('pg_catalog', 'information_schema');
  ```

- [ ] **Index Usage**
  ```sql
  -- Check if indexes are used
  SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan
  FROM pg_stat_user_indexes
  WHERE tablename IN ('stock_entries', 'stock_reservations', 'bill_items')
  ORDER BY idx_scan DESC;
  ```

---

## Deployment

### Pre-Deployment

- [ ] **Code Review**
  - All code reviewed by team
  - No breaking changes to existing APIs
  - No data loss risks

- [ ] **Testing Complete**
  - All tests passing
  - Manual testing completed
  - Edge cases tested

- [ ] **Database Backup**
  - Full backup created
  - Backup tested for restore
  - Backup location documented

### Deployment Steps

- [ ] **Step 1: Deploy Database**
  ```bash
  npm run db:migrate
  ```

- [ ] **Step 2: Deploy Code**
  ```bash
  npm install
  npm run build
  npm restart
  ```

- [ ] **Step 3: Verify Deployment**
  ```bash
  curl http://localhost:5000/api/bill-stock/status/1 \
    -H "Authorization: Bearer test_token"
  # Should return valid response (not 404)
  ```

- [ ] **Step 4: Monitor Logs**
  ```bash
  tail -f /var/log/backend.log
  # Watch for any errors related to bill-stock operations
  ```

### Post-Deployment

- [ ] **Smoke Tests**
  - Create test purchase bill
  - Create test sales bill
  - Verify stock allocation works
  - Verify no errors in logs

- [ ] **Performance Check**
  - Check response times
  - Monitor resource usage
  - Verify no database locks

- [ ] **User Communication**
  - Notify users of new features
  - Document new workflows
  - Provide support documentation

---

## Rollback Plan

If issues found after deployment:

- [ ] **Immediate Actions**
  - Stop using bill-stock endpoints
  - Revert to previous code version
  - No database rollback needed (schema changes backward compatible)

- [ ] **If Rollback Required**
  ```bash
  # Revert code deployment
  git revert <commit_hash>
  npm restart
  
  # Database rollback (if needed)
  npm run db:rollback
  ```

---

## Success Criteria

- [ ] All tests passing
- [ ] Manual workflows completed successfully
- [ ] No performance degradation
- [ ] Stock allocation using FIFO
- [ ] Audit trail complete (stock_logs)
- [ ] Bill-stock linkage working
- [ ] Edge cases handled
- [ ] Documentation complete
- [ ] Team trained on new workflows
- [ ] Monitoring in place

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Stock entries not created | Check bill status is CONFIRMED |
| Allocation failing | Check available stock quantity |
| Routes not mounting | Check syntax in index.js |
| Tests failing | Check database migration executed |
| Performance issues | Check indexes created and used |
| Data mismatch | Check stock_logs for audit trail |

### Support Contacts

- Backend Team: [contact info]
- Database Team: [contact info]
- QA Team: [contact info]

---

## Sign-Off

- [ ] **Code Review Complete**
  - Reviewed by: ________________
  - Date: ____________________

- [ ] **QA Approval**
  - Tested by: ________________
  - Date: ____________________

- [ ] **Deployment Approved**
  - Approved by: ________________
  - Date: ____________________

- [ ] **Deployment Complete**
  - Deployed by: ________________
  - Date: ____________________

---

**Document Version**: 1.0
**Last Updated**: 2024-04-19
**Next Review**: After Phase 6 deployment

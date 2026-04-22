# 🔗 BACKEND INTEGRATION INSTRUCTIONS

**CRITICAL: DO THIS BEFORE PHASE 6**

This document provides step-by-step instructions to integrate Phase 5 stock routes into the main Express application.

---

## ⚠️ REQUIREMENT

The stock routes are CREATED but NOT YET MOUNTED in the main Express app (`index.js`).

**Status:** 
- ✅ Stock module complete (routes, controllers, services)
- ❌ Routes NOT mounted in main app
- ❌ Database migration NOT run
- ❌ Cannot call /api/inventory/stock/* endpoints yet

---

## 🔧 INTEGRATION STEPS

### Step 1: Mount Routes in index.js

**File:** `backend/src/index.js`

**Location:** Around line 1900-2000 (where other routes are mounted)

**Add this code:**

```javascript
// ============================================
// PHASE 5: STOCK MANAGEMENT ROUTES
// ============================================

// Import stock routes
const stockRoutes = require('./modules/stock/routes/stock.routes');

// Mount stock routes with authentication
// All stock endpoints require JWT token + inventory permissions
app.use('/api/inventory/stock', requireAuth, stockRoutes);

// Stock endpoints are now available at:
// POST   /api/inventory/stock/entries
// GET    /api/inventory/stock/entries
// GET    /api/inventory/stock/entries/:id
// PUT    /api/inventory/stock/entries/:id
// DELETE /api/inventory/stock/entries/:id
// GET    /api/inventory/stock/product/:id
// GET    /api/inventory/stock/location/:id
// GET    /api/inventory/stock/low
// GET    /api/inventory/stock/expiring
// GET    /api/inventory/stock/value
// POST   /api/inventory/stock/transfer
// POST   /api/inventory/stock/adjust
// GET    /api/inventory/stock/logs
// GET    /api/inventory/stock/logs/:id
// POST   /api/inventory/locations
// GET    /api/inventory/locations
// GET    /api/inventory/locations/tree
// GET    /api/inventory/locations/:id
// PUT    /api/inventory/locations/:id
// DELETE /api/inventory/locations/:id
```

**Where to add it:**

Find this section in index.js (around line 1900):
```javascript
// ============================================
// BILLING ROUTES
// ============================================
app.use('/api/billing', requireAuth, billRoutes);
```

Add the stock routes RIGHT AFTER billing routes.

### Step 2: Verify Imports

At the top of `index.js` with other requires, verify this line exists:

```javascript
const { Pool } = require('pg');  // Should already exist
const pool = new Pool(poolConfig);  // Should already exist
```

No changes needed here - `pool` is already available.

### Step 3: Run Database Migration

```bash
cd backend

# Run migration to create all tables, views, functions
npm run db:migrate

# Or manually:
psql -d shree_nath_db < src/db/migrations/202604190001__stock_management.sql
```

**Verify:** All 6 tables created

```bash
psql -d shree_nath_db -c "\dt stock*"

# Should show:
# - locations
# - stock_entries
# - stock_logs
# - low_stock_alerts
# - location_transfer_history
# - stock_reservations
```

### Step 4: Restart Backend Server

```bash
# Kill existing server (Ctrl+C if running)

# Restart
npm run dev

# Verify startup with no errors
# Should see: "Server is running on port 5000"
```

### Step 5: Test Integration

```bash
# 1. Get authentication token
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@test.com", "password": "password"}'

# Response:
# {
#   "token": "eyJhbGc..."
# }

# 2. Use token to test stock endpoint
TOKEN="eyJhbGc..."

curl http://localhost:5000/api/inventory/stock/entries \
  -H "Authorization: Bearer $TOKEN"

# Expected: 200 OK with array of entries (empty if first time)
# Or: 401 Unauthorized if token invalid
```

---

## 🔍 VERIFICATION CHECKLIST

After integration, verify:

- [ ] Server starts without errors
- [ ] No "Cannot find module" errors
- [ ] No "Cannot read property 'use'" errors
- [ ] Can call GET /api/inventory/stock/entries with token → 200 OK
- [ ] Can call POST /api/inventory/stock/entries with token → 201 Created
- [ ] Can call GET /api/inventory/locations with token → 200 OK
- [ ] Invalid token returns 401 Unauthorized
- [ ] No token returns 401 Unauthorized
- [ ] Frontend can load StockManagement component
- [ ] Frontend form can fetch locations and products

---

## 🚨 COMMON ERRORS & FIXES

### Error 1: "Cannot find module './modules/stock/routes/stock.routes'"

**Cause:** File not found or wrong path

**Fix:**
```bash
# Verify file exists
ls -la backend/src/modules/stock/routes/stock.routes.js

# If not, check module was created
ls -la backend/src/modules/stock/

# Should see: controllers/, services/, validations/, routes/
```

### Error 2: "requireAuth is not defined"

**Cause:** Missing import or wrong scope

**Fix:**
```javascript
// Verify at top of index.js:
const { requireAuth, requirePermission } = require('./middleware/auth');

// Or if using inline:
function requireAuth(req, res, next) {
  // ... existing implementation
}

// Then use:
app.use('/api/inventory/stock', requireAuth, stockRoutes);
```

### Error 3: "Cannot read property 'query' of undefined" (pool error)

**Cause:** Database pool not initialized

**Fix:**
```javascript
// Verify pool is created (should already exist):
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // ... other config
});

// Export it if needed:
module.exports = { pool };
```

### Error 4: "relation 'stock_entries' does not exist"

**Cause:** Migration not run

**Fix:**
```bash
# Run migration
npm run db:migrate

# Or check if migration file exists:
ls -la backend/src/db/migrations/202604190001__stock_management.sql
```

### Error 5: "GET /api/inventory/stock/entries returns 404"

**Cause:** Routes not mounted

**Fix:**
```javascript
// Verify in index.js:
const stockRoutes = require('./modules/stock/routes/stock.routes');
app.use('/api/inventory/stock', requireAuth, stockRoutes);

// Verify order - should be BEFORE:
// app.listen() or app.use('*', ...) or final error handler
```

---

## 📋 FULL CODE SNIPPET TO COPY

If you prefer to copy-paste, here's the complete addition to index.js:

**Location:** After billing routes (around line 1920)

```javascript
// ============================================
// PHASE 5: STOCK MANAGEMENT ROUTES
// ============================================
// File: backend/src/modules/stock/routes/stock.routes.js
// Provides 21 endpoints for stock management:
// - Stock entry CRUD (5 endpoints)
// - Stock queries (5 endpoints)
// - Stock operations (2 endpoints)
// - Audit logs (2 endpoints)
// - Location management (6 endpoints)

const stockRoutes = require('./modules/stock/routes/stock.routes');

// Mount with authentication required
// Each request must include Authorization header with Bearer token
// Permissions checked per endpoint (inventory:read, inventory:write)
app.use('/api/inventory/stock', requireAuth, stockRoutes);

// ============================================
// END PHASE 5 ROUTES
// ============================================
```

---

## 🧪 POST-INTEGRATION TEST SCRIPT

Run this after integration to verify everything works:

```bash
#!/bin/bash

API="http://localhost:5000"
TOKEN="your-test-token-here"

echo "🧪 Testing Stock API Integration..."

# Test 1: List locations
echo "Test 1: GET /api/inventory/locations"
curl -s "$API/api/inventory/locations" \
  -H "Authorization: Bearer $TOKEN" | jq .

# Test 2: List stock entries
echo "Test 2: GET /api/inventory/stock/entries"
curl -s "$API/api/inventory/stock/entries" \
  -H "Authorization: Bearer $TOKEN" | jq .

# Test 3: Get low stock
echo "Test 3: GET /api/inventory/stock/low"
curl -s "$API/api/inventory/stock/low" \
  -H "Authorization: Bearer $TOKEN" | jq .

# Test 4: Get expiring stock
echo "Test 4: GET /api/inventory/stock/expiring"
curl -s "$API/api/inventory/stock/expiring" \
  -H "Authorization: Bearer $TOKEN" | jq .

# Test 5: Get total value
echo "Test 5: GET /api/inventory/stock/value"
curl -s "$API/api/inventory/stock/value" \
  -H "Authorization: Bearer $TOKEN" | jq .

echo "✅ All tests completed!"
```

Save as `test-stock-integration.sh` and run:
```bash
chmod +x test-stock-integration.sh
./test-stock-integration.sh
```

---

## 📞 PERMISSION CONFIGURATION

Stock endpoints require specific permissions. Verify they're set up:

```sql
-- Check if permissions exist:
SELECT * FROM permissions WHERE name LIKE '%inventory%';

-- If missing, insert them:
INSERT INTO permissions (name, description) VALUES
('inventory:read', 'Read inventory and stock data'),
('inventory:write', 'Create, update, delete inventory and stock');

-- Assign to roles:
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name IN ('MANAGER', 'ADMIN')
AND p.name IN ('inventory:read', 'inventory:write');
```

---

## 🔄 DATABASE MIGRATION DETAILS

### What the migration creates:

**Tables (6):**
1. `locations` - Room/Cabinet/Section hierarchy
2. `stock_entries` - Batch-level inventory
3. `stock_logs` - Audit trail (immutable)
4. `low_stock_alerts` - Threshold monitoring
5. `location_transfer_history` - Movement tracking
6. `stock_reservations` - Bill integration

**Views (4):**
1. `v_product_stock` - Total stock per product
2. `v_stock_by_location` - Stock by location
3. `v_expiring_stock_soon` - Expiring items
4. `v_low_stock_current` - Low stock items

**Functions (3):**
1. `add_stock_entry()` - Safe stock addition
2. `remove_stock_entry()` - Safe stock removal
3. `transfer_stock()` - Safe location transfer

**Indexes (7):**
- Optimized for common queries
- On product_id, location_id, batch_number, expiry_date, deleted_at

---

## ✅ FINAL CHECKLIST

Before declaring Phase 5 complete:

- [ ] Routes imported and mounted in index.js
- [ ] Server starts with `npm run dev`
- [ ] No errors in console on startup
- [ ] Database migration executed successfully
- [ ] All 6 tables created in PostgreSQL
- [ ] All 4 views created
- [ ] All 3 functions created
- [ ] Can authenticate with valid token
- [ ] Can call /api/inventory/stock/entries with token → 200
- [ ] Frontend component loads without errors
- [ ] Frontend can fetch locations dropdown
- [ ] Frontend can submit add stock form
- [ ] Success notification displays on add
- [ ] Stock list shows entries
- [ ] All unit tests pass
- [ ] All integration tests pass

---

## 🎉 COMPLETION CONFIRMATION

Once you've completed these steps, Phase 5 is **PRODUCTION READY**:

```
✅ Database schema created
✅ Backend API endpoints working
✅ Frontend components functional
✅ Tests passing
✅ Documentation complete
✅ Integration complete
```

**Next Phase:** Phase 6 - Bill-to-Stock Integration

---

*Integration Checklist v1.0*  
*Phase 5 - Stock Management Foundation*  
*April 19, 2026*

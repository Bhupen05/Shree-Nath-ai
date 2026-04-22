# PHASE 5 SETUP & INTEGRATION GUIDE

**Last Updated:** April 19, 2026  
**Status:** Ready for Integration Testing

---

## 📋 QUICK START

### Prerequisites
- Node.js 18+
- PostgreSQL 13+
- npm or yarn
- Valid JWT token for testing

### Step 1: Prepare Database (5 minutes)

```bash
# 1. Ensure PostgreSQL is running
psql --version  # Should show version 13+

# 2. Create/verify database connection
# Update backend/.env with your database credentials:
# DATABASE_URL=postgres://user:password@localhost:5432/shree_nath_db

# 3. Run migrations to create schema
cd backend
npm run db:migrate

# 4. Verify tables created
psql -d shree_nath_db -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public';"

# Should show new tables:
# - locations
# - stock_entries
# - stock_logs
# - low_stock_alerts
# - location_transfer_history
# - stock_reservations
```

### Step 2: Start Backend (5 minutes)

```bash
# 1. Install dependencies (if not done)
cd backend
npm install

# 2. Start development server
npm run dev

# 3. Verify server is running
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"

# Should return user info (or 401 if token invalid)
```

### Step 3: Start Frontend (5 minutes)

```bash
# 1. Install dependencies
cd frontend
npm install

# 2. Start dev server
npm run dev

# 3. Open browser
# Navigate to http://localhost:5173
# Login with test credentials
```

### Step 4: Test Stock Module (10 minutes)

**Via API (curl):**

```bash
# Get stock entries
curl http://localhost:5000/api/inventory/stock/entries \
  -H "Authorization: Bearer YOUR_TOKEN"

# Add stock entry
curl -X POST http://localhost:5000/api/inventory/stock/entries \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": 1,
    "location_id": 1,
    "quantity": 50,
    "batch_number": "BATCH-001"
  }'
```

**Via UI:**

1. Navigate to Stock Management (in sidebar)
2. Click "Add Stock" tab
3. Fill form:
   - Product: Select from dropdown
   - Location: Select from dropdown
   - Quantity: 50
   - Batch Number: BATCH-001
4. Click "Add Stock Entry"
5. Verify success message

---

## 🔧 INTEGRATION WITH MAIN APP

### Required: Mount Stock Routes in Express

**File:** `backend/src/index.js`

**Location:** Near other route imports (around line 200)

```javascript
// Add these imports at the top with other route imports
const stockRoutes = require('./modules/stock/routes/stock.routes');
const locationRoutes = require('./modules/stock/routes/stock.routes'); // Same file exports both

// Add this middleware AFTER authentication setup (around line 1000)
// Mount stock API routes
app.use('/api/inventory/stock', requireAuth, stockRoutes);

// Note: requireAuth middleware will be automatically applied
// requirePermission checks happen per endpoint
```

**Verification:**

```bash
# After adding routes, restart backend
npm run dev

# Test if routes are mounted
curl http://localhost:5000/api/inventory/stock/entries \
  -H "Authorization: Bearer YOUR_TOKEN"

# Should return 200 with data or 401 if token invalid
```

---

## 📚 DATABASE SCHEMA REFERENCE

### Tables Created

#### `locations`
- Stores room/cabinet/section hierarchy
- Columns: id, parent_id, name, type (ROOM/CABINET/SECTION), capacity, used_capacity

#### `stock_entries`
- Batch-level inventory tracking
- Columns: id, product_id, location_id, quantity, batch_number, supplier_id, expiry_date, unit_cost, incoming_bill_id, created_by, deleted_at

#### `stock_logs`
- Immutable audit trail (INSERT-ONLY, never UPDATE/DELETE)
- Columns: id, entry_id, action (ADD/REMOVE/TRANSFER), quantity_delta, reference_id, performed_by, reason, created_at

#### `low_stock_alerts`
- Monitor items below threshold
- Columns: id, product_id, location_id, threshold, current_stock, last_notified_at

#### `location_transfer_history`
- Track stock movements
- Columns: id, entry_id, from_location_id, to_location_id, quantity, reason, created_by, created_at

#### `stock_reservations`
- Reserve stock for bills (prevents overbooking)
- Columns: id, stock_entry_id, bill_id, reserved_quantity, status (RESERVED/FULFILLED/CANCELLED)

### Views Created

```sql
-- v_product_stock: Total stock per product
SELECT product_id, SUM(quantity) as total_stock

-- v_stock_by_location: Stock organized by location
SELECT location_id, SUM(quantity) as location_stock

-- v_expiring_stock_soon: Items expiring within 30 days
SELECT * FROM stock_entries WHERE expiry_date BETWEEN TODAY AND TODAY+30

-- v_low_stock_current: Items below threshold
SELECT * FROM low_stock_alerts WHERE current_stock <= threshold

-- v_location_hierarchy: Nested location structure
SELECT * hierarchically from locations
```

### Functions Created

```sql
-- add_stock_entry(product_id, location_id, quantity, batch_number, ...)
-- Handles: validation, audit logging, alert creation

-- remove_stock_entry(entry_id, quantity_to_remove, reason, ...)
-- Handles: FIFO removal, stock validation, logging

-- transfer_stock(entry_id, to_location_id, reason, ...)
-- Handles: location validation, movement tracking, logging
```

---

## 🔐 PERMISSIONS REQUIRED

The following permissions must be configured for users to use stock endpoints:

| Permission | Required For |
|-----------|---|
| `inventory:read` | View stock, locations, reports |
| `inventory:write` | Add/update/delete stock, create locations |

**Check in Database:**

```sql
SELECT * FROM permissions WHERE name LIKE '%inventory%';
```

**Assign to Role:**

```sql
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r, permissions p
WHERE r.name = 'MANAGER' 
AND p.name IN ('inventory:read', 'inventory:write');
```

---

## 🧪 TESTING CHECKLIST

### Unit Tests (5 minutes)

```bash
cd backend
npm run test:unit

# Should show:
# ✓ Stock Service - Validation
# ✓ Stock Service - Add Stock Entry
# ✓ Stock Service - Get Stock
# ✓ Stock Service - Stock Queries
```

### Integration Tests (5 minutes)

```bash
# Make sure backend is running first
npm run test:integration

# Should show:
# ✓ Stock API Integration - multiple tests
```

### Manual API Tests (15 minutes)

```bash
# 1. List locations
curl http://localhost:5000/api/inventory/locations \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected response:
# {
#   "success": true,
#   "data": [ { id, name, type, ... }, ... ]
# }

# 2. List stock entries
curl http://localhost:5000/api/inventory/stock/entries \
  -H "Authorization: Bearer YOUR_TOKEN"

# 3. Get low stock items
curl http://localhost:5000/api/inventory/stock/low \
  -H "Authorization: Bearer YOUR_TOKEN"

# 4. Get expiring stock (30 days)
curl http://localhost:5000/api/inventory/stock/expiring \
  -H "Authorization: Bearer YOUR_TOKEN"

# 5. Get total inventory value
curl http://localhost:5000/api/inventory/stock/value \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Manual UI Tests (15 minutes)

1. **Add Stock Form**
   - [ ] Load Add Stock tab
   - [ ] Dropdown selectors work
   - [ ] Form validation works
   - [ ] Submit creates stock
   - [ ] Success message shows

2. **Stock List**
   - [ ] Loads list of entries
   - [ ] Shows pagination
   - [ ] Can sort columns
   - [ ] Can filter by product/location

3. **Location Picker**
   - [ ] Loads ROOM entries
   - [ ] Selects CABINET for chosen room
   - [ ] Selects SECTION for chosen cabinet
   - [ ] Hierarchy validation works

---

## 🚀 DEPLOYMENT CHECKLIST

Before deploying to production:

- [ ] Database migrations applied
- [ ] All tests passing (unit + integration)
- [ ] Environment variables configured
- [ ] Error logging set up
- [ ] Backup strategy in place
- [ ] Permission model verified
- [ ] API rate limiting configured
- [ ] CORS settings correct
- [ ] Frontend built (npm run build)
- [ ] Load testing completed

---

## 📊 PERFORMANCE TUNING

### Database Optimization

```sql
-- These indexes are created by migration
-- Verify they exist:
SELECT * FROM pg_indexes WHERE tablename LIKE 'stock_%';

-- Expected indexes:
-- - stock_entries(product_id)
-- - stock_entries(location_id)
-- - stock_entries(batch_number)
-- - stock_entries(expiry_date)
-- - stock_entries(deleted_at)
-- - stock_logs(entry_id)
-- - stock_logs(created_at)
```

### Application Optimization

```javascript
// Connection pooling (already configured in db.js)
const pool = new Pool({
  max: 20,        // Max connections
  min: 5,         // Min connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Query optimization example
// ❌ Bad: N+1 query problem
for (const product of products) {
  const stock = await pool.query('SELECT * FROM stock WHERE product_id = $1', [product.id]);
}

// ✅ Good: Single query with JOIN
const stock = await pool.query(`
  SELECT p.id, p.name, SUM(s.quantity) as total
  FROM products p
  LEFT JOIN stock_entries s ON s.product_id = p.id
  GROUP BY p.id
`);
```

---

## 🐛 TROUBLESHOOTING

### Issue: "Database connection failed"

```bash
# 1. Check PostgreSQL is running
psql --version

# 2. Check connection string in .env
echo $DATABASE_URL

# 3. Test connection manually
psql $DATABASE_URL -c "SELECT 1"

# 4. Check port (default 5432)
lsof -i :5432
```

### Issue: "Migration files not found"

```bash
# 1. Check migration directory exists
ls -la backend/src/db/migrations/

# 2. Verify file was created
ls -la backend/src/db/migrations/202604190001*

# 3. Check db.js has correct path
grep -n "migrations" backend/src/db.js
```

### Issue: "API returns 401 Unauthorized"

```bash
# 1. Get valid token
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}'

# 2. Copy token from response

# 3. Use in requests
curl http://localhost:5000/api/inventory/stock/entries \
  -H "Authorization: Bearer PASTE_TOKEN_HERE"
```

### Issue: "Frontend can't reach backend"

```javascript
// Check API_URL in frontend/src/components/Stock/StockManagement.jsx
const API_URL = `${window.location.protocol}//${window.location.hostname}:5000`;

// Should be:
// Development: http://localhost:5000
// Production: https://yourdomain.com (backend on same domain)

// Test from browser console:
fetch('http://localhost:5000/api/auth/me', {
  headers: { 'Authorization': 'Bearer YOUR_TOKEN' }
}).then(r => r.json()).then(console.log);
```

---

## 📞 QUICK REFERENCE

| Command | Purpose |
|---------|---------|
| `npm run db:migrate` | Run database migrations |
| `npm run dev` | Start backend dev server |
| `npm run build` | Build for production |
| `npm test` | Run all tests |
| `npm run test:unit` | Run unit tests only |
| `npm run test:integration` | Run integration tests |
| `npm run lint` | Check code quality |

---

## 📞 NEXT STEPS

### Immediate (Today)

1. ✅ Apply database migrations
2. ✅ Start backend server
3. ✅ Start frontend server
4. ✅ Test basic API endpoints
5. ✅ Create test data

### Short Term (This Week)

1. Run full test suite
2. Performance testing
3. Security review
4. Documentation review

### Medium Term (Phase 6)

1. Integrate with bill system
2. Add automatic stock allocation
3. Set up notifications
4. Add reporting

---

*Setup Guide v1.0*  
*For questions, check PHASE_5_COMPLETION_REPORT.md*

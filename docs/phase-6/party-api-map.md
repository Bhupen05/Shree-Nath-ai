# Phase 6 Party API Map

Base path: /api/parties

## Customers

- POST /customers
  - Permission: customers:write
  - Purpose: Create customer with optional contact and credit limit
- GET /customers
  - Permission: customers:read
  - Purpose: List customers
- GET /customers/:id
  - Permission: customers:read
  - Purpose: Fetch customer details
- PUT /customers/:id
  - Permission: customers:write
  - Purpose: Update customer details and credit limit
- DELETE /customers/:id
  - Permission: customers:write
  - Purpose: Delete customer
- GET /customers/:id/outstanding
  - Permission: customers:read
  - Purpose: Compare stored outstanding with calculated outstanding from bills/payments
- GET /customers/:id/history
  - Permission: customers:read
  - Purpose: View customer bill and payment history

## Suppliers

- POST /suppliers
  - Permission: customers:write
  - Purpose: Create supplier
- GET /suppliers
  - Permission: customers:read
  - Purpose: List suppliers
- GET /suppliers/:id
  - Permission: customers:read
  - Purpose: Fetch supplier details
- PUT /suppliers/:id
  - Permission: customers:write
  - Purpose: Update supplier details
- DELETE /suppliers/:id
  - Permission: customers:write
  - Purpose: Delete supplier
- GET /suppliers/:id/outstanding
  - Permission: customers:read
  - Purpose: Compare stored outstanding with calculated outstanding from bills/payments

## Billing Integration

- POST /api/billing/bills
  - Phase 6 behavior: for SALE + CUSTOMER, reject draft when customer outstanding + draft total exceeds credit limit (>0)
  - Error contract: HTTP 409 with code CREDIT_LIMIT_EXCEEDED

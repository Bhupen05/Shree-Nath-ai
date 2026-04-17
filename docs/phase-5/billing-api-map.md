# Phase 5 Billing API Map

## Billing Core Endpoints

- POST /api/billing/bills
  - Permission: billing:write
  - Creates bill in DRAFT with bill_items
- GET /api/billing/bills
  - Permission: billing:read
  - List summary bills
- GET /api/billing/bills/:id
  - Permission: billing:read
  - Bill detail with items and payments

## State Transition Endpoints

- POST /api/billing/bills/:id/confirm
  - Permission: billing:write
  - DRAFT -> CONFIRMED
  - PURCHASE: stock ledger inward
  - SALE: stock ledger outward with stock check
- POST /api/billing/bills/:id/cancel
  - Permission: billing:write
  - Allowed for DRAFT and CONFIRMED without payments
  - CONFIRMED cancellation reverses stock and party outstanding

## Payment Endpoint

- POST /api/billing/bills/:id/payments
  - Permission: billing:write
  - Allowed for CONFIRMED and PARTIALLY_PAID
  - Updates amount_paid, amount_due, and state
  - Writes payments row

## Invoice Endpoint

- GET /api/billing/bills/:id/invoice
  - Permission: billing:read
  - Returns application/pdf invoice stream

## State Rules

- Initial state: DRAFT
- Confirmed state: CONFIRMED
- Partial payment state: PARTIALLY_PAID
- Full payment state: PAID
- Cancel state: CANCELLED

## Integration Rules

- Every stock effect is written through stock_ledger.
- Confirming bill updates party outstanding balance.
- Recording payment decreases party outstanding balance.
- Cancelling confirmed unpaid bill reverses stock and outstanding balance changes.

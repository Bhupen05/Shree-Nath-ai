# Phase 5 Validation Checklist

Use this checklist as execution evidence for Phase 5 completion.

## Bill Creation Validation

- [x] DRAFT purchase bill can be created with valid items
- [x] DRAFT sales bill can be created with valid items
- [ ] Invalid bill type or party type mismatch is rejected
- [ ] Duplicate bill number is rejected

## Confirmation and Stock Validation

- [x] Confirming PURCHASE bill adds stock through stock_ledger
- [x] Confirming SALE bill reduces stock through stock_ledger
- [ ] SALE confirm fails when stock is insufficient
- [ ] Confirm is blocked when bill is not in DRAFT

## Payment Validation

- [x] Payment creates payment record with valid mode
- [x] amount_due and amount_paid update correctly
- [ ] Status transitions CONFIRMED -> PARTIALLY_PAID -> PAID
- [ ] Payment exceeding due amount is rejected

## Cancellation Validation

- [ ] DRAFT bill can be cancelled
- [x] CONFIRMED unpaid bill can be cancelled with reversal
- [x] Bills with payments cannot be cancelled
- [x] Cancellation updates status and due values appropriately

## Invoice Validation

- [x] Invoice endpoint returns PDF content type
- [ ] Invoice includes bill summary and item lines

## Security Validation

- [ ] billing:read required for read endpoints
- [ ] billing:write required for mutations

## Phase 5 Completion Decision

Mark Phase 5 complete only when all checklist items are checked.

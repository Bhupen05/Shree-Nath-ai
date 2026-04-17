# Phase 6 Validation Checklist

Use this checklist as execution evidence for Phase 6 completion.

## Customer CRUD Validation

- [x] Customer create succeeds with valid payload
- [x] Customer list and detail endpoints return created data
- [x] Customer update persists changed fields
- [x] Customer delete removes record

## Supplier CRUD Validation

- [x] Supplier create succeeds with valid payload
- [x] Supplier list and detail endpoints return created data
- [x] Supplier update persists changed fields
- [x] Supplier delete removes record

## Outstanding Balance Validation

- [x] Customer outstanding endpoint returns stored and calculated values
- [x] Supplier outstanding endpoint returns stored and calculated values
- [x] Values remain accurate after billing confirm/payment/cancel operations

## Customer History Validation

- [x] Customer history endpoint returns bill list
- [x] Customer history endpoint returns payment list for paid bills

## Credit Limit Validation

- [x] SALE draft is blocked when customer credit limit would be exceeded
- [x] Error contract returns HTTP 409 and code CREDIT_LIMIT_EXCEEDED

## Security Validation

- [x] customers:read is required for read endpoints
- [x] customers:write is required for mutations

## Phase 6 Completion Decision

Mark Phase 6 complete only when all checklist items are checked.

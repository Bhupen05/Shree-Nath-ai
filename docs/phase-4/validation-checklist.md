# Phase 4 Validation Checklist

Use this checklist as execution evidence for Phase 4 completion.

## Location Validation

- [x] Room, cabinet, and section can be created through API
- [ ] Duplicate names are rejected according to unique constraints
- [x] Location tree returns nested room -> cabinet -> section structure

## Part Validation

- [x] Part can be created with SKU, name, pricing, threshold, and section
- [ ] Part update works and updates updated_at
- [ ] Duplicate SKU is rejected

## Compatibility Validation

- [x] Compatibility can be added for a part
- [ ] Compatibility list returns mapped make/model/year data
- [ ] Invalid year ranges are rejected

## Stock Validation

- [x] Stock adjustment writes ADJUSTMENT entry to stock_ledger
- [x] Stock transfer writes two TRANSFER entries (from and to section)
- [ ] Transfer blocks when from-section stock is insufficient
- [x] Part list reflects current stock after adjustments/transfers

## Low Stock Validation

- [x] Low stock endpoint returns only threshold-breaching parts
- [x] low_stock flag is accurate on part list/detail responses

## Security Validation

- [x] inventory:read can view inventory routes
- [x] inventory:write required for mutating inventory routes

## Phase 4 Completion Decision

Mark Phase 4 complete only when all checklist items are checked.

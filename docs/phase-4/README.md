# Phase 4 Execution Pack

This document is the single entry point for Phase 4. Use it to execute, track, and sign off inventory module completion.

## Objective

Deliver inventory CRUD, location hierarchy, compatibility mapping, and ledger-backed stock operations.

## Linked Artifacts

- Inventory API map: docs/phase-4/inventory-api-map.md
- Validation checklist: docs/phase-4/validation-checklist.md
- Root plan reference: README.md

## Phase 4 Checklist

- [ ] Part CRUD endpoints implemented with validation
- [ ] 3-level location model endpoints implemented
- [ ] Vehicle compatibility mapping endpoints implemented
- [ ] Stock adjustment endpoint writes to stock_ledger
- [ ] Stock transfer endpoint writes to stock_ledger
- [ ] Low stock query endpoint implemented

## Exit Criteria

- [ ] Every stock change is represented in stock_ledger
- [ ] Location tree queries return Room -> Cabinet -> Section hierarchy
- [ ] Inventory routes are permission protected
- [ ] Low stock detection is queryable via API

## Ownership

- Tech lead: validates module boundaries and stock flow assumptions
- Backend owner: validates endpoints, validation, and ledger integrity
- QA owner: validates inventory and transfer scenarios

## Sign-off

- Product sign-off: [ ]
- Engineering sign-off: [ ]
- QA/process sign-off: [ ]

## Notes for Phase 5 Start

Before moving to billing, ensure inventory stock ledger behavior is validated under create, adjust, and transfer operations.

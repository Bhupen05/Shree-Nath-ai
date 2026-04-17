# Phase 6 Execution Pack

This document is the single entry point for Phase 6. Use it to execute, track, and sign off customer and supplier workflow completion.

## Objective

Deliver customer and supplier master-data management with reliable balance visibility, history lookups, and billing credit controls.

## Linked Artifacts

- Party API map: docs/phase-6/party-api-map.md
- Validation checklist: docs/phase-6/validation-checklist.md
- Root plan reference: README.md

## Phase 6 Checklist

- [x] Customer CRUD implemented
- [x] Supplier CRUD implemented
- [x] Outstanding balance summary endpoints implemented
- [x] Customer bill history view implemented
- [x] Credit limit checks enforced during sales billing

## Exit Criteria

- [x] Customer outstanding values remain accurate after confirm/payment/cancel flows
- [x] Supplier outstanding values remain accurate after confirm/payment/cancel flows
- [x] Credit-limit breaches are blocked before bill draft creation

## Ownership

- Tech lead: validates functional parity with roadmap and API consistency
- Backend owner: validates persistence, calculations, and credit controls
- QA owner: validates positive/negative API paths and edge cases

## Sign-off

- Product sign-off: [ ]
- Engineering sign-off: [ ]
- QA/process sign-off: [ ]

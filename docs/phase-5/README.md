# Phase 5 Execution Pack

This document is the single entry point for Phase 5. Use it to execute, track, and sign off billing module completion.

## Objective

Deliver purchase/sales billing flows with payment lifecycle, stock synchronization, reversal safety, and invoice output.

## Linked Artifacts

- Billing API map: docs/phase-5/billing-api-map.md
- Validation checklist: docs/phase-5/validation-checklist.md
- Root plan reference: README.md

## Phase 5 Checklist

- [ ] Purchase bill flow implemented (stock inward on confirm)
- [ ] Sales bill flow implemented (stock outward on confirm)
- [ ] Bill states enforced (DRAFT, CONFIRMED, PARTIALLY_PAID, PAID, CANCELLED)
- [ ] Payment recording updates due amounts and bill status
- [ ] Bill cancel flow enforces reversal rules
- [ ] Invoice PDF endpoint implemented

## Exit Criteria

- [ ] Confirming purchase and sales bills updates stock correctly
- [ ] Payments correctly transition bill status and outstanding values
- [ ] Cancellation safely handles confirmed bills and blocks paid bills
- [ ] Invoice endpoint returns PDF output

## Ownership

- Tech lead: validates billing state machine and inventory integration
- Backend owner: validates endpoint behavior and financial calculations
- QA owner: validates regression paths across billing and stock

## Sign-off

- Product sign-off: [ ]
- Engineering sign-off: [ ]
- QA/process sign-off: [ ]

## Notes for Phase 6 Start

Before moving to Phase 6, ensure billing-to-stock synchronization and cancellation reversal cases are validated in API tests.

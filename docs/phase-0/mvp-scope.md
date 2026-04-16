# MVP Scope (Phase 0)

## Goal
Deliver a stable first release of SIBMS focused on inventory accuracy, billing correctness, and secure multi-user operation.

## In Scope (MVP)
- Authentication and authorization (JWT + RBAC basics)
- Inventory management with 3-level location support
- Billing engine (purchase, sales, payments)
- Customer and supplier management
- Dashboard with core KPIs

## Out of Scope (Post-MVP)
- AI voice agent
- Advanced notification automation
- Full offline sync/PWA workflows
- Advanced analytics and forecasting

## Non-Functional Requirements
- All stock changes must be ledger-backed
- All financial actions must be auditable
- API errors must be structured and actionable
- Core endpoints must be covered by integration tests

## Definition of MVP Done
- Role-aware login and protected routes work
- Inventory can be created, updated, located, and adjusted
- Purchase/sales bills update stock correctly
- Payments update outstanding balances correctly
- Dashboard shows trusted summary metrics

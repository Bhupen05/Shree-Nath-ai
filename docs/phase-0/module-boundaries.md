# Module Boundaries (Phase 0)

## Auth + RBAC
Responsibilities:
- User registration/login/logout/me
- Token issuance/validation
- Role checks for protected API routes

Does not own:
- Business rules for inventory or billing

## Inventory
Responsibilities:
- Parts CRUD
- Location model (Room -> Cabinet -> Section)
- Stock adjustments/transfers
- Stock ledger writes

Does not own:
- Invoice lifecycle

## Billing
Responsibilities:
- Purchase and sales bill lifecycle
- Bill state transitions
- Payment recording
- Triggering inventory deltas through ledger

Does not own:
- Authentication

## Customers/Suppliers
Responsibilities:
- Party master data CRUD
- Balance and due summaries
- Party-level bill and payment history

Does not own:
- Stock operations

## Dashboard
Responsibilities:
- Read-only KPI aggregation
- Date range/filter based summaries

Does not own:
- Source data mutation

## Integration Contracts
- Billing writes inventory through stock ledger only
- Dashboard reads from modules and never mutates state
- All modules use shared auth middleware for protected routes

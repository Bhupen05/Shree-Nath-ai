# SIBMS Build Checkpoints (Step-by-Step)

This README gives you a practical execution checklist to build SIBMS properly from foundation to production.

## Current Baseline

- Frontend: React + Vite
- Backend: Express + PostgreSQL
- Auth basics: register, login, profile endpoint, JWT flow

---

## Phase 0: Project Foundation

- [x] Finalize product scope (MVP vs v1)
- [x] Freeze module list for MVP:
	- [x] Auth + RBAC
	- [x] Inventory
	- [x] Billing
	- [x] Customers/Suppliers
	- [x] Dashboard
- [x] Define naming conventions (code, DB, API)
- [x] Setup branch strategy (`main`, `dev`, `feature/*`)
- [x] Setup issue tracker with milestones

Phase 0 project artifacts:
- docs/phase-0/README.md
- docs/phase-0/mvp-scope.md
- docs/phase-0/module-boundaries.md
- docs/phase-0/conventions.md
- docs/phase-0/branching-strategy.md
- docs/phase-0/milestones.md
- .github/ISSUE_TEMPLATE/*
- .github/pull_request_template.md

Exit criteria:
- One source-of-truth doc for MVP scope
- Team agrees on module boundaries

---

## Phase 1: Environment and Dev Setup

- [ ] Local services ready:
	- [ ] PostgreSQL running
	- [ ] Redis running (if queue/notifications are enabled)
- [ ] Backend `.env` configured
- [ ] Frontend `.env` configured
- [ ] `npm install` works in frontend and backend
- [ ] App boots without runtime errors

Quick run commands:

```bash
# backend
cd backend
npm run dev

# frontend
cd frontend
npm run dev
```

Exit criteria:
- Frontend and backend both run locally
- Health endpoint returns success

---

## Phase 2: Database and Core Schema

- [ ] Create schema for:
	- [ ] users, roles, permissions
	- [ ] rooms, cabinets, sections
	- [ ] parts, vehicle_compatibility
	- [ ] stock_ledger
	- [ ] customers, suppliers
	- [ ] bills, bill_items, payments
	- [ ] audit_logs
- [ ] Add indexes for search-heavy fields
- [ ] Add unique constraints (`email`, `sku`, bill numbers)
- [ ] Add migration strategy and scripts
- [ ] Seed initial roles and admin user

Exit criteria:
- Fresh DB can be created from migrations only
- Seed script creates usable admin account

---

## Phase 3: Authentication and RBAC

- [ ] Implement auth endpoints:
	- [ ] register
	- [ ] login
	- [ ] refresh token
	- [ ] logout
	- [ ] me/profile
- [ ] Add role/permission middleware
- [ ] Protect API routes by module permission
- [ ] Add password reset flow (email/OTP)
- [ ] Add audit logs for login and critical actions

Exit criteria:
- Unauthorized users cannot access protected endpoints
- Permissions tested for each role

---

## Phase 4: Inventory Module

- [ ] Part CRUD with validation
- [ ] 3-level location mapping (Room -> Cabinet -> Section)
- [ ] Vehicle compatibility mapping
- [ ] Stock adjustment API (with reason)
- [ ] Stock transfer API between sections
- [ ] Low stock threshold and alert flagging

Exit criteria:
- Every stock change appears in stock ledger
- Location-based lookup works reliably

---

## Phase 5: Billing Engine (Most Critical)

- [ ] Purchase bill flow (inward stock)
- [ ] Sales bill flow (outward stock)
- [ ] Bill states (`DRAFT`, `CONFIRMED`, `PAID`, etc.)
- [ ] Payment recording and due amount updates
- [ ] Bill cancellation and reversal rules
- [ ] PDF invoice generation

Exit criteria:
- Confirming a bill updates stock correctly
- Cancel/rollback behavior is consistent and tested

---

## Phase 6: Customers and Suppliers

- [ ] Customer CRUD
- [ ] Supplier CRUD
- [ ] Outstanding balance calculation
- [ ] Customer bill history view
- [ ] Credit limit checks during billing

Exit criteria:
- Outstanding amount is accurate after every payment

---

## Phase 7: Frontend UX Completion

- [ ] Route structure and protected layouts
- [ ] Role-based navigation menu
- [ ] Forms with validation and error states
- [ ] Data tables with search/filter/sort/pagination
- [ ] Reusable component library
- [ ] Loading, empty, and error states for every page

Exit criteria:
- All MVP APIs are consumable from UI
- No dead-end page states

---

## Phase 8: Notifications

- [ ] Notification queue design (Redis/Bull)
- [ ] Template system (SMS/WhatsApp/Email)
- [ ] Scheduled reminder jobs (before/after due date)
- [ ] Delivery logs and retry policy

Exit criteria:
- Reminder job executes and logs status

---

## Phase 9: AI Voice Agent

- [ ] Text query endpoint for part lookup
- [ ] Speech-to-text integration
- [ ] LLM intent extraction and entity mapping
- [ ] DB lookup + location-aware response
- [ ] Guardrails and fallback responses

Exit criteria:
- Query "part + vehicle" gives accurate stock and location

---

## Phase 10: PWA and Offline

- [ ] Web app manifest and service worker
- [ ] Offline caching strategy
- [ ] Queue offline actions (draft operations)
- [ ] Reconnect sync with conflict handling

Exit criteria:
- Key read workflows function offline
- Queued actions sync after reconnect

---

## Phase 11: Testing and Quality Gates

- [ ] Unit tests for services and validators
- [ ] Integration tests for billing + stock sync
- [ ] RBAC security tests
- [ ] E2E tests for register -> login -> bill -> payment
- [ ] Lint + format + type checks in CI

Exit criteria:
- CI passes with required coverage threshold

---

## Phase 12: Deployment and Operations

- [ ] Dockerize frontend/backend
- [ ] Production env config and secrets management
- [ ] DB backup and restore strategy
- [ ] Monitoring and alerts
- [ ] Error tracking and structured logs
- [ ] Rollback strategy documented

Exit criteria:
- Production deploy is repeatable from scripts
- Restore test successful from latest backup

---

## Final Go-Live Checklist

- [ ] Security review completed
- [ ] Performance baseline recorded
- [ ] Data migration validated
- [ ] Admin and staff training completed
- [ ] Support and incident process documented

---

## Suggested MVP Delivery Order

1. Foundation + schema
2. Auth + RBAC
3. Inventory
4. Billing (purchase/sales/payments)
5. Customer/supplier
6. Dashboard
7. Notifications
8. AI + PWA

---

## Notes

- Do not start AI or PWA before billing and stock flows are stable.
- Treat billing-to-stock sync as mission critical and test it heavily.
- Keep an audit trail for all critical inventory and financial operations.

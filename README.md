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
	- [x] PostgreSQL running
	- [ ] Redis running (if queue/notifications are enabled)
- [x] Backend `.env` configured
- [ ] Frontend `.env` configured
- [x] `npm install` works in frontend and backend
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

Phase 1 project artifacts:
- docs/phase-1/README.md
- docs/phase-1/environment-setup.md
- docs/phase-1/validation-checklist.md

---

## Phase 2: Database and Core Schema

- [x] Create schema for:
	- [x] users, roles, permissions
	- [x] rooms, cabinets, sections
	- [x] parts, vehicle_compatibility
	- [x] stock_ledger
	- [x] customers, suppliers
	- [x] bills, bill_items, payments
	- [x] audit_logs
- [x] Add indexes for search-heavy fields
- [x] Add unique constraints (`email`, `sku`, bill numbers)
- [x] Add migration strategy and scripts
- [x] Seed initial roles and admin user

Exit criteria:
- Fresh DB can be created from migrations only
- Seed script creates usable admin account

Phase 2 project artifacts:
- docs/phase-2/README.md
- docs/phase-2/schema-inventory.md
- docs/phase-2/migration-strategy.md
- docs/phase-2/validation-checklist.md

---

## Phase 3: Authentication and RBAC

- [x] Implement auth endpoints:
	- [x] register
	- [x] login
	- [x] refresh token
	- [x] logout
	- [x] me/profile
- [x] Add role/permission middleware
- [x] Protect API routes by module permission
- [x] Add password reset flow (email/OTP)
- [x] Add audit logs for login and critical actions

Exit criteria:
- Unauthorized users cannot access protected endpoints
- Permissions tested for each role

Phase 3 project artifacts:
- docs/phase-3/README.md
- docs/phase-3/auth-rbac-map.md
- docs/phase-3/validation-checklist.md

---

## Phase 4: Inventory Module

- [x] Part CRUD with validation
- [x] 3-level location mapping (Room -> Cabinet -> Section)
- [x] Vehicle compatibility mapping
- [x] Stock adjustment API (with reason)
- [x] Stock transfer API between sections
- [x] Low stock threshold and alert flagging

Exit criteria:
- Every stock change appears in stock ledger
- Location-based lookup works reliably

Phase 4 project artifacts:
- docs/phase-4/README.md
- docs/phase-4/inventory-api-map.md
- docs/phase-4/validation-checklist.md

---

## Phase 5: Billing Engine (Most Critical)

- [x] Purchase bill flow (inward stock)
- [x] Sales bill flow (outward stock)
- [x] Bill states (`DRAFT`, `CONFIRMED`, `PAID`, etc.)
- [x] Payment recording and due amount updates
- [x] Bill cancellation and reversal rules
- [x] PDF invoice generation

Exit criteria:
- Confirming a bill updates stock correctly
- Cancel/rollback behavior is consistent and tested

Phase 5 project artifacts:
- docs/phase-5/README.md
- docs/phase-5/billing-api-map.md
- docs/phase-5/validation-checklist.md

---

## Phase 6: Customers and Suppliers

- [x] Customer CRUD
- [x] Supplier CRUD
- [x] Outstanding balance calculation
- [x] Customer bill history view
- [x] Credit limit checks during billing

Exit criteria:
- Outstanding amount is accurate after every payment

Phase 6 project artifacts:
- docs/phase-6/README.md
- docs/phase-6/party-api-map.md
- docs/phase-6/validation-checklist.md

---

## Phase 7: Frontend UX Completion

- [x] Route structure and protected layouts
- [x] Role-based navigation menu
- [x] Forms with validation and error states
- [x] Data tables with search/filter/sort/pagination
- [x] Reusable component library
- [x] Loading, empty, and error states for every page

Exit criteria:
- All MVP APIs are consumable from UI
- No dead-end page states

Phase 7 project artifacts:
- docs/phase-7/README.md
- docs/phase-7/frontend-ux-map.md
- docs/phase-7/validation-checklist.md

---

## Phase 8: Notifications

- [x] Notification queue design (DB-backed, Redis/Bull pluggable)
- [x] Template system (SMS/WhatsApp/Email/Internal)
- [x] Scheduled reminder jobs (before/after due date)
- [x] Delivery logs and retry policy

Exit criteria:
- Reminder job executes and logs status

Phase 8 project artifacts:
- docs/phase-8/README.md
- docs/phase-8/notification-architecture.md
- docs/phase-8/validation-checklist.md

---

## Phase 9: AI Voice Agent

- [x] Text query endpoint for part lookup
- [x] Speech-to-text integration
- [x] LLM-style intent extraction and entity mapping (provider-pluggable with rule fallback)
- [x] DB lookup + location-aware response
- [x] Guardrails and fallback responses

Exit criteria:
- Query "part + vehicle" gives accurate stock and location

Phase 9 project artifacts:
- docs/phase-9/README.md
- docs/phase-9/ai-voice-agent-map.md
- docs/phase-9/validation-checklist.md

---

## Phase 10: PWA and Offline

- [x] Web app manifest and service worker
- [x] Offline caching strategy
- [x] Queue offline actions (draft operations)
- [x] Reconnect sync with conflict handling

Exit criteria:
- Key read workflows function offline
- Queued actions sync after reconnect

Phase 10 project artifacts:
- docs/phase-10/README.md
- docs/phase-10/pwa-offline-architecture.md
- docs/phase-10/validation-checklist.md

---

## Phase 11: Testing and Quality Gates

- [x] Unit tests for services and validators
- [x] Integration tests for billing + stock sync
- [x] RBAC security tests
- [x] E2E tests for register -> login -> bill -> payment
- [x] Lint + quality checks in CI

Exit criteria:
- CI passes with required coverage threshold

Phase 11 project artifacts:
- docs/phase-11/README.md
- docs/phase-11/testing-strategy.md
- docs/phase-11/validation-checklist.md
- .github/workflows/ci.yml

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

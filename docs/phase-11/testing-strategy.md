# Phase 11 Testing Strategy

## Current Scope

Implemented baseline includes:
- Backend unit tests for permission and guardrail validators
- Backend integration tests for billing-stock sync and RBAC
- Backend API-flow test for register -> login -> bill -> payment scenario
- CI workflow running backend and frontend quality gates

## Backend Test Layout

- Unit tests:
  - backend/test/unit/permission.test.js
  - backend/test/unit/voice-guardrails.test.js
- Integration tests:
  - backend/test/integration/api-flow.test.js

## Covered Scenarios

1. RBAC enforcement
- VIEW_ONLY user denied on billing list endpoint
- Expected HTTP 403 with INSUFFICIENT_PERMISSIONS

2. Billing and stock synchronization
- Create part and seed stock
- Create and confirm sales bill
- Verify stock reduction through inventory detail

3. End-to-end API flow
- Register user
- Login user
- Admin creates bill and confirms
- Payment recorded and bill reaches PAID state

## CI Quality Gates

Workflow: .github/workflows/ci.yml

Backend job:
- npm run db:init
- npm run lint
- npm run test:unit
- npm run test:integration

Frontend job:
- npm run lint
- npm run build

## Notes and Limits

- Integration tests require PostgreSQL connectivity and seeded baseline roles/admin.
- API-flow test is HTTP-level and does not include browser UI automation.
- Additional frontend component/unit tests can be added in a follow-up phase.

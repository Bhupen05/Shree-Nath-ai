# Phase 3 Auth + RBAC Map

This file maps current implementation to Phase 3 scope.

## Implemented Auth Endpoints

- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/refresh
- POST /api/auth/logout
- GET /api/auth/me
- POST /api/auth/password-reset/request
- POST /api/auth/password-reset/confirm

## Implemented Middleware

- requireAuth: validates Bearer token and attaches user claims
- requirePermission(permission): enforces permission access and returns 403 on failure

## Permission Model

Supported patterns:
- * (full access)
- scope:* (module-wide access)
- scope:action (specific access)

Examples:
- dashboard:read
- inventory:read
- billing:*

## Protected Route Example

- GET /api/auth/permissions/check
  - Requires: dashboard:read
  - Middleware: requireAuth + requirePermission('dashboard:read')

## Protected Module Routes (Current)

- GET /api/dashboard/kpis
  - Requires: dashboard:read
- GET /api/inventory/parts
  - Requires: inventory:read
- GET /api/billing/bills
  - Requires: billing:read
- GET /api/parties/customers
  - Requires: customers:read

## Audit Events Implemented

- AUTH_REGISTER
- AUTH_LOGIN_SUCCESS
- AUTH_LOGIN_FAILED
- AUTH_TOKEN_REFRESH
- AUTH_LOGOUT
- AUTH_PASSWORD_RESET_REQUEST
- AUTH_PASSWORD_RESET_CONFIRM
- AUTH_PERMISSION_DENIED

## Current Constraints

- Password reset request returns resetToken in API response for development workflow.
- Production integration should move token delivery to email/SMS and remove token from API response.

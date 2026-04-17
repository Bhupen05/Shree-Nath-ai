# Phase 3 Validation Checklist

Use this checklist as execution evidence for Phase 3 completion.

## Endpoint Validation

- [x] Register returns token + role-aware user payload
- [x] Login returns token + role-aware user payload
- [x] Me/profile returns authenticated user with role and permissions
- [x] Refresh returns a valid new token
- [x] Logout returns success for authenticated users

## Authorization Validation

- [ ] Missing/invalid token returns 401
- [x] Missing permission returns 403 with code INSUFFICIENT_PERMISSIONS
- [x] Wildcard permissions (* and scope:*) are honored correctly
- [x] Dashboard route enforces dashboard:read
- [x] Billing route enforces billing:read
- [x] Customers route enforces customers:read

## Password Reset Validation

- [ ] Request endpoint handles existing and non-existing emails safely
- [x] Confirm endpoint accepts valid reset token and updates password
- [ ] Expired or invalid reset token is rejected

## Audit Validation

- [ ] Login success/failure creates audit log entries
- [ ] Logout creates audit log entry
- [ ] Password reset request/confirm creates audit log entries

## Phase 3 Completion Decision

Mark Phase 3 complete only when all checklist items are checked.

# Phase 8 Validation Checklist

Use this checklist as execution evidence for Phase 8 completion.

## Queue and Data Model Validation

- [x] notification_templates table exists with channel and active state constraints
- [x] notification_jobs table exists with status and job type constraints
- [x] notification_delivery_logs table exists and links to jobs
- [x] Queue indexes exist for status/schedule and job-log lookup

## Reminder Generation Validation

- [x] Generation endpoint creates pending jobs for due/overdue unpaid bills
- [x] Generation endpoint enforces idempotency for same bill/due-date reminder jobs
- [x] Generation endpoint writes audit event

## Dispatch Validation

- [x] Dispatch endpoint picks pending jobs and marks successful ones as SENT
- [x] Dispatch endpoint records delivery logs for each processed job
- [x] Failed dispatch updates FAILED status and last_error
- [x] Dispatch endpoint writes audit event

## Template Validation

- [x] Template create validates channel/name/body
- [x] Template update supports partial updates
- [x] Template list returns persisted records

## Worker Validation

- [x] Worker can be toggled using NOTIFICATION_WORKER_ENABLED
- [x] Worker interval configurable via NOTIFICATION_WORKER_INTERVAL_MS

## Security Validation

- [x] billing:read required for notification reads
- [x] billing:write required for notification mutations

## Phase 8 Completion Decision

Mark Phase 8 complete only when all checklist items are checked.

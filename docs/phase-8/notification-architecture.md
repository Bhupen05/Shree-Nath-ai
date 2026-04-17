# Phase 8 Notification Architecture

## Scope Delivered

The current implementation provides an internal notification pipeline focused on billing reminders.

Implemented capabilities:
- Reminder job generation for due and overdue bills
- Queue-backed dispatch processing
- Template CRUD endpoints
- Delivery logs with sent/failed outcomes
- Optional background worker loop for automatic dispatch

## Data Model

## notification_templates

- name: unique template identifier
- channel: SMS, WHATSAPP, EMAIL, INTERNAL
- subject/body: template content
- is_active: soft on/off flag

## notification_jobs

- job_type: BILL_DUE_REMINDER
- bill_id + party context + recipient fields
- due_date + outstanding_amount
- status: PENDING, SENT, FAILED, CANCELLED
- scheduled_for + sent_at + attempt_count + last_error
- payload JSON for rendering context

## notification_delivery_logs

- job_id link to notification_jobs
- channel + status
- provider_message + payload + provider_response
- immutable delivery event history

## API Endpoints

Template management:
- GET /api/notifications/templates
- POST /api/notifications/templates
- PUT /api/notifications/templates/:id

Reminder orchestration:
- POST /api/notifications/reminders/generate
- POST /api/notifications/reminders/dispatch

Queue inspection:
- GET /api/notifications/jobs
- GET /api/notifications/jobs/:id

## Worker Behavior

The backend starts an internal worker interval by default:
- Controlled by NOTIFICATION_WORKER_ENABLED (default true)
- Interval controlled by NOTIFICATION_WORKER_INTERVAL_MS (default 60000)
- Worker dispatches pending jobs using the same queue logic as manual dispatch

## Permission Model

Current routes are protected with billing permissions:
- billing:read for list/detail reads
- billing:write for mutations (generate/dispatch/template writes)

This avoids permission-model expansion while keeping notifications restricted to authorized billing users.

## Operational Notes

- Dispatch currently uses INTERNAL channel simulation and writes delivery logs.
- Real providers (SMS/WhatsApp/Email) can be plugged into the dispatch function later.
- Generation is idempotent for active due-date bill reminders (no duplicate pending/sent jobs for same bill + due_date).

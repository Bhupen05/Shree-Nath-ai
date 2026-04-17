# Phase 2 Schema Inventory

This inventory maps the planned Phase 2 schema goals to current implementation status in backend/src/db.js.

## Tables

Implemented tables:
- roles
- users
- rooms
- cabinets
- sections
- part_categories
- part_brands
- parts
- vehicle_compatibility
- stock_ledger
- customers
- suppliers
- bills
- bill_items
- payments
- audit_logs

## Constraints and Integrity

Implemented constraints include:
- Unique constraints: users.email, parts.sku, bills.bill_number, role names, category/brand names
- FK relationships across inventory, billing, and user references
- Domain checks for bill_type, party_type, status, payment_mode, and transaction_type
- Quantity and amount sanity checks on bill_items/payments

## Indexes

Implemented indexes include:
- idx_parts_name
- idx_parts_sku
- idx_vehicle_lookup
- idx_stock_ledger_part
- idx_stock_ledger_created_at
- idx_bills_bill_date
- idx_bills_status
- idx_payments_bill_id

## Seed Baseline

Implemented seed baseline includes predefined roles:
- SUPER_ADMIN
- MANAGER
- BILLING_STAFF
- WAREHOUSE_STAFF
- VIEW_ONLY

## Gap Notes Against Root Checklist

Items still needing explicit process definition:
- Migration versioning flow (currently schema is bootstrap-style in code)
- Admin user seeding policy (roles seeded, admin account bootstrap not standardized)
- Repeatable migration commands for CI and environment promotion

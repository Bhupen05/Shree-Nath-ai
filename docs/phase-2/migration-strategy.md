# Phase 2 Migration and Seed Strategy

This strategy turns current schema bootstrap logic into a versioned migration process.

## Current State

- Database schema is initialized through backend/src/db.js via initializeSchema().
- npm script available: npm run db:init
- Roles are seeded during schema initialization.

## Target State

Adopt explicit versioned migrations while keeping bootstrap compatibility during transition.

## Recommended Structure

Suggested backend structure:

- backend/src/db/migrations/
- backend/src/db/seeds/
- backend/src/db/migrate.js
- backend/src/db/seed.js

Naming convention:
- YYYYMMDDHHMM__description.sql or numeric sequence files
- Example: 202604171200__create_core_tables.sql

## Workflow

1. Local development
- Create migration file for every schema change.
- Apply migrations in order.
- Use seed scripts for non-production baseline data.

2. CI
- Provision clean database.
- Run migrations only.
- Run deterministic seed set required by tests.

3. Staging/production
- Run migrations as deployment step.
- Restrict seed execution to safe, idempotent baseline data.

## Immediate Action Items

- [ ] Decide migration tool approach (custom SQL runner or library-based)
- [ ] Add migrate command in backend/package.json
- [ ] Add seed command in backend/package.json
- [ ] Separate role seed from schema creation path
- [ ] Define admin bootstrap path (script or secure manual process)

## Definition of Done for Migration Strategy

- [ ] Versioned migration files exist for current baseline
- [ ] Fresh database setup uses migration command, not ad-hoc SQL
- [ ] Seed behavior is deterministic and idempotent
- [ ] Team can roll forward schema across environments safely

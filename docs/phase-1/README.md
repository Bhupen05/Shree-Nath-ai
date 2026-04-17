# Phase 1 Execution Pack

This document is the single entry point for Phase 1. Use it to execute, track, and sign off environment and development readiness before deep feature work.

## Objective

Bring local development to a stable, repeatable state with working services, validated configuration, and health checks.

## Linked Artifacts

- Setup steps: docs/phase-1/environment-setup.md
- Validation checks: docs/phase-1/validation-checklist.md
- Root plan reference: README.md

## Phase 1 Checklist

- [ ] PostgreSQL service is running and reachable
- [ ] Backend environment variables are configured
- [ ] Frontend environment variables are configured (if required)
- [ ] Backend dependencies installed successfully
- [ ] Frontend dependencies installed successfully
- [ ] Backend boots without runtime errors
- [ ] Frontend boots without runtime errors
- [ ] Health endpoint returns success

## Exit Criteria

- [ ] New developer can clone and run backend + frontend locally
- [ ] Database connectivity is verified from backend
- [ ] API health endpoint is green
- [ ] Setup steps are reproducible and documented

## Ownership

- Tech lead: validates local run and architecture assumptions
- Backend owner: validates DB connectivity and backend health
- Frontend owner: validates frontend run and API integration path

## Sign-off

- Setup sign-off: [ ]
- Engineering sign-off: [ ]
- QA/process sign-off: [ ]

## Notes for Phase 2 Start

Before moving to Phase 2, ensure all sign-off items are checked and environment setup is reproducible on a clean machine.

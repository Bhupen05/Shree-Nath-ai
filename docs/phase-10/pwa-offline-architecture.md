# Phase 10 PWA and Offline Architecture

## Implemented Assets

- Manifest: frontend/public/manifest.webmanifest
- Service worker: frontend/public/service-worker.js
- Offline queue manager: frontend/src/offlineQueue.js
- Bootstrap integration: frontend/src/pwa.js and frontend/src/main.jsx

## Manifest and Installability

Manifest includes:
- name, short_name, start_url, scope
- standalone display mode
- theme/background colors
- icon declarations

## Service Worker Strategy

Current strategy is shell-first cache with runtime updates:
- pre-cache: /, /index.html, /manifest.webmanifest, /favicon.svg
- fetch policy for same-origin GET:
  - serve cached response when available
  - refresh cache from network in background

## Offline Mutation Queue

Mutating API calls are detected in frontend/src/auth.js:
- methods except GET/HEAD are treated as mutations
- when offline, requests are stored in localStorage queue
- queue payload keeps path, method, headers, and body

## Reconnect Sync

Sync flow:
- listener on browser online event
- queued requests replay sequentially
- successful replays removed from queue
- failures kept for future retry

## Conflict and Safety Notes

- Replay is sequential to reduce race issues.
- Failed replayed actions remain queued; no destructive overwrite is attempted client-side.
- Backend remains source of truth for conflict validation and rejection.

## Current Scope Limits

- Queue is localStorage-based and per-browser profile.
- No background sync API dependency is required in this phase.
- UI-level queue status indicators can be added in a follow-up phase.

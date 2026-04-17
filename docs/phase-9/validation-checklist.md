# Phase 9 Validation Checklist

Use this checklist as execution evidence for Phase 9 completion.

## Endpoint Validation

- [x] POST /api/ai/voice/query accepts valid queryText payload
- [x] POST /api/ai/voice/query rejects missing or invalid queryText
- [x] POST /api/ai/voice/stt accepts mockTranscript
- [x] POST /api/ai/voice/stt handles unsupported providers with 501 response

## Intent and Entity Validation

- [x] Query intent classification returns one of PART_* intents
- [x] Entity extraction captures search term and optional make/model/year
- [x] Intent payload reports provider and fallback mode

## Lookup and Response Validation

- [x] Lookup returns part identifiers, stock values, and location context
- [x] Empty results return fallback response with guidance
- [x] Result limit is clamped to safe range

## Guardrail Validation

- [x] Sensitive/destructive query fragments are blocked
- [x] Blocked requests return VOICE_GUARDRAIL_BLOCKED

## Security Validation

- [x] inventory:read permission required for voice endpoints
- [x] Voice requests write audit log events

## Phase 9 Completion Decision

Mark Phase 9 complete only when all checklist items are checked.

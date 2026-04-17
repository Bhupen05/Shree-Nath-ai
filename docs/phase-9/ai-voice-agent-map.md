# Phase 9 AI Voice Agent Map

Base path: /api/ai/voice

## Implemented Endpoints

- POST /stt
  - Permission: inventory:read
  - Input: mockTranscript or audioBase64
  - Behavior:
    - mockTranscript provided: returns normalized transcript immediately
    - audioBase64 with STT_PROVIDER=mock: returns mock transcript
    - unsupported provider: 501 with configuration message

- POST /query
  - Permission: inventory:read
  - Input: queryText, optional limit
  - Behavior:
    - validates text length and guardrails
    - extracts intent and entities (search term, make, model, year)
    - performs inventory lookup against parts/stock/location and compatibility filters
    - returns structured answer, result list, and fallback flag

## Intent Model

- PART_LOOKUP
- PART_LOCATION_LOOKUP
- PART_STOCK_LOOKUP

Intent is inferred from query keywords. Provider is pluggable via AI_INTENT_PROVIDER with current rule-based fallback.

## Entity Extraction

Extracted entities:
- searchTerm
- make
- model
- year

These values are used to constrain SQL lookup for compatibility and relevance.

## Guardrails

Queries are blocked when they contain sensitive or destructive request fragments, such as:
- password
- jwt/token
- drop table/delete all

Blocked responses return code: VOICE_GUARDRAIL_BLOCKED.

## Response Contract (Query)

Primary fields:
- intent: name, provider, usedFallback
- entities
- resultCount
- items
- answer
- fallback

## Current Limits

- STT and intent providers are scaffolded for extension; mock/rule modes are active in this phase.
- LLM-backed intent extraction can be plugged in later without changing endpoint contracts.

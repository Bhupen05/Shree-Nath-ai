# Conventions (Code, DB, API)

## General
- Use English names only for code and schema
- Prefer explicit names over abbreviations
- Keep modules cohesive and small

## API Conventions
- Base path: /api
- Resource paths use plural nouns (example: /api/parts)
- JSON body keys use snake_case in DB, camelCase in frontend payloads
- Use standard status codes:
  - 200 OK
  - 201 Created
  - 400 Bad Request
  - 401 Unauthorized
  - 403 Forbidden
  - 404 Not Found
  - 409 Conflict
  - 500 Internal Server Error

Structured error response format:
{
  "message": "Human-readable error",
  "code": "OPTIONAL_MACHINE_CODE"
}

## Database Conventions
- Table names: snake_case plural (example: bill_items)
- Column names: snake_case (example: created_at)
- Primary key: id
- Foreign keys: {table_singular}_id (example: user_id)
- Always include created_at, updated_at where appropriate

## Backend Conventions
- File names: lower camel or snake_case, consistent per folder
- Route handlers should not contain SQL-heavy business logic
- Move reusable logic to service/helper functions

## Frontend Conventions
- Component files: PascalCase
- Hooks: useXxx naming
- Keep API calls in dedicated service/helper files
- Avoid business logic directly inside JSX

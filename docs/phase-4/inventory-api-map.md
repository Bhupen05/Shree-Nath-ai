# Phase 4 Inventory API Map

## Location Endpoints

- POST /api/inventory/locations/rooms
  - Permission: inventory:write
- POST /api/inventory/locations/cabinets
  - Permission: inventory:write
- POST /api/inventory/locations/sections
  - Permission: inventory:write
- GET /api/inventory/locations/tree
  - Permission: inventory:read

## Part Endpoints

- POST /api/inventory/parts
  - Permission: inventory:write
- GET /api/inventory/parts
  - Permission: inventory:read
- GET /api/inventory/parts/:id
  - Permission: inventory:read
- PUT /api/inventory/parts/:id
  - Permission: inventory:write

## Compatibility Endpoints

- POST /api/inventory/parts/:id/compatibility
  - Permission: inventory:write
- GET /api/inventory/parts/:id/compatibility
  - Permission: inventory:read

## Stock Endpoints

- POST /api/inventory/stock/adjustments
  - Permission: inventory:write
  - Ledger type: ADJUSTMENT
- POST /api/inventory/stock/transfers
  - Permission: inventory:write
  - Ledger type: TRANSFER (out + in entries)
- GET /api/inventory/stock/low
  - Permission: inventory:read

## Data and Rule Notes

- Stock adjustment accepts positive or negative quantity_delta.
- Transfer requires sufficient quantity in fromSectionId.
- Parts list and part detail include computed current_stock and low_stock flags.
- Low stock endpoint returns items where current stock is <= reorder threshold.

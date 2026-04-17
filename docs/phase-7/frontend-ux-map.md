# Phase 7 Frontend UX Map

## Route Structure

Public-only routes:
- /login
- /register

Protected routes:
- /dashboard (requires dashboard:read)
- /inventory (requires inventory:read)
- /billing (requires billing:read)
- /customers (requires customers:read)
- /profile (authenticated)
- /forbidden (authorization fallback)

## Layout and Navigation

- Shared protected shell with:
  - left navigation rail
  - top bar identity chip
  - logout action
- Navigation links filtered by user permissions.

## Reusable Components

- Button
- Card
- FormField
- StatusView
- DataTable

## Module UX Coverage

- Dashboard: KPI cards with loading and error states.
- Inventory: searchable, sortable, paginated part table.
- Billing: searchable, sortable, paginated bill table.
- Customers: searchable, sortable, paginated customer table.
- Profile: user details card with error retry and logout action.

## Form Validation and Error UX

- Login and register forms include client-side validation.
- Submit failures show API error messages.
- Field-level errors are rendered inline.

## Responsive Behavior

- Desktop: split navigation/content workspace.
- Mobile/tablet: stacked layout with wrapped nav links and adaptive table toolbar.

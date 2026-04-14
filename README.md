# SIBMS Starter Codebase

Starter monorepo for the **Smart Inventory & Business Management System (SIBMS)** described in `SIBMS_Documentation.txt`, extracted from the provided PDF.

## What this scaffold includes

- `backend/`
  - Express + TypeScript API
  - Prisma schema covering employees, roles, products, vehicles, locations, stock, billing, reminders, activity logs, and demand logs
  - JWT auth, role guards, and seeded admin user
  - Inventory, billing, employee/activity, dashboard, AI, and report route scaffolds
- `frontend/`
  - React + Vite + TypeScript app
  - Module-driven pages for Dashboard, Inventory, Billing, Employees, AI Agent, and Reports
  - Zustand auth store and React Query API calls
  - PWA manifest and service worker starter
- Root ops files
  - `docker-compose.yml`
  - `nginx/nginx.conf`
  - `.env.example`

## Project structure

```text
.
├── backend
│   ├── prisma
│   └── src
│       ├── config
│       ├── lib
│       ├── middleware
│       ├── modules
│       └── routes
├── frontend
│   ├── public
│   └── src
└── nginx
```

## Coverage against the PDF

Implemented in this starter:

- Foundation architecture with `frontend`, `backend`, `postgres`, `redis`, and `nginx`
- Core PostgreSQL schema from the documentation
- Auth endpoints: login, logout, refresh, change-password
- Employee CRUD, role assignment, activity logs, demand logs
- Product CRUD, product search, location CRUD, stock bulk intake, stock updates
- Billing CRUD, bill confirm/cancel, payment capture, customer/supplier CRUD
- Dashboard KPIs, low-stock list, top products
- AI reorder suggestions and a voice-query lookup sandbox endpoint
- Sales and stock report endpoints
- React routes and UI surfaces for each documented module

Partially stubbed for the next iteration:

- Real PDF bill generation with `pdfkit`
- External Twilio, WhatsApp, SendGrid, S3, and OpenAI integrations
- BullMQ background workers
- Offline IndexedDB queueing for warehouse PWA
- Barcode camera scanning

## Local setup

1. Copy `.env.example` to `.env`
2. Install dependencies:
   - Root: `npm install`
   - Backend only: `npm --workspace backend install`
   - Frontend only: `npm --workspace frontend install`
3. Generate Prisma client: `npm run db:generate`
4. Run migrations: `npm run db:migrate`
5. Seed admin account: `npm run db:seed`
6. Start apps:
   - Backend: `npm run dev:backend`
   - Frontend: `npm run dev:frontend`

Seeded admin login:

- Employee code: `EMP-0001`
- Password: `Admin@12345`

## Notes

- The billing confirmation flow currently performs FIFO stock deduction for sales bills.
- Purchase bill confirmation is scaffolded as accounting workflow only; deeper inventory-location coupling can be expanded in the next pass.
- The frontend is intentionally shaped around the PDF wireflows so it can be refined into a production UI without rethinking the route map.

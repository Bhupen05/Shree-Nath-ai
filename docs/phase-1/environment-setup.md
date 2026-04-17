# Phase 1 Environment Setup

This guide aligns with the current repository setup.

## 1. Start PostgreSQL

Use Docker Compose from the repository root:

```bash
docker compose up -d postgres
```

Expected service values from docker-compose.yml:
- Host: localhost
- Port: 5432
- Database: shreenath_db
- User: postgres
- Password: postgres

## 2. Configure Backend Environment

Create or verify backend/.env with:

```env
PORT=5000
CLIENT_ORIGIN=http://localhost:5173
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/shreenath_db
JWT_SECRET=dev_jwt_secret_change_me
```

## 3. Configure Frontend Environment

Current frontend setup uses Vite proxy to backend at http://localhost:5000.
A frontend .env is optional for now.

If you later remove proxy usage, add frontend/.env with:

```env
VITE_API_BASE_URL=http://localhost:5000
```

## 4. Install Dependencies

Backend:

```bash
cd backend
npm install
```

Frontend:

```bash
cd frontend
npm install
```

## 5. Initialize Database Schema

From backend folder:

```bash
npm run db:init
```

## 6. Run Backend and Frontend

Backend:

```bash
cd backend
npm run dev
```

Frontend:

```bash
cd frontend
npm run dev
```

## 7. Verify Health

Check backend health endpoint:

- URL: http://localhost:5000/api/health
- Expected: JSON with status set to ok when DB is reachable

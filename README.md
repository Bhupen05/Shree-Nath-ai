# React + Express + PostgreSQL Starter

This workspace now contains:

- `frontend`: React app (Vite)
- `backend`: Express API with PostgreSQL connection using `pg`
- `docker-compose.yml`: local PostgreSQL service

## 1) Start PostgreSQL

From the project root:

```bash
docker compose up -d
```

## 2) Configure backend environment

Copy:

- `backend/.env.example` -> `backend/.env`

Default values already point to the Docker PostgreSQL instance.

## 3) Run backend

```bash
cd backend
npm run dev
```

Backend runs at `http://localhost:5000`.

## 4) Run frontend

In a new terminal:

```bash
cd frontend
npm run dev
```

Frontend runs at `http://localhost:5173`.

## 5) Verify connection

Open the frontend URL. The page calls `GET /api/health` (proxied to backend). If PostgreSQL is reachable, you will see a success state and the database time.

You can also test API directly:

```bash
curl http://localhost:5000/api/health
```

# Structura

Structura is a static analysis and AI-assisted engineering platform. This monorepo contains the backend API, React frontend, ingestion pipelines, shared utilities, docs, and supporting scripts.

## Requirements

- Node 22.21.1 (run `nvm use` from the repo root)
- npm 10+ (npm workspaces enabled)

## Quick start

```bash
nvm use          # ensure Node 22.21.1
npm install      # install workspace deps
```

## Environment

- Frontend dev: `frontend/.env.local` points Vite to the backend (`VITE_API_BASE_URL`).
- Backend dev: copy `backend/.env.example` to `backend/.env` (or `.env.local`) and adjust `PORT`/`CORS_ORIGIN` as needed. Defaults assume Vite runs on `http://localhost:5173`.

## Local data stack (Docker)

- Compose file: `docker/docker-compose.yml` spins up Postgres, MongoDB, Neo4j, plus PGAdmin and Mongo Express on a shared bridge network.
- Start/stop: `docker compose -f docker/docker-compose.yml up -d` / `docker compose -f docker/docker-compose.yml down` (add `-v` to drop volumes).
- Ports and creds: Postgres `5432` (`structura` / `structura_password`, DB `structura_db`), MongoDB `27017`, Neo4j HTTP `7474` and Bolt `7687` (`neo4j` / `password123`), PGAdmin `5050` (`admin@structura.com` / `admin123`), Mongo Express `8081`.
- Data persists in Docker volumes: `postgres_data`, `mongo_data`, `neo4j_data`.

## Running the apps

- Backend (NestJS, `backend/`): `npm run start:dev --workspace backend`
  - Prod build: `npm run build --workspace backend` then `npm run start:prod --workspace backend`
  - Health check: `GET /health` (see `backend/src/health/health.controller.ts`)
- Frontend (React + Vite, `frontend/`): `npm run dev --workspace frontend`
  - Build/preview: `npm run build --workspace frontend` then `npm run preview --workspace frontend`
- Repo-wide tests (Vitest): `npm test`
  - Backend tests: `npm run test --workspace backend`

## Formatting and linting

- Format everything with Prettier: `npm run format`
- Check formatting only: `npm run format:check`
- Each workspace exposes its own lint/format scripts; run with `npm run <script> --workspace <pkg>`

## Repository layout

- `backend/` — NestJS API (health check and future services)
- `frontend/` — React + Vite app with Tailwind 4
- `ingestion/` — pipelines and experiments for crawling, parsing, normalizing, and importing data
- `core/` — shared types and utilities used by other packages
- `docs/` — product and technical notes
- `parser-example/` — sample tree-sitter parser usage
- `scripts/` — helpers for local development
- `tests/` — fixtures and integration helpers (Vitest)

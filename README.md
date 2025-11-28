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

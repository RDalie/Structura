# Structura

## Project overview

Structura is a static analysis and AI-assisted engineering platform. The monorepo houses the NestJS backend API, React frontend, ingestion pipelines, shared utilities, docs, and supporting scripts.

## Monorepo structure

- `backend/` – NestJS 11 API, Prisma client, health checks.
- `frontend/` – React + Vite app.
- `core/` – shared types and utilities.
- `ingestion/` – data ingestion experiments and pipelines.
- `learning/` – Python snapshot materializer and ML helpers.
- `tests/` – repo-wide test helpers and fixtures.
- `docker/` – docker-compose stack for local databases and admin tools.
- `scripts/`, `docs/`, `parser-example/`, `patches/` – helper scripts, notes, samples, and patches.
- `output/` – generated artifacts from helper scripts (e.g., resolved imports). Current samples were produced against the public Axios repository for validation.

## Prerequisites

- Node 20.19.0 (use `nvm` to match engines).
- npm 10+ with workspaces enabled.
- Docker and Docker Compose for local databases.
- Git and a shell with basic build tools.
- Python 3.12+ (for `learning/` snapshots).

## Cloning the repo

```bash
git clone https://github.com/your-org/structura.git
cd Structura
nvm install 20.19.0
nvm use 20.19.0
```

## Installing dependencies using npm workspaces

Install everything from the repo root so workspace links are created correctly:

```bash
npm install
```

If you need to reinstall cleanly:

```bash
rm -rf node_modules package-lock.json
npm install
```

To install a package in a workspace:

```bash
npm install <pkg> --workspace backend
npm install <pkg> --workspace frontend
```

## Initial Build (Required)

Shared workspace libraries must be built once so their `dist/` folders and type
definitions are available before building dependent packages.

```bash
npm run build --workspace core
npm run build --workspace ingestion
```

When you change code in `core` or `ingestion`, rebuild them so the backend picks
up the updated `dist/` output. To avoid manual rebuilds, run the watch scripts in
separate terminals while developing:

```bash
npm run watch --workspace core
npm run watch --workspace ingestion
```

Note: the backend watcher does not typically restart on changes in workspace
package outputs, so you may need to restart `npm run start:dev --workspace backend`
after updates land in `dist/`.

## Environment variables

Create env files before running services. Values below are safe defaults for local development.
If you start from an example file, copy it and remove the `.example` suffix for:
- `backend/.env.example` → `backend/.env`
- `learning/.env.example` → `learning/.env`
- `frontend/.env.local.example` → `frontend/.env.local`

**Root `.env` (optional, used for shared settings)**

```env
NODE_ENV=development
```

**Backend `backend/.env`**

```env
NODE_ENV=development
PORT=3000
CORS_ORIGIN=http://localhost:5173
DATABASE_URL=postgresql://structura:structura_password@localhost:5432/structura_db
```

**Frontend `frontend/.env`**

```env
VITE_API_BASE_URL=http://localhost:3000
```

## Learning (Python)

Install Python requirements:

```bash
python -m pip install -r learning/requirements.txt
```

Set env vars (choose one):

```bash
set -a
source learning/.env
set +a
```

Or:

```bash
set -a
source backend/.env
set +a
```

Run the snapshot CLI:

```bash
python learning/src/pipeline/run_export.py --snapshot_id <UUID>
```

## Docker services

Use Docker to start the local data stack (Postgres, MongoDB, Neo4j, pgAdmin, Mongo Express).

```bash
docker compose -f docker/docker-compose.yml up -d
# stop
docker compose -f docker/docker-compose.yml down
# stop and drop volumes
docker compose -f docker/docker-compose.yml down -v
```

Services and ports:

- Postgres: `5432`, user `structura`, password `structura_password`, db `structura_db`.
- MongoDB: `27017`.
- Neo4j: HTTP `7474`, Bolt `7687`, user `neo4j`, password `password123`.
- pgAdmin: `5050`, login `admin@structura.com` / `admin123`.
- Mongo Express: `8081`.

## Database admin tools

After `docker compose -f docker/docker-compose.yml up -d`:

- pgAdmin (Postgres): open `http://localhost:5050`, log in with `admin@structura.com` / `admin123`, add a new server pointing to host `postgres`, port `5432`, username `structura`, password `structura_password`, db `structura_db`.
- Mongo Express (MongoDB): open `http://localhost:8081` (auto-connects to the `mongo` container); default basic auth is enabled—username `admin`, password `pass`.
- Neo4j Browser: open `http://localhost:7474`, log in with `neo4j` / `password123`; Bolt is at `bolt://localhost:7687` if you use Neo4j Desktop or drivers.

## Running the backend

Backend lives in `backend/` and uses NestJS.

- Key folders: `src/` (app code), `prisma/` (schema and migrations), `generated/` (Prisma client), `test/` (Jest).
- Common scripts (run from repo root):
  - Ensure you completed the Initial Build step above first.
  - `npm run start:dev --workspace backend` – start API with hot reload.
  - `npm run start --workspace backend` – start without watch.
  - `npm run build --workspace backend` then `npm run start:prod --workspace backend` – production build and run.
  - `npm run test --workspace backend` – run Jest unit tests.
- Health check lives at `GET /health` and pings an external URL by default.

## Prisma 7 setup

- Config file: `backend/prisma.config.ts`

```ts
import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
```

- Schema: `backend/prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client"
  output   = "../generated/prisma"
  moduleFormat  = "cjs"
}

datasource db {
  provider = "postgresql"
}

model User {
  id    Int     @id @default(autoincrement())
  email String  @unique
  name  String?
}
```

- Install Prisma packages with workspaces (already present, but for reference):

```bash
npm install prisma @prisma/client --workspace backend
npm install @prisma/adapter-pg --workspace backend
```

- Generate client (run after schema changes; run from `backend/` to auto-pick config):

```bash
cd backend
npx prisma generate
# or from repo root with explicit config:
# npx prisma generate --config backend/prisma.config.ts --schema backend/prisma/schema.prisma
```

- Pull database schema into Prisma (run from `backend/` so the config is picked up):

```bash
cd backend
npx prisma db pull
# or from repo root:
# npx prisma db pull --config backend/prisma.config.ts --schema backend/prisma/schema.prisma
```

- Apply migrations:

```bash
cd backend
npx prisma migrate dev
# or from repo root:
# npx prisma migrate dev --config backend/prisma.config.ts --schema backend/prisma/schema.prisma
```

## Running the docs (Docusaurus)

- Dev server (port 4000): `npm run docs:start`
- Production build: `npm run docs:build`
- Preview a production build locally: `npm run docs:serve`

All commands run from the repo root (the docs site is a workspace under `docs/`).

Ensure `DATABASE_URL` matches your Postgres container when running these commands.

## Running the frontend

From the repo root:

```bash
npm run dev --workspace frontend
```

Then open `http://localhost:5173`. Build and preview:

```bash
npm run build --workspace frontend
npm run preview --workspace frontend
```

## Useful development commands

- Format all workspaces: `npm run format`
- Check formatting: `npm run format:check`
- Full test suite (backend Jest first, then Vitest in `tests/**`): `npm test`
- Backend tests only: `npm run test --workspace backend`
- Frontend lint: `npm run lint --workspace frontend`

## Troubleshooting

- Missing adapter packages: ensure `@prisma/adapter-pg` is installed in `backend` with `npm install @prisma/adapter-pg --workspace backend`.
- Prisma generate errors: confirm `DATABASE_URL` is set, Docker Postgres is running, and run `npx prisma generate --schema backend/prisma/schema.prisma`.
- Docker connection problems: check containers with `docker ps`, verify ports match env values, and restart with `docker compose -f docker/docker-compose.yml up -d`.
- Node version issues with nvm: run `nvm use 20.19.0` in each shell, then `node -v` to verify before running installs or Prisma commands.
- Module not found during Prisma commands: reinstall from root with Node 20 active (`rm -rf node_modules package-lock.json && npm install`) to restore workspace deps.

## Contribution guidelines

- Use Node 20.19.0 via `nvm use`.
- Install deps from repo root with npm workspaces.
- Add or update tests for your changes.
- Run format checks before pushing: `npm run format:check`.
- Keep environment examples up to date when adding new env vars.

### Snapshot Versioning and Semantic Changes

- `SNAPSHOT_VERSION` is a manually managed constant (see `core/config/snapshotVersion.ts` and docs/ast-system/snapshot-versioning.md).
- Bump the snapshot version when you change AST normalization semantics, node identity inputs, extraction rules, or graph construction semantics.
- Do **not** bump for refactors, performance tweaks, formatting, or logging-only changes.
- Skipping required bumps can corrupt persisted analysis, break graph comparisons, and invalidate evolution analysis results.

## License

All rights reserved.

This project is protected under copyright.  
No part of the codebase may be used, copied, modified, or distributed without explicit written permission from the copyright holder.

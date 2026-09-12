# Hotel New Era Platform

Hotel New Era is an integrated hotel website and management platform. The repository contains a React/Vite frontend and a Ruby on Rails JSON API backed by PostgreSQL.

## Start Here

Read these documents in this order when joining or resuming the project:

1. [`PROJECT_HANDOFF.md`](PROJECT_HANDOFF.md) — current state and next work.
2. [`docs/architecture/DIRECTORY_STRUCTURE.md`](docs/architecture/DIRECTORY_STRUCTURE.md) — what every major folder owns.
3. [`docs/architecture/MODULE_MAP.md`](docs/architecture/MODULE_MAP.md) — module-by-module implementation status.
4. [`docs/PROJECT_REQUIREMENTS_AND_RAILS_ROADMAP.md`](docs/PROJECT_REQUIREMENTS_AND_RAILS_ROADMAP.md) — consolidated MASTER VIBE requirements and roadmap.
5. [`backend/README.md`](backend/README.md) — Rails setup and commands.

## Technology

- Frontend: React 18, React Router, Vite 7, TypeScript
- Backend: Ruby 3.4.10, Rails 8.1.3.1 in API mode
- Database: PostgreSQL 17
- Local infrastructure: Docker Compose

## Repository Layout

```text
Hotel New Era/
|-- backend/                 Ruby on Rails API (authoritative backend)
|   |-- app/controllers/     HTTP endpoints, grouped by business domain
|   |-- app/models/          Active Record data model
|   |-- app/services/        Business workflows and calculations
|   |-- config/routes/       Routes split by business domain
|   |-- db/                  Rails migrations and seed data
|   `-- test/                Rails integration and unit tests
|-- src/                     React single-page application
|   |-- pages/public/        Public hotel website
|   |-- pages/auth/          Login experience
|   |-- pages/admin/         Hotel administration screens
|   |-- components/          Shared UI grouped by audience
|   |-- layouts/             Public/admin application shells
|   `-- lib/                 Router, authentication, and Rails API clients
|-- public/                  Static website assets
|-- docs/                    Requirements, architecture, and plans
|-- scripts/                 Project utility scripts
`-- MASTER VIBE.pdf          Original requirements source
```

## Run Locally

Start Rails and PostgreSQL:

```bash
npm run backend:build
docker compose -f backend/compose.yml run --rm api bin/rails db:prepare
npm run backend:up
```

In another terminal, start the React/Vite frontend:

```bash
npm install
npm run dev
```

- Website: `http://localhost:3000`
- Rails API: `http://localhost:3001/api/v1`
- Rails health check: `http://localhost:3001/up`

Development seed login:

- Email: `admin@hotelnewera.com`
- Password: `ChangeMe-Admin-2026!`

The seed password is development-only and must be overridden with `SEED_ADMIN_PASSWORD` outside local development.

## Architecture Rule

All backend business logic belongs in `backend/`. The React frontend uses the centralized API client in `src/lib/api-client.ts`, and Vite proxies `/rails-api` requests to Rails during local development.

Do not add hotel business logic to React components. Use a Rails service for workflows, an Active Record model for persistence, and a namespaced Rails controller for transport.

## Verification

```bash
npm run build
npm run backend:test
docker compose -f backend/compose.yml run --rm api bin/rubocop
docker compose -f backend/compose.yml run --rm api bin/brakeman --no-pager
docker compose -f backend/compose.yml run --rm api bin/rails zeitwerk:check
```

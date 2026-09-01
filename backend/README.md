# Hotel New Era Rails API

This directory contains the Rails backend. It is now the authoritative backend for application data, business workflows, authentication, and JSON APIs.

## Runtime

- Ruby 3.4.10
- Rails 8.1.3.1
- PostgreSQL 17
- JSON API under `/api/v1`

The Next.js application at the repository root remains the frontend. Existing files under `src/app/api` are compatibility proxies only; they should forward to Rails and must not contain database or business workflow code.

## Code Organization

API controllers and routes are grouped by business domain:

```text
app/controllers/api/v1/
|-- identity/    Authentication and users
|-- hotel/       Properties, room types, rooms, availability
|-- pms/         Reservations and front-desk workflows
|-- cms/         Pages and offers
|-- crm/         Guest profiles
|-- housekeeping/
|-- inventory/
|-- pos/
|-- procurement/
|-- banquet/
`-- accounting/

config/routes/
|-- identity.rb
|-- hotel.rb
|-- pms.rb
|-- cms.rb
|-- crm.rb
|-- operations.rb
`-- accounting.rb
```

Business logic belongs in `app/services/<domain>/`, while controllers should focus on authentication, parameters, status codes, and rendering. See `../docs/architecture/DIRECTORY_STRUCTURE.md` for the complete ownership guide.

## Start with Docker

```bash
docker compose -f backend/compose.yml build
docker compose -f backend/compose.yml run --rm api bin/rails db:prepare
docker compose -f backend/compose.yml up
```

Rails listens on `http://localhost:3001`; Next.js listens on `http://localhost:3000`.

## Checks

```bash
docker compose -f backend/compose.yml run --rm -e RAILS_ENV=test api bin/rails db:test:prepare test
docker compose -f backend/compose.yml run --rm api bin/rubocop
docker compose -f backend/compose.yml run --rm api bin/brakeman --no-pager
```

Copy `.env.example` only when running outside Compose. Never commit real credentials.

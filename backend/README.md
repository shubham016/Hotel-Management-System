# Hotel New Era Rails API

This directory contains the Rails backend. It is now the authoritative backend for application data, business workflows, authentication, and JSON APIs.

## Runtime

- Ruby 3.4.10
- Rails 8.1.3.1
- PostgreSQL 17
- JSON API under `/api/v1`

The React/Vite application at the repository root is the frontend. During development, Vite forwards `/rails-api/*` requests to this Rails API; database access and business workflows remain in Rails.

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

Rails listens on `http://localhost:3001`; the Vite frontend listens on `http://localhost:3000`.

## Overnight extensions and housekeeping

Compose also starts `stay_monitor`, which checks stays every minute without an
open browser. At 02:06 in the configured Rails timezone (Asia/Kathmandu), guests
still checked in beyond the previous day's scheduled departure are extended up
to the current date. The room rate and recurring service prices are preserved;
extra nights, applicable taxes, folio balance and an audit record are updated
together. Repeated runs do not add the same night again. If an incoming room
assignment conflicts, the extension is withheld and front desk receives an
in-app notification; the room remains occupied until staff resolve the conflict.

Dirty rooms and rooms awaiting inspection can be reserved through every booking
channel. They cannot be checked in until marked clean and ready. Checkout and
room transfers create cleaning tasks and in-app housekeeping notifications;
cleaning can either mark the room ready or send it for inspection. Housekeeping
roles need `TASKS: read, create`. Cleaning and inspection record the actual staff
member. Room boards refresh on changes in other browser tabs and poll every
15 seconds for changes from other devices.

On deployments outside Compose, supervise
`bundle exec rails runner script/monitor_stays.rb` alongside the API with the same
database configuration. Keep the monitor running for automatic processing.

## Checks

```bash
docker compose -f backend/compose.yml run --rm -e RAILS_ENV=test api bin/rails db:test:prepare test
docker compose -f backend/compose.yml run --rm api bin/rubocop
docker compose -f backend/compose.yml run --rm api bin/brakeman --no-pager
```

Copy `.env.example` only when running outside Compose. Never commit real credentials.

# Directory Structure and Ownership

This guide answers two questions: where existing code lives, and where new code should be added.

## Top-Level Ownership

| Path | Owns | Should not own |
|---|---|---|
| `backend/` | Rails API, data model, business workflows, authorization, jobs | React UI |
| `src/pages/` | React route pages and UI composition | New authoritative business logic |
| `src/components/` | Reusable React presentation and interaction | Database access |
| `src/layouts/` | Shared React application layouts | Backend persistence or business workflows |
| `src/lib/` | Frontend helpers, authentication, routing, and API client | Backend persistence or business workflows |
| `public/` | Static images, fonts, and downloadable assets | Uploaded production content |
| `docs/` | Architecture, requirements, decisions, plans | Executable application logic |

## Rails Backend

```text
backend/
|-- app/
|   |-- controllers/
|   |   `-- api/v1/
|   |       |-- identity/       sessions and future users/roles access
|   |       |-- hotel/          property configuration and room inventory
|   |       |-- pms/            reservations and front-desk operations
|   |       |-- cms/            website pages and offers
|   |       |-- crm/            guest profiles
|   |       |-- housekeeping/   room cleaning operations
|   |       |-- inventory/      stores and stock issue workflows
|   |       |-- pos/            restaurant tables and billing
|   |       |-- procurement/    purchase order workflows
|   |       |-- banquet/        event halls and bookings
|   |       |-- accounting/     chart of accounts, journals, reports
|   |       `-- base_controller.rb
|   |-- models/                 shared relational domain model
|   |-- services/
|   |   |-- authentication/     token issuing and decoding
|   |   |-- availability/       sellable-room inventory calculations
|   |   |-- document_numbers/   concurrency-safe business numbering
|   |   |-- pricing/            room quote and tax calculations
|   |   `-- reservations/       transactional reservation workflows
|   |-- jobs/                   asynchronous tasks
|   `-- mailers/                application email delivery
|-- config/
|   |-- routes.rb               small route manifest plus health check
|   `-- routes/                 domain-specific API routes
|-- db/
|   |-- migrate/                versioned PostgreSQL schema changes
|   |-- schema.rb               generated current Rails schema
|   `-- seeds.rb                repeatable local baseline data
|-- test/
|   |-- integration/            API workflow tests
|   |-- models/                 model behavior tests
|   `-- services/               service behavior tests as they are added
|-- openapi/v1.yaml             external API contract
|-- compose.yml                 local PostgreSQL and Rails services
`-- README.md                   backend setup
```

Models stay at `app/models/` because the hotel modules share a relational domain: a reservation connects a guest, room inventory, pricing, a folio, taxes, and eventually accounting. Controller and service namespaces provide navigation without fragmenting shared entities.

## React/Vite Frontend

```text
src/
|-- pages/
|   |-- public/                 guest-facing website routes
|   |-- auth/                   authentication routes
|   |-- admin/                  authenticated operational screens
|-- layouts/                    shared route layouts
|-- styles/                     application-wide CSS and design tokens
|-- components/
|   |-- public/                 guest-facing components
|   |-- admin/                  administration shell components
|   `-- ui/                     reusable design-system primitives
|-- lib/                        shared helpers and Rails API client
|-- App.tsx                     client-side route definitions
`-- main.tsx                    browser application entry point
```

React Router defines URL paths in `src/App.tsx`. For example, the page at `src/pages/admin/pms/rooms/page.tsx` serves `/admin/pms/rooms`.

Each route owns a folder. Keep `page.tsx` focused on loading data, coordinating state, and composing the screen. When a page grows, place its private code beside it:

```text
src/pages/admin/cms/hotel-setup/
|-- page.tsx                    route controller and composition
|-- api.ts                     feature-specific API requests
|-- types.ts                   feature data and form types
|-- constants.ts               defaults and fixed options
`-- components/                forms, tables, dialogs, and sections
```

Only place a component in `src/components/` when multiple routes use it. This keeps each business area self-contained while avoiding a single large global components folder.

## Where to Add New Work

| Work | Location |
|---|---|
| New public page | `src/pages/public/<route>/page.tsx`, registered in `src/App.tsx` |
| New admin page | `src/pages/admin/<module>/page.tsx`, registered in `src/App.tsx` |
| Reusable generic UI | `src/components/ui/` |
| Admin-only component | `src/components/admin/<module>/` |
| Rails API call | `src/lib/api-client.ts`, using the `/rails-api` development proxy |
| Rails endpoint | `backend/app/controllers/api/v1/<domain>/` |
| Rails route | `backend/config/routes/<domain>.rb` |
| Multi-step business workflow | `backend/app/services/<domain>/` |
| Persistent entity or invariant | `backend/app/models/` plus a migration |
| Background process | `backend/app/jobs/<domain>/` |
| API workflow test | `backend/test/integration/` |
| Requirement or architecture decision | `docs/` |

When a new backend domain is introduced, create the controller namespace, service directory, model/migration if needed, and route file together. Use clear business names such as `housekeeping`, `pos`, `inventory`, `accounting`, or `cms`.

## Generated and Local-Only Directories

Do not hand-edit or copy `node_modules/`, `dist/`, `.vite/`, `backend/tmp/`, `backend/log/`, or PostgreSQL Docker volumes. These are generated locally and excluded from source control.

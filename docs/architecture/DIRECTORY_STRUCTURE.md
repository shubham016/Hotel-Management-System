# Directory Structure and Ownership

This guide answers two questions: where existing code lives, and where new code should be added.

## Top-Level Ownership

| Path | Owns | Should not own |
|---|---|---|
| `backend/` | Rails API, data model, business workflows, authorization, jobs | React UI |
| `src/app/` | Next.js pages, layouts, UI composition | New authoritative business logic |
| `src/components/` | Reusable React presentation and interaction | Database access |
| `src/lib/` | Frontend helpers and Rails proxy utilities | Backend persistence or business workflows |
| `src/app/api/` | Compatibility proxy routes that forward old frontend URLs to Rails | Database access or business logic |
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

## Next.js Frontend

```text
src/
|-- app/
|   |-- (public)/               guest-facing website routes
|   |-- (auth)/                 authentication routes
|   |-- (admin)/admin/          authenticated operational screens
|   |-- api/                    proxy-only routes forwarding to Rails
|   |-- globals.css
|   `-- layout.tsx
|-- components/
|   |-- public/                 guest-facing components
|   |-- admin/                  administration shell components
|   `-- ui/                     reusable design-system primitives
`-- lib/                        shared helpers and Rails proxy utility
```

Parentheses in Next.js route groups organize source code without adding a URL segment. For example, `src/app/(admin)/admin/pms/rooms/page.tsx` serves `/admin/pms/rooms`.

## Where to Add New Work

| Work | Location |
|---|---|
| New public page | `src/app/(public)/<route>/page.tsx` |
| New admin page | `src/app/(admin)/admin/<module>/page.tsx` |
| Reusable generic UI | `src/components/ui/` |
| Admin-only component | `src/components/admin/<module>/` |
| Old frontend URL bridge | `src/app/api/<module>/route.ts` using `proxyRails()` only |
| Rails endpoint | `backend/app/controllers/api/v1/<domain>/` |
| Rails route | `backend/config/routes/<domain>.rb` |
| Multi-step business workflow | `backend/app/services/<domain>/` |
| Persistent entity or invariant | `backend/app/models/` plus a migration |
| Background process | `backend/app/jobs/<domain>/` |
| API workflow test | `backend/test/integration/` |
| Requirement or architecture decision | `docs/` |

When a new backend domain is introduced, create the controller namespace, service directory, model/migration if needed, and route file together. Use clear business names such as `housekeeping`, `pos`, `inventory`, `accounting`, or `cms`.

## Generated and Local-Only Directories

Do not hand-edit or copy `node_modules/`, `.next/`, `backend/tmp/`, `backend/log/`, or PostgreSQL Docker volumes. These are generated locally and excluded from source control.

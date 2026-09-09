# Hotel New Era — Project Handoff

**Updated:** 2026-09-02  
**Backend direction:** Ruby on Rails JSON API  
**Current migration stage:** Rails owns backend APIs; Next.js API routes are compatibility proxies

## Resume Here (2026-09-02 session end)

The Rails backend is established in `backend/`; it is now the authoritative backend for the active application API surface. Authentication, hotel inventory, availability, pricing, reservation creation and lifecycle management, PMS rooms, front desk, folios, checkout, night audit, CMS pages/offers, CRM guests, housekeeping, inventory, POS, procurement, banquet, accounting, audit records, notifications, and document sequencing have Rails implementations.

The public booking workflow and administration modules communicate with Rails either directly through `/rails-api/...` rewrites or through thin compatibility routes under `src/app/api`. Those Next.js API files should stay proxy-only until each frontend fetch is moved directly to Rails.

**This session's work (full detail in `docs/CONVERSATION.md`, dated entries under 2026-09-02):**
- Ran a 5-module audit (PMS/POS/CRM/Accounting/CMS) against the spec and wrote the phased build plan: `docs/plans/IMPLEMENTATION_PLAN_v3.0_OWNER_PORTAL.md`. Phase 0 (POS billing server-trust fix, transactions, idempotency, journal/audit-log immutability) is done; BS/AD date conversion is still stubbed and open.
- Rebuilt the admin dashboard on real data (`GET /api/v1/dashboard`), added 6 stat tiles with sparklines.
- Admin topbar/sidebar: dark mode (with a real accent-color contrast pass, not just backgrounds), a quick-nav search, spacing/sizing fixes, a working notifications bell (new `notifications` API + UI, backed by the pre-existing but previously unused `Notification` model).
- **Seeded a real, permission-checked `OWNER` role** (was `SUPER_ADMIN`, which bypasses all authorization — nothing had ever been tested against a scoped role). Full audit of every controller's permission module/action pairs is in `db/seeds.rb`'s comments and `docs/CONVERSATION.md`.
- **Fixed a live production bug found while verifying the above**: the public site's availability search, CMS content, and contact form were all 500ing for every anonymous visitor (`skip_before_action :authenticate!` without also skipping `authorize_request!` in 4 controllers). Confirmed via direct curl before/after.

Next recommended work:

1. Continue the Owner-portal plan: BS/AD date conversion port, then Phase 1 (posting-rule/account-mapping model) before Phase 2 (wire the PMS reservations page — still 100% mock data with zero fetch calls despite the backend fully supporting it).
2. Extend dark-mode CSS-variable theming to the ~18 remaining admin pages that still use hardcoded `#FFFFFF` (POS, CRM, housekeeping, inventory, procurement, banquet, accounting, CMS, audit-logs, settings, front desk, rooms, night-audit) — currently only the shell + dashboard are dark-mode-correct.
3. Seed the remaining §6.2 roles (Manager, HR, Staff, Finance) once those portals are actually being built — not urgent now that `OWNER` exists and is verified.
4. Move frontend fetch calls from `/api/...` proxy URLs to `/rails-api/v1/...` where practical.
5. Expand accounting automation for POS, checkout, banquet, inventory, and procurement.
6. Add production deployment settings, backup policy, monitoring, and error reporting.

## Confirmed Working Foundation

- Ruby 3.4.10 and Rails 8.1.3.1 API application.
- PostgreSQL 17 through Docker Compose.
- JWT login and current-user endpoint.
- Refresh-token backed API sessions with rotation and logout revocation.
- Password reset token workflow with session revocation after reset.
- API request throttling for general and sensitive authentication endpoints.
- Production startup guards for required secrets, host authorization, SSL, and CORS origins.
- Default server-side role/permission authorization for authenticated API actions.
- Company and property tenant scope on authenticated API requests.
- Property, room type, room, and availability read APIs.
- Transactional reservation creation with room quote, taxes, folio, and audit log.
- Transactional reservation modification, cancellation, room assignment, check-in, stay extension, and room transfer.
- Next.js public booking integration with Rails.
- Development seeds for one property, 43 rooms, room types, rates, taxes, services, role, and administrator.
- OpenAPI description in `backend/openapi/v1.yaml`.
- Rails persistence for CMS, CRM, housekeeping, inventory, POS, procurement, banquet, accounting, contact inquiries, notifications, and payments.
- Proxy-only Next.js API compatibility files with no Prisma imports.

## Current API Domains

```text
backend/app/controllers/api/v1/
|-- identity/       Authentication and current-user identity
|-- hotel/          Properties, room types, rooms, availability
|-- pms/            Reservations, PMS rooms, front desk, folios, checkout, night audit
|-- cms/            Public/admin CMS pages and offers
|-- crm/            Guest profiles
|-- housekeeping/   Room cleaning status/actions
|-- inventory/      Stores, stock balances, stock issue
|-- pos/            Restaurant tables, menu items, and billing
|-- procurement/    Purchase orders
|-- banquet/        Halls and event bookings
|-- accounting/     Chart of accounts, journals, reports
|-- dashboard_controller.rb     Owner-portal overview stats (7-day trends, GL-sourced revenue)
|-- notifications_controller.rb In-app notifications (list, mark-as-read)
|-- contact_inquiries_controller.rb
`-- base_controller.rb

backend/config/routes/
|-- identity.rb
|-- hotel.rb
|-- pms.rb           (also draws the top-level dashboard resource)
|-- cms.rb
|-- crm.rb
|-- operations.rb    (housekeeping, inventory, pos, procurement, banquet)
|-- accounting.rb
`-- notifications.rb
```

The public URL contract remains `/api/v1/...`; the domain folders improve internal ownership without changing client URLs.

## Migration Boundary

`backend/` is the authoritative destination for all backend work. `src/app/api/` is now only a compatibility proxy layer. Prisma source files and package dependencies were removed from the active frontend stack.

Before deleting a proxy endpoint:

1. Switch every frontend consumer from `/api/...` to `/rails-api/v1/...` or a shared frontend API client.
2. Run Rails checks and the Next.js production build.
3. Search for remaining fetches to that `/api/...` path.
4. Remove only the obsolete proxy route.

## Important Requirements

- Support multi-company and multi-property tenancy from the beginning.
- Use integer minor units or fixed-precision decimals for financial values; never floating-point arithmetic.
- Keep reservation, inventory, folio, payment, and accounting writes transactional.
- Preserve append-only audit evidence for sensitive operations.
- Enforce permissions and tenancy on the server.
- Do not use wildcard CORS origins or short JWT secrets in production.
- Generate sequential business document numbers safely under concurrency.
- Keep Nepal taxation, fiscal reporting, and BS/AD date presentation requirements explicit.

The full requirements audit is in `docs/PROJECT_REQUIREMENTS_AND_RAILS_ROADMAP.md`.

## Common Commands

```bash
# Start backend and database
npm run backend:up

# Prepare database
docker compose -f backend/compose.yml run --rm api bin/rails db:prepare

# Rails tests and quality checks
npm run backend:test
docker compose -f backend/compose.yml run --rm api bin/rubocop
docker compose -f backend/compose.yml run --rm api bin/brakeman --no-pager
docker compose -f backend/compose.yml run --rm api bin/rails zeitwerk:check

# Frontend
npm run dev
npm run build
```

## Safe Development Workflow

- Put HTTP concerns in the appropriate namespaced Rails controller.
- Put multi-record workflows and calculations in `backend/app/services/<domain>/`.
- Put persistence rules and associations in Active Record models.
- Add a route to the matching `backend/config/routes/<domain>.rb` file.
- Add or update integration tests under `backend/test/integration/`.
- Update `docs/architecture/MODULE_MAP.md` when a module changes migration state.

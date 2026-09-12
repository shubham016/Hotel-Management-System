# Hotel New Era — Project Handoff

**Updated:** 2026-09-12
**Backend direction:** Ruby on Rails JSON API
**Current frontend:** React 18 + React Router + Vite 7 SPA; Rails owns every backend API

## Resume Here (2026-09-02 session end)

The Rails backend is established in `backend/`; it is now the authoritative backend for the active application API surface. Authentication, hotel inventory, availability, pricing, reservation creation and lifecycle management, PMS rooms, front desk, folios, checkout, night audit, CMS pages/offers, CRM guests, housekeeping, inventory, POS, procurement, banquet, accounting, audit records, notifications, and document sequencing have Rails implementations.

The public booking workflow and administration modules communicate with Rails through the centralized React API client and Vite's `/rails-api` development proxy. The former Next.js API compatibility routes have been removed.

## Resume Here (2026-09-12 frontend migration)

- Replaced Next.js with a React/Vite SPA while preserving all public and admin URLs.
- React Router owns navigation and layouts; Rails remains the only backend and source of business logic.
- The API client maps existing frontend `/api/...` calls to Rails `/api/v1/...`, adding JWT and property context.
- Login persists the Rails token/profile according to Remember Me, validates sessions with `/auth/me`, revokes refresh sessions on logout, and redirects expired sessions to login.
- A top-level error boundary prevents a component failure from blanking the entire application.
- Removed the Next dependency, server layouts, API proxy routes, and build configuration.
- Verified the Vite production build, all 29 frontend routes, and core authenticated Rails endpoints.
- **Permanent code-organization rule:** use a domain-first, one-route-per-folder structure modeled on the local recruitment system. Each route owns `page.tsx`; feature-specific CRUD components, API functions, types, constants, and hooks stay beside it. The authoritative rule is `.agents/rules/hotel_new_era_preferences.md` section 6.

## Resume Here (2026-09-11 session end)

### Completed today

- **Login and dashboard responsiveness:** reduced unnecessary post-login work by preserving a display-only session profile cookie and by using the compact dashboard response path. The dashboard now has a route loading state. The related Rails development logging was reduced to normal `info` level because verbose Docker bind-mount SQL logging was adding local delay.
- **Exact room assignment:** the Dashboard **New Booking** flow now supports selecting a specific available room. The selected room is sent to Rails, reserved atomically, and reflected in the Room Board. The backend validates availability rather than trusting the browser.
- **Correct BS/AD dates:** replaced the previous approximate, incorrect frontend conversion with `@inicrea/bikram-sambat-core`, which uses Bikram Sambat calendar data. Confirmed result: `2026-09-11` AD is `2083-05-26` / **26 Bhadra 2083 BS**, fiscal year `2083/84`.
- **CMS media is real and property-scoped:** added `CmsMediaAsset`, authenticated Rails media endpoints, local Active Storage persistence, image validation (JPG/PNG/WebP/GIF, maximum 10 MB), and audit records. Database migrations applied:
  - `20260911000001_create_cms_media_library.rb`
  - `20260911000002_create_active_storage_variant_records.rb`
- **Hotel Setup workflow:** `/admin/cms/hotel-setup` manages operational master data (floors, room categories, and rooms). Public page images are uploaded directly from `/admin/cms/pages`.

### Validation completed today

- `npx tsc --noEmit` passed after the active frontend changes.
- Real authenticated CMS media workflow passed against Rails: upload → list → public image request (HTTP 200) → delete.
- Authenticated request through the Vite-to-Rails proxy returned HTTP 200.
- Rails migrations and seeds were applied to local Docker development. The OWNER seed role now has `CMS` read/create/delete permissions required by the new media API.

### Important current caveats

- Production hosting must provide SPA history fallback to `index.html` and reverse-proxy `/rails-api/*` to Rails `/api/*`.
- CMS media currently uses the local Active Storage disk service. For production, configure S3-compatible/object storage and persistent backups before deployment; do not rely on ephemeral server disk.

### Recommended next work

1. Continue CMS depth: page sections beyond hero, saved contact information, testimonials/FAQs, draft/publish scheduling and revisions.
2. Resolve the public-page Suspense build failures before a production release.
3. Add integration tests for CMS pages/offers/media; the current media workflow is manually verified but needs automated coverage.
4. Continue PMS reservation UI wiring and live dashboard data improvements as described below.

## Resume Here (2026-09-09 session end)

### Reference project

Use `D:\Laravel Projects\kamra-pms-develop` as the local design and workflow reference for future Hotel New Era work. Copy its interaction and layout patterns selectively, but keep Hotel New Era's React/Vite + Rails architecture, Nepal localization, and own branding/data.

### Current UI state

- Dashboard top KPI cards are temporary static presentation seed data: Arrivals 1, Departures 0, In-house 10, Occupancy 20% (3 of 15), Revenue `Rs. 9,819`, RevPAR `Rs. 983`. Fixed sparklines and the Kamra-style layout are in `src/pages/admin/dashboard/page.tsx` and `src/components/ui/StatTile.tsx`.
- KPI cards now mirror Kamra's compact `StatCard`: icon/label row, value and fixed 96×32 sparkline side-by-side, subtle border, and progress-bar variant. Revenue labels do not wrap.
- Dashboard header has compact `New Booking` → `/book`.
- Clicking a Room Board room opens a status modal (Clean, Dirty, Inspected, Occupied, Out of Order) and saves only after **Update status**. The unselected Occupied option uses soft green/dark text for visibility.
- Sidebar width is 240px (208px Kamra reference was too narrow for HNE labels); sidebar-header horizontal padding is 12px.
- Topbar includes: compact Kamra-style app-grid launcher, UI-only temporary hotel selector (Butwal/Kathmandu/Pokhara), flexible search, website/theme/notifications/user controls. The launcher opens a 3-column icon grid and **View all apps** → `/admin/apps`.
- Current topbar spacing: 16px left padding, 16px app-grid/hotel gap, 12px hotel/search and utility gaps, flexible `AdminSearch` (`minWidth: 210px`), 32px right padding. Do not restore fixed 420px search width.

### Local development/auth state

- `backend/config/initializers/bcrypt.rb` applies `BCRYPT_COST` only in development/test. Docker development sets `BCRYPT_COST: 8`; production bcrypt security is unchanged. Default local seeded login remains `admin@hotelnewera.com` / `ChangeMe-Admin-2026!` unless manually changed.
- The frontend is now Vite-based; the former `.next` cache warning no longer applies.

### Next work

1. Replace static KPI values and temporary property selector with live Rails data only after visual approval; real Kathmandu/Pokhara properties need explicit authorization and tenant/property-context wiring.
2. Continue adapting Kamra's front-desk workflow patterns (Today board, reservation detail, tape chart) without changing HNE's backend architecture.
3. Sajhilostay reference: do not attempt to extract private backend data. The requested demo URL was inaccessible here; require authorized credentials, screenshots/video, or an official export before using it as reference.

Validation at session end: `npx tsc --noEmit` passed; `http://localhost:3000/admin/dashboard` returned HTTP 200.

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
- React public booking integration with Rails.
- Development seeds for one property, 43 rooms, room types, rates, taxes, services, role, and administrator.
- OpenAPI description in `backend/openapi/v1.yaml`.
- Rails persistence for CMS, CRM, housekeeping, inventory, POS, procurement, banquet, accounting, contact inquiries, notifications, and payments.
- Centralized React-to-Rails API client with no Prisma imports.

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

`backend/` is the authoritative destination for all backend work. React owns presentation; Rails owns persistence, authorization, validation, and business workflows. Prisma and Next.js were removed from the active frontend stack.

When adding or changing a frontend API call, update the shared mapping in `src/lib/api-client.ts` and implement the authoritative endpoint, authorization, validation, and audit behavior in Rails.

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

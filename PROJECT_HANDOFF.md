# Hotel New Era — Project Handoff

**Updated:** 2026-10-08
**Backend direction:** Ruby on Rails JSON API
**Current frontend:** React 18 + React Router + Vite 7 SPA; Rails owns every backend API

## Resume Here (2026-10-07 session end)

This entry supersedes older descriptions of demo logins, unrestricted staff navigation, sample kitchen tickets, and incomplete booking wiring. See the detailed **2026-10-07** entry in [`docs/CONVERSATION.md`](docs/CONVERSATION.md).

### Current staff portals

- Existing `admin@hotelnewera.com` remains **OWNER**. **ADMIN** is now **All-rounder / Admin**, with full hotel access within assigned properties. The owner account is protected from staff account edits.
- One login at `/login` routes staff to their workspace. Owner/Admin open Dashboard; Front Desk opens `/admin/pms/frontdesk`; Housekeeping/Cleaning opens `/admin/housekeeping`; Restaurant opens `/admin/pos/tables`; Kitchen Cook/Helper opens `/admin/pos/kot`.
- `/admin/staff-access` lets Owner/Admin create individual accounts from the existing Staff Directory, assign roles, change passwords, and activate/deactivate access. The **Sign-in email** column is the login ID. Passwords are not displayed. Role/password/access changes revoke existing sessions.
- Keshav Bhattarai (`keshav@hotelnewera.com`, ADMIN) and Devi Thapa (`devi@hotelnewera.com`, FRONT_DESK_STAFF) now have active accounts; the user confirmed both logins work. Do not invent credentials for other employees or change existing passwords merely to verify them.
- Forgot password now submits an administrator-assisted request. Pending requests and email-delivery status persist on users; same-company administrators sharing an assigned active property receive in-app notifications and queued email. Staff Portal Access shows requests and email links open the matching account editor. Owner/Admin set a replacement password and share it privately; staff choose their own password in My Profile. Public requests no longer expose raw reset tokens. SMTP setup remains required for real inbox delivery.
- Helpers may use Kitchen and cleaners may use Housekeeping with individual accounts. A dedicated Dishwasher portal is unnecessary for current workflows.
- Backend permissions, page guards, sidebar, app switcher and search enforce role access. Front Desk can manage bookings, advances, folios and checkout; Owner/Admin record refund payouts and delete/archive bookings. `/admin/profile` lets every authenticated employee change their own password.
- Restaurant/Kitchen now use persisted tables and KOT tickets, not sample browser-only orders: Restaurant sends -> Cook prepares/marks ready -> Restaurant marks served -> settlement or posting to an actual in-house room. Menu prices are saved on tickets, retries are protected, and settlement releases the table. Direct wallet selections record a received payment; they do not collect money online.
- Mobile staff navigation is collapsible. Only the real current hotel is displayed; old dummy property options were removed.

### Booking/payment state

- Booking receipt/voucher and mobile payment confirmation use a single guest-facing booking reference, customer and stay details. Duplicate cancellation policy text was removed.
- Before check-in, cancellation retains 10% of the actual amount paid and marks the remaining 90% due. Staff payout recording preserves original payments and accounting/audit records; it does not automatically send money to a wallet.
- Manual cash/bank advances, payment retry protection, resumable eSewa checkout, guest identity preservation, pagination and dashboard search are implemented. Clicking a dashboard search match opens the selected booking in Reservations Matrix. Placeholder: `Search reservation, Name, Mobile, Rooms, ID...`.
- A regression found during portal verification was corrected: booking references ending in digits no longer trigger unrelated normalized-phone matches.
- Public live wallet checkout still needs merchant credentials and a public HTTPS return URL; the local gateway setup remains sandbox. Do not enable live checkout without those inputs.

### Verification and local state

- Migrations `20261007000001` through `20261007000004` were applied locally: cancellation refunds, payment idempotency/public checkout, staff accounts/roles, and kitchen orders.
- Frontend typecheck and production build passed. Browser checks with isolated fixture data passed for all six roles, restricted-route redirects, account creation, restaurant/kitchen/settlement, and mobile Kitchen/Housekeeping layouts.
- Staff/auth/POS checks: 16 runs / 140 assertions initially passed; later staff/POS checks passed 12 runs / 123 assertions. The booking/notifications/portal regression run had 56 runs / 907 assertions with one search failure; its corrected focused rerun passed 4 runs / 129 assertions. Final room-posting/auth checks passed 4 runs / 61 assertions; kitchen invalid-input checks passed 1 run / 5 assertions. These are separate, overlapping runs, not a single full-suite result.
- `git diff --check` passed. Temporary browser fixtures/processes were removed. Work remains uncommitted in the working tree; no production deployment was performed.

### Resume tomorrow

1. Configure outgoing SMTP and real Owner/Admin inboxes for staff reset notifications; remaining employee provisioning requires the hotel's actual employee emails and individual passwords.
2. Exercise each department with hotel staff and real operational data. Discuss housekeeping assignment/stayover cleaning or additional restaurant workflows only if needed.
3. Keep inventory/accounting improvements deferred unless the user resumes that scope. The review found unsafe stock-issue validation, incomplete purchasing, financial-report calculation gaps, banquet validation gaps, and incomplete night-audit closing. Those modules were reviewed, not fixed in this session.
4. Email-assisted password reset code is implemented; SMTP credentials and real inbox delivery verification remain outstanding. The local Active Job adapter is in-process, so queued mail needs a durable worker/queue for production. Live gateway credentials, public HTTPS URL, and deployed backup/restore verification remain outstanding.

## Resume Here (2026-09-29 session end)

The client image import and confirmations are documented in [`docs/CLIENT_DATA_IMPORT.md`](docs/CLIENT_DATA_IMPORT.md). The complete recent work record and next steps are in [`docs/CONVERSATION.md`](docs/CONVERSATION.md), under **Record Entry: 2026-09-29**.

Current public/admin typography uses DM Sans for interface text and Newsreader for public editorial headings. Footer Quick Navigation links are not underlined. The latest typography change passed the TypeScript check. Guest capacities from the sheets remain provisional, and inquiries assigned to inactive rooms 102 and 104 need reassignment before check-in.

## Resume Here (2026-09-12 session end)

### Completed today

- Hotel Setup is the operational inventory screen at `/admin/cms/hotel-setup`. It manages Floors, Room Categories, and Rooms with live Rails CRUD; `/admin/cms/pages` remains the website-content editor.
- Removed demo/seed inventory from Hotel Setup and the Dashboard Room Board. Existing demo room categories and rooms are marked/prefixed as demo data, leaving operational inventory to be created through Hotel Setup.
- Added bulk room creation: an owner can create a consecutive room range (for example 101 to 110) at once. Room lists now use natural numeric ordering rather than lexicographic ordering (1, 2, ... 10).
- Added per-floor room management: compact room ranges, expandable individual-room controls, and a delete-all-rooms-on-floor action.
- Corrected Owner access for Hotel Setup through the `ROOM_SETUP` permission module. Manager and Front Desk Staff have status-update access through the separate `ROOMS` module.
- Room Category form improvements: amenities accept comma-separated values normally; Base nightly rate, Adults, and Children start blank; total capacity is calculated after adult and child values are entered.

### Validation completed today

- Frontend typecheck passed: `npm.cmd run typecheck`.
- Production frontend build passed earlier in this session.
- Rails test suite passed: 16 runs, 90 assertions, 0 failures.
- Rails database migrations are up, and the Docker API/database health checks returned HTTP 200 / healthy.

### Resume next session

1. Continue testing real owner-created floors, room categories, and bulk rooms in Hotel Setup.
2. Replace remaining hard-coded PMS Room Board labels/counts with live values where needed.
3. Continue the live Rails integration for remaining admin and staff workflows.

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
- **Operational inventory rule:** old seed rooms and room categories are marked demo-only and excluded from Hotel Setup and the Dashboard Room Board. Create all operational floors, room categories, and rooms through `/admin/cms/hotel-setup`.
- **Hotel Setup permission rule:** Floors, Room Categories, and Rooms are one operational inventory module. The `OWNER` role has `ROOM_SETUP` read/create/update/delete access; do not split these permissions into separate `FLOORS` or `ROOM_TYPES` modules. `ROOMS` is reserved for operational room-status access.

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

## Session Update - 2026-09-17

- The public Room and Home catalog cards are live from Hotel Setup Room Categories through `GET /api/v1/room_catalog`; do not restore the old hard-coded category arrays.
- The booking page's Optional Add-On Experiences are live from `GET /api/v1/add_on_catalog`. It supports `PER_BOOKING`, `PER_NIGHT`, `PER_GUEST`, and `PER_GUEST_PER_NIGHT`; guest-based pricing includes adults and children.
- SPA is now `PER_GUEST` (Rs. 4,000 per person) via migration `20260917000001_set_spa_pricing_per_guest`.
- Dashboard stat values are live. The visual stat icons/sparklines are deliberately fixed; data refreshes on focus, visibility, dashboard booking, and every 30 seconds. A reservation is an Arrival/Reserved room, while only a checked-in guest contributes to In-house and Occupancy.
- Embedded dashboard bookings use authenticated staff permissions. `20260917000002_grant_operational_booking_permissions` grants booking-create permission to OWNER, MANAGER, and FRONT_DESK_STAFF. The create endpoint accepts either `RESERVATIONS:create` or `PMS_FRONTDESK:create`.
- Browser favicon points to `public/images/favicon_logo.png`.
- Validation after this session: full Rails suite 33 runs / 192 assertions / 0 failures; changed backend files pass RuboCop; production frontend build passes.

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

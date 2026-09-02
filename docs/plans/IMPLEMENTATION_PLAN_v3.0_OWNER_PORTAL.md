# Hotel New Era — Implementation Plan v3.0.0

## Owner (Admin) Portal Completion, Pre-Super-Admin

**Status date:** 2026-09-02
**Author:** Claude Sonnet 5, from a 5-agent parallel code audit against `docs/PROJECT_REQUIREMENTS_AND_RAILS_ROADMAP.md`

---

## 0. Product direction

The system is being built and sold as a multi-tenant SaaS for hotels, restaurants, and resorts, with a planned portal split:

- **Super Admin** — cross-tenant access to every hotel/resort/restaurant customer (KOT, CMS, everything).
- **Admin (Owner)** — owns one hotel/restaurant/resort. **This is the current focus.**
- **Manager** — operational control within one property.
- **HR**, **Staff**, **Finance** — narrower role-scoped access.

Decision (2026-09-02): build the single-tenant **Owner portal to production quality first** — PMS, POS, CRM, Accounting, CMS — using Hotel New Era as the reference customer. The **Super Admin multi-tenant layer comes after**, once the Owner portal is sellable. Do not build Super Admin scaffolding speculatively before this phase is done.

The existing granular-role list in `docs/PROJECT_REQUIREMENTS_AND_RAILS_ROADMAP.md` §6.2 (Company Administrator, General Manager, Front Office Manager, Accountant, Finance Manager, HR Manager, etc.) is the eventual permission catalogue; the 5-6 "portals" mentioned by the business are coarser UI groupings over that catalogue. Only `SUPER_ADMIN` is seeded today (`backend/db/seeds.rb`); the RBAC engine itself (`Api::V1::BaseController#authorize!`, `Role#allows?`) is real and functional, it's just under-seeded — `SUPER_ADMIN` bypasses all checks, so no request has actually been tested against a scoped role yet.

## 1. Audit method

Five parallel agents each read the actual backend controllers/services/models and frontend admin pages for one module, and compared them against the corresponding numbered section of `docs/PROJECT_REQUIREMENTS_AND_RAILS_ROADMAP.md`. Findings below are grounded in file:line references gathered during that pass, not assumptions. `MODULE_MAP.md`'s "Rails-owned, proxy-only UI bridge" status per module turned out to mean *the backend model/controller exists*, not that the feature is complete or that the frontend calls it.

## 2. Cross-cutting defects (fix before any module build-out)

These are correctness/financial-integrity/security defects in code that already runs, found across module boundaries. They must land first because later work in every module builds on top of them.

| # | Defect | Where | Why it matters |
|---|---|---|---|
| 1 | POS billing trusts client-sent `grandTotal`/`subTotal`/`vatAmount`/`serviceCharge` instead of recomputing server-side | `backend/app/controllers/api/v1/pos/billing_controller.rb` (create action) | Any client can settle any amount to a guest folio or cash drawer. Worst finding in the audit. |
| 2 | No enclosing transaction around folio-item + folio-update + audit writes, or journal + journal-lines writes | same file, lines ~28-39, ~45-58 | Partial writes on failure corrupt folio/ledger state. |
| 3 | No idempotency guard on room-posting | same file, `post_to_room`, lines ~22-40 | A retried request double-posts a charge to a guest folio. |
| 4 | `JournalEntry has_many :journal_lines, dependent: :destroy`, no immutability on `status: "POSTED"` | `backend/app/models/journal_entry.rb` | Deleting a posted journal silently cascades — directly violates the "posted financial records must not be silently editable/deletable; use reversals" requirement. |
| 5 | `AuditLog` has no DB-level immutability (`readonly?`, or update/destroy guard) | `backend/app/models/audit_log.rb` | "Append-only audit evidence" is convention-only today, not enforced. |
| 6 | Account codes `"1001"`/`"4002"` are hard-coded inside `billing_controller.rb#create_journal!` rather than resolved from a posting-rule/account-mapping config | same file, lines ~42-58 | Spec requires posting rules to be configurable, not hard-coded in service code. Every new revenue-posting hook (reservation advance, room revenue) will copy this anti-pattern unless a `PostingRule`/`AccountMapping` model exists first — this blocks Accounting phase 6 and PMS phase 3's revenue postings. |
| 7 | BS (Bikram Sambat) date conversion is stubbed as `Date.current.iso8601` in three places instead of real calendar math | `backend/app/controllers/api/v1/pms/night_audit_controller.rb:13,58`, `backend/app/controllers/api/v1/accounting/reports_controller.rb` (`bsFormatted`) | Violates the explicit BS/AD dual-date requirement. A real conversion already exists client-side in `src/lib/nepali-calendar.ts` — port the algorithm server-side once, fixes all three call sites. No Nepali-date gem is in `backend/Gemfile` (confirmed). |
| 8 | No zero-day integration tests exist for POS, Accounting, CRM, or CMS controllers (`backend/test/integration/` has none for these domains) | — | Money-path changes in phases below must ship with tests, not be verified by hand. |

## 3. Module-by-module gap summary

Full per-file findings are preserved in this session's audit transcripts; the tables below are the actionable subset. "Real" = functional against live Postgres, not mocked. "Mock" = hardcoded frontend state or stub logic with no backend wiring.

### 3.1 PMS (rooms, reservations, front desk, folios, night audit)

Backend reservation/lifecycle/folio services are real, transactional, and audited (`backend/app/services/reservations/{create,lifecycle}.rb`, `backend/app/controllers/api/v1/pms/{folios,frontdesk,checkout,night_audit}_controller.rb`). Room statuses match spec exactly (all 8 required states present in `room.rb`).

**Biggest gap:** `src/app/(admin)/admin/pms/reservations/page.tsx` is a 100%-hardcoded mock array with no `fetch` call at all. Cancel, assign-room, extend-stay, and transfer-room all have working backend endpoints with **zero frontend callers anywhere in the repo**.

Other gaps: no deposit/advance-payment collection before arrival (`advance_paid` hardcoded to 0 at creation), no no-show batch processing, no waitlist model, no group/corporate reservation fields, dated out-of-order/out-of-service periods missing (status-only, no start/end), duplicate checkout logic split across `checkout_controller.rb` and `folios_controller.rb#checkout`, checkout hardcodes `VACANT_DIRTY` bypassing housekeeping task creation, no refund/void/adjustment folio action (only ADD_CHARGE/RECORD_PAYMENT/SETTLE_AND_CHECKOUT exist).

### 3.2 POS (restaurant billing, tables, KOT)

**Thinnest module.** Billing (`pos/billing_controller.rb`) is real (modulo defect #1 above) and correctly posts to the guest folio. Everything else has **no backend model at all**: no `MenuItem`/`MenuCategory`, no `KitchenOrder`/order model. `tables/page.tsx` and `kot/page.tsx` are entirely local `useState` mock data; "Send KOT"/"Dispatch" are `alert()` calls with no network request. No split bills, no void/refund, no cashier shifts, no discount-with-authorization, no sales reports. Outlet switcher is two hardcoded strings instead of reading the real `restaurants` table (which does exist and is seeded with Dhiki Restaurant and the Terrace Lounge).

### 3.3 CRM (guest profiles, stay history, preferences)

Second-most complete module. Guest CRUD, tenancy scoping, and permission checks are real (`backend/app/controllers/api/v1/crm/guests_controller.rb`). Gaps: no duplicate-detection service (only an implicit phone-based upsert), no merge-profiles endpoint, `id_number`/`id_type`/`blacklisted` columns exist in schema but are never read/written by the controller or UI, no complaints/feedback model, loyalty is a single enum string with no points ledger, no corporate-account relationship, no document storage. Audit action is mislabeled (`"UPDATE"` used for both create and update).

### 3.4 Accounting (chart of accounts, journals, reports)

Core double-entry mechanics are real: balanced-entry validation, sequential voucher numbers, decimal (not float) amounts. Structural gaps: no `posted_by`/`approved_by` columns at all, no draft/pending-approval/reversed states (`status` is always `"POSTED"`), no cost centers/departments/property dimension on journal lines (ledger is company-wide, not per-property — a problem the moment a second property exists), no account-group hierarchy, P&L/balance-sheet computed via Ruby-side `sum` (won't scale) with no period/fiscal-year filter, no AR/AP subledgers, no fixed assets/depreciation, no posting-rule/account-mapping abstraction (see cross-cutting defect #6), fake BS conversion (defect #7), `chart_of_accounts` route only supports `index`/`create` (no update/deactivate).

### 3.5 CMS (public pages/offers, media library)

Pages/offers CRUD is real and DB-backed, but: `create` always forces `published: true` (no draft/unpublish/scheduling), only one section type (`hero`) is ever read/written despite a `cms_sections` table implying a general builder, no revision history, SEO fields cover only title/description/OG-image (missing keywords/canonical/locale/separate OG title), no sitemap.xml/robots.txt route. **Media library has zero backend** — `admin/cms/media/page.tsx` is a hardcoded mock array, "Upload" is an `alert()`. No FAQs/testimonials/blog/menus/banners models exist anywhere; testimonials on the public homepage are a hardcoded array. Contact info edited in the admin CMS form has no save handler wired to any API — edits are lost on reload.

## 4. Phased plan

Each phase should close with `npm run backend:test`, `bin/rubocop`, `bin/brakeman --no-pager`, and `npx tsc --noEmit` all clean, plus a `docs/CONVERSATION.md` entry and a `MODULE_MAP.md` status update where a module's status materially changes.

### Phase 0 — Cross-cutting hardening (blocks demoing to a paying customer)
1. **DONE (2026-09-02)** — `billing_controller.rb`: recompute sub/tax/service/grand totals server-side from persisted `MenuItem` + `TaxConfiguration` data; client amounts are no longer read. Required adding a minimal `MenuItem` model/table (pulled forward from Phase 3) since no price authority existed server-side before this.
2. **DONE (2026-09-02)** — Folio-item/folio-update/audit and journal/journal-lines writes wrapped in `ActiveRecord::Base.transaction` in `billing_controller.rb`.
3. **DONE (2026-09-02)** — Idempotency key/check added to room-posting and direct settlement (client-supplied `idempotencyKey`, stored in `source_reference`, enforced by a partial unique index).
4. **DONE (2026-09-02)** — `JournalEntry` blocks edit/delete of `POSTED` entries; cascade-destroy replaced with `restrict_with_exception`. (A `reverse!` method was drafted and then removed after review — untested, no caller, and reversal properly belongs to the Phase 5 approval workflow.)
5. **DONE (2026-09-02)** — `AuditLog` raises on any `update`/`destroy`.
6. **Deferred** — Seed a real `COMPANY_ADMIN`/`OWNER` role distinct from `SUPER_ADMIN`. Blocked on first auditing every controller's inferred permission-module name (`Api::V1::BaseController#inferred_authorization_module` derives from `controller_path`, e.g. CRM's guests controller infers `"GUESTS"` not `"CRM"` — the seeded `SUPER_ADMIN` permissions hash keys don't match this and have never been exercised, since `SUPER_ADMIN` bypasses `authorize!` entirely). Getting this wrong locks the admin user out of working screens, so it needs its own pass before Phase 7.
7. **Open** — Port `src/lib/nepali-calendar.ts` BS-conversion logic server-side (Ruby) as one shared utility; replace the three stub call sites (`night_audit_controller.rb:13,58`, accounting `reports_controller.rb`, and `journals_controller.rb:24` which has the same stub).

### Phase 1 — Posting-rule foundation (prerequisite for PMS/POS revenue work)
1. `PostingRule`/`AccountMapping` model + admin CRUD.
2. Refactor `billing_controller.rb#create_journal!` onto it (remove hard-coded `"1001"`/`"4002"`).
3. Add account-group hierarchy (`parent_account_id`, `is_control_account`) to `account.rb`.

### Phase 2 — PMS frontend wiring (highest value-per-effort item in the whole audit)
1. Replace the mock array in `pms/reservations/page.tsx` with real fetch/search/filter against `GET /api/pms/reservations` (add the missing GET proxy route).
2. Surface cancel, assign-room, extend-stay, transfer-room actions in the UI — backend already works.
3. Add deposit/advance-payment collection endpoint + UI.
4. Add refund/void/adjustment folio actions.
5. Add reservation-advance and room-revenue journal postings via the Phase 1 posting-rule service.
6. Consolidate checkout logic into one service; wire housekeeping task creation into checkout instead of hardcoding `VACANT_DIRTY`.
7. No-show batch processing; dated OOO/OOS periods; departures + in-house-guest views.

### Phase 3 — POS persistence (currently has no backend beyond billing)
1. `MenuCategory`/`MenuItem` (+ variants/modifiers) models and CRUD.
2. `KitchenOrder`/order-item models; real KOT lifecycle replacing the `useState` mocks in `tables/page.tsx`/`kot/page.tsx`.
3. Discount-with-authorization, void/refund, cashier shifts, split bills/tenders.
4. Sales report endpoint; wire the real `restaurants` list into the outlet switcher.

### Phase 4 — CRM depth
1. Duplicate-detection service (normalized phone/email/id-number + fuzzy name) + merge endpoint with permission + audit.
2. Expose `id_number`/`id_type`/`blacklisted`/address fields end to end.
3. Complaints/feedback model; loyalty points ledger; corporate-account relationship.

### Phase 5 — Accounting depth
1. `posted_by`/`approved_by`/approval-status columns; maker-checker posting workflow.
2. Cost center / department / property dimension on journal lines.
3. AR/AP subledgers, customer/supplier statements.
4. Real period/fiscal-year (Shrawan–Ashadh) filtering on reports; move aggregation to SQL.
5. Fixed assets/depreciation.

### Phase 6 — CMS depth
1. Draft/review/publish/unpublish/scheduling states; revision history.
2. Generalize `cms_sections` beyond `hero`; real section-builder UI.
3. Media library backend (ActiveStorage-backed model/controller) wired to the existing admin UI.
4. Full SEO field set; sitemap.xml/robots.txt.
5. FAQs/testimonials/menus models replacing hardcoded arrays; wire contact-info save handler.

### Phase 7 — Super Admin (multi-tenant layer)
Not started. Comes after Phases 0-6 make the Owner portal sellable to Hotel New Era as the reference customer. Will need: cross-company data model already exists (`Company` → `Property` is already tenant-scoped), a company-switcher UI, tenant provisioning/onboarding flow, billing/subscription model for selling to other hotels/restaurants/enterprises, and the full granular role catalogue from §6.2 seeded per company rather than one global `SUPER_ADMIN`.

## 5. Sequencing rationale

Module order follows `docs/architecture/MODULE_MAP.md`'s dependency chain (identity/tenancy → inventory/pricing → reservations/frontdesk/folios → CRM → POS/banquets → accounting → CMS) with two amendments: Phase 0 hardening runs first because it fixes defects in code that's already live, and the posting-rule abstraction (Phase 1) is pulled forward because both PMS revenue postings (Phase 2) and the existing POS journal defect (Phase 0/6) depend on it — without it, every new revenue hook copies the hard-coded-account-code anti-pattern.

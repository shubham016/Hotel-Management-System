# Business Module Map

**Updated:** 2026-10-15. These statuses describe implemented code, not complete production readiness.

Status meanings:

- **Rails-owned:** persistence and business/API logic live in Rails.
- **API-backed UI:** the React page calls the Rails API through the shared frontend API client.
- **Planned:** required by MASTER VIBE but not yet implemented meaningfully.

| Module | Status | Frontend area | Backend destination / current code |
|---|---|---|---|
| Identity and staff portals | Rails-owned, role-scoped UI; administrator-assisted reset requests, SMTP setup still required | Login reset dialog, staff-access pending requests, profile, role-aware admin layout | `api/v1/identity`, `services/access`, staff reset email job/mailer, user/staff links, API sessions |
| Company/property tenancy | Rails-owned | Admin settings | `models/company`, `models/property`, `api/v1/base_controller` |
| Rooms and room types | Rails-owned | Admin PMS rooms, public rooms | `api/v1/hotel`, `api/v1/pms/rooms`, room models |
| Availability and room pricing | Rails-owned | Public booking | `services/availability`, `services/pricing` |
| Reservations | Rails-owned | Public booking, admin reservations | `api/v1/pms`, `services/reservations/create`, `services/reservations/lifecycle` |
| Folios | Rails-owned, API-backed UI | Admin PMS folio | `api/v1/folio`, Rails folio/payment models |
| Front desk/check-in/out | Rails-owned, API-backed UI; atomic multi-room check-in and shared guarded checkout | Admin PMS front desk and reservation room assignment | `api/v1/frontdesk`, `api/v1/checkout`, reservation check-in/extend/transfer actions |
| Guest CRM | Rails-owned, API-backed UI | Admin CRM | `api/v1/crm/guests` |
| Housekeeping | Rails-owned, API-backed UI | Admin housekeeping | `api/v1/housekeeping/tasks` |
| POS and KOT | Persisted table/ticket workflow and API-backed UI | Restaurant tables/billing and Kitchen workspace | `api/v1/pos/*`, `models/kitchen_order`; saved prices, status transitions, settlement |
| Banquets and events | Rails-owned, API-backed UI | Public/admin banquet | `api/v1/banquet/bookings` |
| Inventory and stores | Partial Rails/API UI; stock-issue validation and locking need fixes | Admin inventory | `api/v1/inventory/items` |
| Procurement | Partial order creation; receipt/approval/payment lifecycle pending | Admin procurement | `api/v1/procurement/orders` |
| Accounting | Rails/API UI present; report filtering/balance calculations need fixes | Admin accounting | `api/v1/accounting/*` |
| CMS and media | Rails-owned pages/offers/media/guest feedback | Admin CMS, public pages | `api/v1/cms/*`, Active Storage, testimonials |
| Audit log | Rails-owned, API-backed UI | Admin audit logs | `api/v1/audit_logs` |
| Reports and dashboards | Live dashboard; financial reports partial; property business-date rollover, shared guest/POS cashier reconciliation, immutable closing reports | Admin dashboard/reports/night audit | Dashboard/reporting controllers, `services/business_days`, overdue-stay service, cashier/day closing models |
| Notifications and integrations | In-app notifications live; email and channel integration pending | Cross-module | Notification APIs and reservation/housekeeping notification services |

## Dependency Order

Migrate modules in this order to avoid duplicating business rules:

```text
Identity + tenancy
        |
Hotel inventory + pricing
        |
Reservations + front desk + folios
        |
CRM + housekeeping
        |
POS + banquets
        |
Inventory + procurement
        |
Accounting + reporting
        |
CMS, notifications, and external integrations
```

`src/lib/api-client.ts` maps frontend `/api/...` requests through Vite `/rails-api` to Rails `/api/v1/...`. The old Next.js `src/app/api` bridge is removed. New backend behavior belongs under `backend/`.

## Staff Access and Booking Notes (2026-10-07)

- OWNER and ADMIN have full hotel access within assigned properties. ADMIN is the All-rounder; existing admin-email account remains OWNER.
- Front Desk, Housekeeping/Cleaning, Restaurant, and Kitchen Cook/Helper have scoped workspaces. Helpers/cleaners may use department portals; no Dishwasher-specific portal is needed currently.
- Owner/Admin provision actual employee accounts at `/admin/staff-access`; Staff Directory records alone are not login accounts. Sign-in email is the login ID. Refund payout and booking deletion are restricted to Owner/Admin by default.
- Booking/payment receipts, manual advances, cancellation refund liabilities, dashboard reservation search and pagination are implemented. Public live wallets still need valid live credentials and HTTPS return URLs; refunds are manually paid and then recorded.
- See [`../../PROJECT_HANDOFF.md`](../../PROJECT_HANDOFF.md) and [`../CONVERSATION.md`](../CONVERSATION.md) for verified behavior, limitations and next work. Inventory/accounting fixes were deferred when the user selected staff portals.

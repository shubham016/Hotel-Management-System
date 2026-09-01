# Business Module Map

Status meanings:

- **Rails-owned:** persistence and business/API logic live in Rails.
- **Proxy-only:** the Next.js route exists only to preserve the old frontend URL while forwarding to Rails.
- **Planned:** required by MASTER VIBE but not yet implemented meaningfully.

| Module | Status | Frontend area | Backend destination / current code |
|---|---|---|---|
| Identity and authentication | Rails-owned, proxy-only login bridge | `(auth)/login` | `api/v1/identity`, `api_sessions`, `password_reset_tokens`, `services/authentication` |
| Company/property tenancy | Rails-owned | Admin settings | `models/company`, `models/property`, `api/v1/base_controller` |
| Rooms and room types | Rails-owned | Admin PMS rooms, public rooms | `api/v1/hotel`, `api/v1/pms/rooms`, room models |
| Availability and room pricing | Rails-owned | Public booking | `services/availability`, `services/pricing` |
| Reservations | Rails-owned | Public booking, admin reservations | `api/v1/pms`, `services/reservations/create`, `services/reservations/lifecycle` |
| Folios | Rails-owned, proxy-only UI bridge | Admin PMS folio | `api/v1/folio`, Rails folio/payment models |
| Front desk/check-in/out | Rails-owned, proxy-only UI bridge | Admin PMS front desk | `api/v1/frontdesk`, `api/v1/checkout`, reservation check-in/extend/transfer actions |
| Guest CRM | Rails-owned, proxy-only UI bridge | Admin CRM | `api/v1/crm/guests` |
| Housekeeping | Rails-owned, proxy-only UI bridge | Admin housekeeping | `api/v1/housekeeping/tasks` |
| POS and KOT | Rails-owned, proxy-only UI bridge | Admin POS | `api/v1/pos/*` |
| Banquets and events | Rails-owned, proxy-only UI bridge | Public/admin banquet | `api/v1/banquet/bookings` |
| Inventory and stores | Rails-owned, proxy-only UI bridge | Admin inventory | `api/v1/inventory/items` |
| Procurement | Rails-owned, proxy-only UI bridge | Admin procurement | `api/v1/procurement/orders` |
| Accounting | Rails-owned, proxy-only UI bridge | Admin accounting | `api/v1/accounting/*` |
| CMS and media | Rails-owned for pages/offers, media planned | Admin CMS, public pages | `api/v1/cms/pages`, `api/v1/cms/offers` |
| Audit log | Rails-owned, proxy-only UI bridge | Admin audit logs | `api/v1/audit_logs` |
| Reports and dashboards | Planned/legacy UI | Admin dashboard/reports | Rails reporting services/jobs to be designed |
| Notifications and integrations | Planned | Cross-module | Rails jobs/mailers and provider adapters |

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

`src/app/api` remains only as a compatibility bridge for existing frontend fetch URLs. New backend behavior must be added under `backend/`.

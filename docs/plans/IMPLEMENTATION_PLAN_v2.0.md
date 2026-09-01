# System Architecture & Implementation Plan: Hotel New Era Platform
**Version:** 2.0.0
**Date:** 2026-08-22
**Status:** In Review / Ready for Execution

---

## Executive Summary & Objective

With the public guest-facing website and brand assets (43 saleable rooms, 2 restaurants, 3 conference halls, 1 central kitchen, HD logo, and dual calendar) successfully built and verified, **Version 2.0.0** shifts focus to transforming all 11 administrative modules in the Admin Portal into **fully functional, interactive, and database-persisted enterprise workflows** backed by Next.js REST API route handlers, PostgreSQL relational integrity, and Prisma ORM.

---

## 1. Unified API Architecture & Database Mapping

Every administrative module connects directly to Prisma models via standardized JSON endpoints:

```
[Admin UI Page]
       │
       ▼ (fetch / mutate)
[/api/* Route Handler]
       │
       ▼ (Prisma Client with Transaction Isolation)
[PostgreSQL Database: hotel_new_era_db]
```

### Module Endpoints:
1. **PMS Core**:
   - `/api/pms/rooms` (GET room matrix, PATCH status update)
   - `/api/pms/reservations` (GET list, POST new walk-in / booking)
   - `/api/pms/frontdesk` (GET in-house folios & arrivals, POST guest check-in)
   - `/api/pms/folio` (POST add charge, record payment, settle & checkout)
   - `/api/pms/night-audit` (POST batch post room rates, advance business date, create GL journals)
2. **POS & Dining**:
   - `/api/pos/tables` (GET tables by outlet with active KOTs, POST take order)
   - `/api/pos/kot` (GET active central kitchen orders, PATCH status)
   - `/api/pos/billing` (POST settle direct or post to In-House Room Folio)
3. **Banquets & Events**:
   - `/api/banquet/bookings` (GET calendar bookings, POST create hall reservation)
4. **Housekeeping**:
   - `/api/housekeeping/tasks` (GET tasks by floor, POST assign & complete cleaning)
5. **Inventory & Stores**:
   - `/api/inventory/items` (GET stock list & low alerts, POST department issue)
6. **Procurement**:
   - `/api/procurement/orders` (GET PO list, POST create PO, approve, receive GRN)
7. **CRM & Loyalty**:
   - `/api/crm/guests` (GET guest directory, POST create/update profile & VIP tier)
8. **General Ledger & Accounting**:
   - `/api/accounting/chart-of-accounts` (GET COA tree, POST new account)
   - `/api/accounting/journals` (GET vouchers, POST balanced debit/credit entry)
   - `/api/accounting/reports` (GET live P&L, Balance Sheet, Trial Balance)
9. **CMS, Audit & Settings**:
   - `/api/cms/pages` (GET/POST page text & SEO)
   - `/api/settings/property` (GET/POST property profile & tax configs)
   - `/api/audit-logs` (GET activity log entries)

---

## 2. Four-Phase Execution Strategy

- **Phase 1: PMS Core Operations** (Live 43-room status matrix, walk-in reservations, check-in, folio charges, payments, checkouts, and automatic night audit).
- **Phase 2: Dining & POS Outlets** (Dhiki Restaurant and Terrace Lounge table management, KOT kitchen routing, room folio charging, billing settlement).
- **Phase 3: Banquets, Housekeeping & Materials** (Nilkantha/Tulki Devi/Devakala booking scheduler, housekeeping task assignments, inventory stock issues, procurement PO/GRN 3-way matching).
- **Phase 4: CRM, Financial ERP & System Control** (Guest loyalty database, chart of accounts, multi-line journal vouchers, real-time dynamic P&L/Balance Sheet/Trial Balance, audit trails).

---

## 3. Verification & Compliance Criteria
- All CRUD operations persist to PostgreSQL (`hotel_new_era_db`).
- Dual calendar inheritance (Gregorian AD and Nepali Bikram Sambat BS) strictly maintained across all timestamps, booking dates, and accounting periods.
- 0 lint errors, full TypeScript type safety, and `npm run build` compilation passing cleanly.

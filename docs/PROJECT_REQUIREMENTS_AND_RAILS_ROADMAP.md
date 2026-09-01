# Hotel New Era Platform

## Consolidated Requirements, Current-State Audit, Rails Architecture, and Delivery Roadmap

**Document version:** 1.0  
**Prepared:** 2026-08-31  
**Primary requirements source:** `MASTER VIBE.pdf`  
**Current frontend:** Next.js 14, React, and TypeScript  
**Target backend:** Ruby on Rails JSON API  
**Database:** PostgreSQL

**Current status update, 2026-09-01:** Rails now owns the active backend API surface for PMS, CMS, CRM, housekeeping, inventory, POS, procurement, banquet, accounting, contact inquiries, audit logs, authentication, availability, reservations, folios, payments, and document numbering. The `src/app/api` files are compatibility proxies only. Prisma source files and frontend package dependencies have been removed from the active stack.

---

## 1. Purpose of This Document

This document is the single source of truth for the Hotel New Era software project. It consolidates:

- The complete intent of the 44-page MASTER VIBE requirements document.
- The functionality currently present in the repository.
- Important security, architectural, and workflow gaps.
- The decision to use Ruby on Rails for the backend.
- The target production architecture.
- Required database and API changes.
- A phased implementation and migration roadmap.
- Testing, security, deployment, and acceptance requirements.

The product must not be treated as only a hotel website. The final system is an integrated hotel-management platform containing a public website, CMS, PMS, POS, banquet management, CRM, inventory, procurement, accounting, reporting, and system administration.

The first deployment is for Hotel New Era, but the design must support future conversion into a multi-company and multi-property SaaS platform.

---

## 2. Product Vision

The final product should feel like one coherent platform combining:

- Premium hotel website.
- Hotel CMS.
- Property Management System (PMS).
- Reservation and front-desk operations.
- Guest CRM.
- Housekeeping and maintenance operations.
- Restaurant POS and kitchen order management.
- Banquet, conference, and event management.
- Inventory and stores.
- Procurement and supplier management.
- Accounting ERP.
- Financial and operational reporting.
- Management dashboards.
- Role-based administration and audit controls.

The public website, CMS, operational modules, and accounting system must use one authoritative backend and database architecture.

```text
Public Website and Admin Application
                 |
                 v
          Ruby on Rails API
                 |
                 v
       Hotel Domain Services Layer
                 |
                 v
 PMS / POS / CRM / Inventory / Accounting / CMS
                 |
                 v
             PostgreSQL
```

---

## 3. Confirmed Technology Direction

### 3.1 Frontend

Retain the existing frontend and continue developing it with:

- Next.js.
- React.
- TypeScript.
- Responsive component-based UI.
- Server rendering where it materially benefits SEO or performance.
- Optimized images and lazy-loaded content.

The frontend must become a consumer of the Rails API. Critical hotel and accounting logic must not be implemented in React components.

### 3.2 Backend

Build the production backend using Ruby on Rails as a JSON API.

Rails is suitable for this product because it provides a strong relational model, mature transaction support, database migrations, validations, background jobs, file storage integration, and maintainable conventions for a workflow-heavy business system.

The backend should use:

- Rails API controllers for HTTP transport.
- Service objects for business workflows.
- Active Record models for persistence and domain relationships.
- PostgreSQL constraints for critical integrity rules.
- Active Job for asynchronous notifications, exports, and integrations.
- Active Storage for CMS and document uploads.
- Versioned database migrations.
- Request, model, policy, service, and system tests.
- OpenAPI documentation for the frontend/backend contract.

Use the current stable and supported Ruby, Rails, PostgreSQL, and Node versions selected at implementation time. Pin all runtime versions in the repository and deployment environment.

### 3.3 Database Authority

Rails migrations must become the authoritative database schema.

The existing Prisma schema is useful as a domain-design reference, but Prisma and Rails must not independently manage the production schema. During migration:

1. Convert and improve the Prisma model design into Rails migrations.
2. Verify constraints, indexes, foreign keys, tenant keys, and decimal precision.
3. Migrate or reseed approved data.
4. Switch each frontend domain to its Rails endpoints.
5. Remove the corresponding Next.js API routes and Prisma dependency after verification.

---

## 4. Current Repository Status

### 4.1 Implemented Assets

The repository currently contains:

- A working Next.js 14 and TypeScript application.
- Eight guest-facing routes:
  - Home.
  - About.
  - Rooms.
  - Dining.
  - Banquet.
  - Offers.
  - Contact.
  - Booking.
- Nineteen admin pages.
- Twenty-one Next.js API route files.
- Forty-two Prisma models.
- A seed script with Hotel New Era demonstration data.
- Shared UI components and the orange/gold/green design language.
- Basic CSV, Excel, and PDF export utilities.
- Initial Bikram Sambat display support.
- Initial audit-log and accounting service code.

### 4.2 Existing Functional Areas

The current prototype includes partial implementations of:

- Login and session-cookie creation.
- Room status listing and updates.
- Website reservation submission.
- Guest lookup and basic duplicate detection.
- Front-desk arrivals and check-in.
- Guest folio charges and payments.
- Checkout and journal creation.
- Night audit.
- POS table display and billing.
- Posting restaurant bills to room folios.
- Banquet booking.
- Guest CRM listing and creation.
- Housekeeping room-status updates.
- Inventory listing and department issues.
- Purchase-order creation.
- Chart of accounts.
- Manual journal entry.
- Basic accounting reports.
- CMS page headings and promotional offers.
- Contact inquiries and in-app notifications.
- Audit-log listing.

### 4.3 Verification Results

- The Next.js production build completes and generates a build ID.
- The Prisma schema validates successfully.
- No automated test suite is present.
- No Prisma migration history is present.
- PostgreSQL is configured at `localhost:5432`, but it was not running or reachable during the audit.
- The project directory was not a Git repository during the audit.

### 4.4 Approximate Completion Assessment

These figures describe requirement coverage, not code quantity:

| Area | Approximate status | Notes |
|---|---:|---|
| Public website and presentation | 65% | Good visual foundation; many sections remain hard-coded or missing. |
| Admin screens | 55% | Broad screen coverage, but several screens are prototypes. |
| Conceptual data model | 60% | Major domains represented; many entities and constraints are missing. |
| Operational workflows | 30% | Basic happy paths exist; lifecycle, validation, and edge cases are incomplete. |
| Accounting functionality | 20-25% | Initial journal and report logic only. |
| Production backend and security | 15-20% | Requires replacement with Rails architecture. |
| Automated verification | 0-5% | Build verification only; no test suite. |
| Overall MASTER VIBE scope | 30-35% | Best classified as a functional prototype. |

---

## 5. Critical Findings That Must Be Corrected

### 5.1 Authentication and Authorization

The current login implementation is not safe for production:

- An email not found in the database receives a demonstration super-administrator session.
- `Admin@123` can bypass a stored password mismatch.
- A fallback JWT secret is present in source code.
- The admin layout has no server-side authentication guard.
- Most API routes do not verify the session.
- Granular role permissions are defined conceptually but not enforced at endpoint level.

Required changes:

- Remove every demonstration authentication bypass.
- Require a strong environment-provided secret or use secure Rails session authentication.
- Use secure, HTTP-only, SameSite cookies when using browser sessions.
- Add session expiration, logout, revocation, and optional 2FA architecture.
- Apply authorization policies to every protected controller action.
- Deny access by default.
- Record authentication and high-value authorization events.
- Prevent inactive users and inactive tenants from authenticating.

### 5.2 Tenant and Property Isolation

Most current APIs select the first property in the database. This is incompatible with a multi-hotel system and can expose one tenant's data to another.

Required changes:

- Derive company and permitted properties from the authenticated user.
- Never use an unscoped `first` property as business context.
- Scope every tenant-owned query by `company_id` and, where applicable, `property_id`.
- Add composite unique constraints that include tenant identifiers.
- Add authorization checks when switching properties.
- Include tenant-isolation tests for every major domain.
- Consider PostgreSQL Row Level Security later as defense in depth; application-level scoping remains mandatory.

### 5.3 Validation and Error Handling

Current APIs largely deserialize arbitrary JSON and rely on TypeScript casts or Prisma failures.

Required changes:

- Validate required fields, formats, ranges, enums, and relationships on the server.
- Return consistent error envelopes and HTTP status codes.
- Never return raw database or stack errors to end users.
- Handle duplicates, conflicts, stale updates, permission failures, and invalid state transitions explicitly.
- Use idempotency keys for payment and other retried financial operations.

### 5.4 Transactions and Data Integrity

Reservation, check-in, checkout, billing, night audit, and accounting processes currently execute multiple writes without a single enclosing transaction.

Required changes:

- Use database transactions for workflows that must succeed or fail atomically.
- Lock or otherwise protect inventory, room, hall, folio, and document-sequence records during critical updates.
- Add foreign keys, unique constraints, check constraints, and appropriate indexes.
- Use decimal monetary types; never use floating-point values for accounting.
- Prevent posted financial records from being silently edited or deleted.
- Use reversals or adjustment documents rather than destructive accounting edits.

### 5.5 Pricing and Tax Integrity

The current booking frontend sends totals to the server, and several areas hard-code 10% service charge and 13% VAT.

Required changes:

- The backend must independently calculate rates, nights, packages, promotions, taxes, service charges, and totals.
- Treat frontend totals only as a display estimate.
- Store effective-dated tax rules and posting configuration.
- Support inclusive and exclusive taxes, exemptions, and taxable categories.
- Record the rate and tax rule used on each completed transaction.
- Preserve historical amounts if tax configuration later changes.

### 5.6 Demonstration and Fallback Behavior

Production routes currently include fallback CMS data, sample offers, optimistic checkout success, and development login behavior.

Required changes:

- Keep demonstration data only in explicit development/test seeds.
- Never report success for a missing production record.
- Return professional empty states when CMS or transactional records do not exist.
- Prevent demo financial transactions from entering production accounting data.

---

## 6. Complete Functional Requirements

## 6.1 Company, Property, and Core Administration

The platform must support the hierarchy:

```text
Company
  -> Properties / Hotels
      -> Branches
      -> Departments
      -> Cost Centers
      -> Stores
      -> Restaurants
      -> Banquet Halls
      -> Users and Transactions
```

Required functions:

- Company creation and configuration.
- Multiple properties per company.
- Branch and department management.
- Currency, timezone, fiscal year, date format, and language settings.
- Property-specific check-in and checkout times.
- Property selection for authorized users.
- Tenant-aware document numbering.
- Configurable application settings.
- First-installation setup wizard.
- Soft deletion or archival where legally and operationally appropriate.

## 6.2 User Management and RBAC

Required roles include, but are not limited to:

- Super Administrator.
- Company Administrator.
- General Manager.
- Front Office Manager.
- Front Desk User.
- Reservation User.
- Accountant.
- Finance Manager.
- Cashier.
- Restaurant Manager.
- Restaurant Cashier.
- Housekeeping Manager.
- Housekeeper.
- Store Manager.
- Purchase Officer.
- HR Manager.
- Event Manager.
- Auditor.
- Report Viewer.

Permissions must be granular by module and action, including view, create, update, cancel, delete, submit, approve, post, publish, export, and administer.

Required supporting features:

- User-property assignments.
- Role and permission administration.
- Account activation/deactivation.
- Password reset.
- Session management.
- Optional 2FA.
- Login history.
- Access-denied screens and API responses.

## 6.3 Public Website

Required CMS-driven pages and content include:

- Home.
- About Us.
- Rooms.
- Room Details.
- Dining.
- Restaurants.
- Facilities.
- Events.
- Banquets.
- Conference.
- Gallery.
- Offers.
- Packages.
- Experiences.
- Blog and News.
- Contact.
- Location.
- Privacy Policy.
- Terms and Conditions.
- Booking Terms.
- Cancellation Policy.
- Careers.
- Additional administrator-created pages.

The homepage must support configurable:

- Hero image, text, and calls to action.
- Booking widget.
- Introduction.
- Rooms.
- Offers.
- Dining.
- Facilities.
- Banquets and events.
- Gallery.
- Experiences.
- About section.
- Location.
- Testimonials.
- News/blog.
- Contact section.
- Footer.
- Section order and enabled/disabled state.

No hotel-specific public content should remain embedded in reusable frontend components when it can be stored in the CMS.

## 6.4 CMS and Media

The CMS must provide:

- Pages and reusable page sections.
- Homepage section builder.
- Menus and navigation.
- Banners.
- Images and videos.
- Galleries.
- Blog and news.
- Testimonials.
- Offers and packages.
- FAQs.
- Draft, review, publish, unpublish, and scheduling states.
- Content revision history.
- Page preview.
- SEO fields.
- Sitemap generation.

Every page should support:

- SEO title.
- Meta description.
- Keywords.
- Canonical URL.
- Open Graph fields.
- Social-sharing image.
- URL slug.
- Locale.

The media library must support:

- Single and multiple uploads.
- Image preview.
- Categories and folders where useful.
- Search and tags.
- Alt text.
- File metadata.
- Replacement and deletion policies.
- Reuse of existing files.
- Duplicate prevention where practical.
- Secure upload validation.
- Configurable local or object-storage backend.

## 6.5 Booking Engine and Rate Management

Guests must be able to search using:

- Check-in date.
- Check-out date.
- Adults.
- Children.
- Number of rooms.
- Room type.
- Promotion or package code.

Search results must display:

- Real availability.
- Occupancy limits.
- Room type and features.
- Rate plan.
- Taxes and service charges.
- Discounts.
- Packages.
- Total amount.
- Cancellation and payment terms.

The booking journey must support:

- Room selection.
- Multiple rooms.
- Guest details.
- Add-on services.
- Booking review.
- Payment or pay-at-hotel policy.
- Confirmation number.
- Notification delivery.
- Automatic PMS reservation creation.

Availability must prevent overlapping allocation beyond sellable inventory. Concurrency tests must prove that the same final room inventory cannot be sold twice.

## 6.6 PMS and Reservations

Reservation features:

- New reservation.
- Modify reservation.
- Cancel reservation.
- Group reservation.
- Corporate reservation.
- Walk-in reservation.
- Online reservation.
- OTA reservation.
- Reservation source tracking.
- Rate plans and packages.
- Deposits and advance payments.
- Cancellation policies and fees.
- No-show processing.
- Waitlist.
- Confirmation and modification notifications.
- Reservation notes and documents.

Front-desk features:

- Today's arrivals and departures.
- Check-in.
- In-house guests.
- Room assignment.
- Room transfer.
- Early check-in.
- Late checkout.
- Guest folio.
- Additional charges.
- Payments, refunds, and adjustments.
- Checkout.
- Guest history.

Room-management features:

- Room types.
- Individual rooms.
- Floors.
- Amenities and features.
- Occupancy limits.
- Maintenance state.
- Out-of-order and out-of-service periods.
- Housekeeping state.
- Sellable inventory.

Required room statuses include:

- Vacant Clean.
- Vacant Dirty.
- Occupied.
- Reserved.
- Due Out.
- Out of Order.
- Out of Service.
- Inspection Required.

## 6.7 Guest CRM

Guest profiles must include:

- Name and contact details.
- Address, country, and nationality.
- Identity/passport data where legally permitted.
- Secure guest-document storage.
- Preferences.
- Stay and spending history.
- Complaints and feedback.
- Loyalty data.
- Corporate relationships.
- Internal notes.
- VIP and blacklist states.

The system should detect likely duplicates using normalized phone, email, identity number, and carefully selected name matching. Merging profiles must be permission-controlled and audited.

## 6.8 Housekeeping and Maintenance

Required features:

- Daily room-status dashboard.
- Cleaning tasks and assignments.
- Housekeeper assignment.
- Cleaning checklists.
- Supervisor inspection.
- Room discrepancies.
- Maintenance requests.
- Lost and found.
- Linen tracking.
- Housekeeping supplies.
- Task priorities and due times.
- Assignment and completion notifications.

Housekeeping status changes must coordinate safely with PMS room availability.

## 6.9 Restaurant and POS

Required capabilities:

- Multiple restaurants and outlets.
- Tables and table status.
- Menu categories and items.
- Item variants and modifiers.
- Kitchen orders and KOT printing/routing.
- Order status workflow.
- Billing.
- Discounts with authorization.
- Taxes and service charges.
- Multiple payment methods.
- Split bills and split tenders.
- Guest room posting.
- Void and refund controls.
- Cashier shifts and closing.
- Restaurant sales reports.

A room-posted restaurant bill must appear on the guest's hotel folio and later flow into checkout and accounting.

## 6.10 Banquet, Conference, and Events

Required capabilities:

- Hall master and capacities.
- Hall layouts/configurations.
- Event calendar.
- Availability search.
- Double-booking prevention.
- Event inquiry and booking.
- Corporate events.
- Weddings.
- Conferences, seminars, and meetings.
- Event and menu packages.
- Decoration, equipment, AV, and catering items.
- Quotation and revision workflow.
- Contract documents.
- Advance payments.
- Event folio and final billing.
- Accounting integration.

## 6.11 Inventory and Stores

Required capabilities:

- Item and category master.
- Units of measure and conversions where needed.
- Multiple stores/warehouses.
- Opening stock.
- Stock receipts.
- Purchase returns.
- Store transfers.
- Department issues.
- Consumption and wastage.
- Stock adjustments.
- Physical counts.
- Reorder levels and low-stock notifications.
- Batch/expiry tracking where required.
- Valuation rules and inventory reports.

Supported store types should include:

- Main Store.
- Kitchen Store.
- Bar Store.
- Housekeeping Store.
- Maintenance Store.
- Engineering Store.

## 6.12 Procurement and Suppliers

Required capabilities:

- Supplier master.
- Supplier tax and payment information.
- Purchase requisition.
- Requisition approval.
- Request for quotation where adopted.
- Purchase order.
- Purchase-order approval.
- Goods receipt note.
- Quality/quantity acceptance.
- Purchase invoice.
- Three-way matching of PO, receipt, and invoice.
- Purchase return.
- Supplier payment.
- Supplier statement and ageing.
- Inventory and accounting integration.

## 6.13 Accounting and Finance

Accounting is a core system, not an isolated reporting feature.

Required accounting modules:

- Configurable chart of accounts.
- Account groups, subgroups, and control accounts.
- General ledger.
- Journal vouchers.
- Sales, purchase, receipt, payment, and contra vouchers.
- Accounts receivable.
- Accounts payable.
- Cash and bank management.
- Customer and supplier statements.
- Cost centers.
- Departments and optional project dimensions.
- Tax configuration and reporting.
- Fixed assets and depreciation.
- Period and fiscal-year controls.
- Financial close controls.
- Reversals and adjusting entries.
- Posting approvals.

Every journal must contain:

- Unique voucher number.
- Voucher type.
- Posting date and business date.
- Narration.
- Source module and source reference.
- User and approval information.
- Balanced debit and credit lines.
- Optional department, property, and cost center dimensions.

Operational posting examples:

```text
Reservation advance
  Dr Cash / Bank
  Cr Guest Advance

Room revenue
  Dr Guest Receivable / Cash
  Cr Room Revenue
  Cr Tax and Service Charge Payables

Restaurant sale
  Dr Cash / Bank / Guest Receivable
  Cr Food Revenue
  Cr Beverage Revenue
  Cr Tax and Service Charge Payables

Purchase invoice
  Dr Inventory / Expense
  Dr Recoverable Input Tax
  Cr Supplier Payable

Supplier payment
  Dr Supplier Payable
  Cr Cash / Bank
```

Posting rules and account mappings must be configurable rather than hard-coded in service code.

## 6.14 Tax Engine

The tax engine must support:

- Tax types and effective-dated rates.
- Inclusive and exclusive calculation.
- Taxable products and services.
- Exemptions.
- Input and output taxes.
- Compound taxes where applicable.
- Tax periods.
- Tax reports.
- Property/company applicability.
- Configurable rounding policy.

Historical documents must retain their original tax calculation snapshot.

## 6.15 Night Audit

The night-audit workflow must verify:

- Expected and completed arrivals.
- Departures.
- No-shows.
- Room charges.
- Restaurant and other folio charges.
- Taxes and discounts.
- Payments and refunds.
- Guest balances.
- Cashier balances.
- Out-of-balance or incomplete transactions.

Only authorized users may close a business day. The workflow must be transactional, repeat-safe, fully audited, and must not post the same daily charges twice.

## 6.16 Reporting and Dashboards

Financial reports:

- Trial Balance.
- General Ledger.
- Cash Book.
- Bank Book.
- Profit and Loss.
- Balance Sheet.
- Cash Flow Statement.
- Accounts Receivable.
- Accounts Payable.
- Supplier Statement.
- Customer Statement.
- Revenue Report.
- Expense Report.
- Tax Report.
- Department-wise P&L.
- Cost-center reports.
- Daily Revenue Report.
- Night Audit Report.

Operational dashboards and reports:

- Occupancy.
- ADR.
- RevPAR.
- Room, restaurant, and total revenue.
- Arrivals, departures, and in-house guests.
- Available, dirty, and out-of-service rooms.
- Pending payments and receivables.
- Payables.
- Restaurant sales.
- Inventory shortages.
- Housekeeping status.
- Maintenance issues.

Reports must support relevant filters, pagination, totals, print, and export to PDF, Excel, and CSV. Exported reports should show property, report title, date range, filters, generated-by user, generated time, data, totals, and footer.

## 6.17 Notifications and Integrations

Notification events should include:

- Reservation confirmation and modification.
- Cancellation.
- Payment.
- Check-in and checkout.
- Low stock.
- Approval requests.
- Maintenance requests.
- System alerts.

Supported delivery architecture:

- In-app.
- Email.
- SMS.
- WhatsApp.

Future integration interfaces should support:

- Payment gateways.
- OTA and channel managers.
- SMS and email providers.
- WhatsApp providers.
- E-invoicing and tax systems.
- Maps and analytics.
- Biometric attendance.
- POS hardware and printers.
- External accounting systems.

Do not implement fake integrations. Use provider interfaces, delivery logs, retry handling, and secure credentials.

## 6.18 Localization and Calendars

The architecture must be ready for:

- English.
- Nepali.
- Additional languages later.

CMS and other translatable content must use locale-aware structures rather than hard-coded English fields alone.

PostgreSQL should store standardized Gregorian dates and UTC timestamps as appropriate. Bikram Sambat should be calculated or stored as a display/reference value without replacing the authoritative Gregorian date used for business calculations.

---

## 7. Required Data-Model Changes

The existing Prisma schema covers many core entities but needs expansion and stronger normalization before conversion to Rails.

Important additions or revisions include:

- User-property assignments.
- User sessions, refresh/revocation records, and login events where required.
- Role permissions with explicit actions.
- Approval workflow definitions, steps, instances, and actions.
- Document sequences scoped by tenant, property, year, and document type.
- Guest documents, preferences, complaints, feedback, loyalty, and company relationships.
- Room amenities/features as normalized reusable records where querying is required.
- Room status history and room out-of-service periods.
- Rate seasons, daily rates, occupancy rules, packages, promotions, and restrictions.
- Reservation status history, rooms, guests, services, deposits, cancellations, and source details.
- Payment method configuration, payment attempts, refunds, and gateway events.
- Housekeeping checklists, assignments, inspections, discrepancies, linen, lost-and-found, and maintenance requests.
- POS modifiers, order payments, discounts, voids, shifts, printer routing, and cashier closing.
- Banquet quotations, revisions, contracts, resources, packages, schedules, and folios.
- Inventory categories, units/conversions, batches, physical counts, transfers, requisitions, and valuation records.
- Purchase requisitions, receipts, invoices, returns, and supplier payments.
- Accounting periods, bank accounts, posting rules, receivable/payable documents, allocations, and fixed-asset depreciation.
- Tax rule applicability, effective dates, calculation components, and transaction snapshots.
- CMS menus, localized content, revisions, publishing workflow, blog/news, FAQs, galleries, and SEO data.
- Media variants and attachment relationships.
- Notification deliveries, templates, provider configuration, and retry logs.
- Integration credentials and webhook-event tracking.

Every tenant-owned table should include an explicit company or safely derivable tenant relationship. High-volume tables need indexes matching their real query patterns.

---

## 8. Rails Application Structure

A practical initial structure is:

```text
backend/
  app/
    controllers/
      api/
        v1/
          auth/
          companies/
          properties/
          cms/
          rooms/
          rates/
          reservations/
          front_desk/
          guests/
          housekeeping/
          pos/
          banquets/
          inventory/
          procurement/
          accounting/
          reports/
          settings/
    models/
    policies/
    services/
      reservations/
      front_desk/
      folios/
      pos/
      banquets/
      inventory/
      procurement/
      accounting/
      night_audit/
    queries/
    serializers/
    jobs/
    notifications/
    validators/
  config/
  db/
    migrate/
    seeds/
  spec/
    models/
    requests/
    policies/
    services/
    system/
  openapi/
```

Keep controllers thin. Controllers should authenticate, authorize, validate the request contract, invoke a service/query, and serialize the result. Complex workflows belong in services and transactions.

---

## 9. API Standards

Use versioned endpoints such as `/api/v1/...`.

Recommended domain routes:

```text
/api/v1/auth
/api/v1/users
/api/v1/roles
/api/v1/companies
/api/v1/properties
/api/v1/rooms
/api/v1/room_types
/api/v1/rates
/api/v1/availability
/api/v1/reservations
/api/v1/guests
/api/v1/front_desk
/api/v1/folios
/api/v1/housekeeping
/api/v1/pos
/api/v1/banquets
/api/v1/inventory
/api/v1/procurement
/api/v1/accounting
/api/v1/reports
/api/v1/cms
/api/v1/media
/api/v1/notifications
/api/v1/audit_logs
/api/v1/settings
```

API requirements:

- Consistent JSON naming convention.
- Consistent success and error envelopes.
- Server-side validation.
- Authentication and authorization on protected routes.
- Pagination and filtering for collections.
- Sorting with allow-listed fields.
- Optimistic locking or conflict handling where needed.
- Idempotency for payment and critical retried operations.
- Rate limiting for login, booking, contact, and other public endpoints.
- Request IDs and structured logs.
- OpenAPI contract and generated/verified TypeScript types where practical.

---

## 10. Existing Next.js API to Rails Migration Map

| Existing Next.js endpoint | Target Rails area | Migration note |
|---|---|---|
| `/api/auth/login` | `api/v1/auth` | Replace completely; remove all demo bypasses. |
| `/api/pms/rooms` | `api/v1/rooms` | Add tenant scope, policies, status history, and validation. |
| `/api/pms/reservations` | `api/v1/availability` and `api/v1/reservations` | Rebuild pricing, availability, allocation, and transaction handling. |
| `/api/pms/frontdesk` | `api/v1/front_desk` | Split arrivals, check-in, assignment, transfer, and in-house queries. |
| `/api/pms/folio` | `api/v1/folios` | Add immutable line rules, payments, refunds, and recalculation services. |
| `/api/pms/checkout` | `api/v1/front_desk/checkouts` | Atomic lifecycle and accounting transaction. |
| `/api/pms/night-audit` | `api/v1/night_audits` | Add prechecks, authorization, idempotency, and period control. |
| `/api/pos/tables` | `api/v1/pos/tables` | Add outlet and shift scope. |
| `/api/pos/billing` | `api/v1/pos/orders` and `api/v1/pos/bills` | Rebuild KOT, settlement, folio posting, and accounting flow. |
| `/api/banquet/bookings` | `api/v1/banquets/bookings` | Add availability locks, quotation, resources, contract, and folio. |
| `/api/housekeeping/tasks` | `api/v1/housekeeping/tasks` | Add assignment, checklist, inspection, and history. |
| `/api/inventory/items` | `api/v1/inventory/items` and transactions | Separate item queries from authorized stock movements. |
| `/api/procurement/orders` | `api/v1/procurement/purchase_orders` | Add requisition, approval, receipt, invoice, and matching workflow. |
| `/api/crm/guests` | `api/v1/guests` | Add secure documents, deduplication, merge, and history. |
| `/api/accounting/chart-of-accounts` | `api/v1/accounting/accounts` | Add hierarchy and protected control accounts. |
| `/api/accounting/journals` | `api/v1/accounting/journals` | Add workflow, periods, validation, posting, and reversal. |
| `/api/accounting/reports` | `api/v1/reports/financial` | Rebuild from posted ledger entries with filters and exports. |
| `/api/cms/pages` | `api/v1/cms/pages` | Add sections, localization, revision, workflow, and arbitrary pages. |
| `/api/cms/offers` | `api/v1/cms/offers` | Connect offers to promotion/rate rules where applicable. |
| `/api/contact/inquiry` | `api/v1/public/inquiries` | Validate, rate-limit, store inquiry, and dispatch notification. |
| `/api/audit-logs` | `api/v1/audit_logs` | Read-only, permission-controlled, tenant-scoped, and paginated. |

Remove an old endpoint only after its Rails replacement is integrated and verified.

---

## 11. Core Workflow Requirements

### 11.1 Reservation Creation

The backend must atomically:

1. Authenticate or establish the permitted public booking context.
2. Validate dates, occupancy, room count, and guest fields.
3. Resolve the company/property explicitly.
4. Recalculate availability.
5. Resolve effective rate plans, packages, discounts, and taxes.
6. Verify the submitted client quotation has not expired or changed.
7. Create or match the guest without unsafe duplication.
8. Create the reservation and requested room allocations.
9. Create deposits/payments only after verified payment status.
10. Create the folio when required by the chosen lifecycle design.
11. Record audit and notification events.
12. Commit all required records together.

### 11.2 Check-In

The backend must atomically:

1. Validate reservation status and arrival eligibility.
2. Verify guest identity requirements.
3. Verify room assignment and room readiness.
4. Prevent assignment to an occupied, blocked, or incompatible room.
5. Update reservation and room states.
6. Create/open the folio if not already present.
7. Record deposits and opening balances accurately.
8. Record the audit event.

### 11.3 Folio Charge and Payment

The backend must:

- Validate folio state.
- Calculate taxes from configuration.
- Preserve source module and reference.
- Prevent duplicate source posting.
- Support authorized void/reversal rather than silent deletion.
- Verify payment amounts and method requirements.
- Keep totals consistent with folio lines and payments.
- Create accounting entries at the configured event point.

### 11.4 Checkout

The backend must atomically:

1. Validate the in-house reservation and open folio.
2. Post any pending authorized charges.
3. Recalculate the folio from authoritative lines and payments.
4. Require settlement or an approved receivable arrangement.
5. Close the folio and reservation.
6. Mark rooms vacant dirty.
7. Create housekeeping tasks.
8. Generate balanced accounting entries.
9. Record the audit trail.
10. Queue receipt and checkout notifications.

Missing records must return errors; fake or optimistic success is prohibited.

### 11.5 Night Audit

The backend must:

- Run preflight checks.
- Display blocking and warning conditions.
- Require an authorized user and confirmation.
- Lock the business date/process.
- Post charges exactly once.
- Update no-shows and due-outs according to policy.
- Reconcile payments and cashier shifts.
- Generate the daily revenue and audit snapshot.
- Advance the business date only after successful completion.
- Roll back on failure.

---

## 12. Security Requirements

Minimum production controls:

- Strong password hashing.
- Secure session or token design.
- HTTP-only, Secure, SameSite cookies where applicable.
- CSRF protection appropriate to the chosen authentication design.
- Granular policy-based authorization.
- Tenant scoping on all protected data.
- Input validation and output escaping.
- SQL injection protection through parameterized ORM queries.
- XSS controls and content sanitization for CMS content.
- Rate limiting.
- Brute-force protection and login throttling.
- Secure file type, content, and size validation.
- Signed or permission-checked private file access.
- Secret management through environment/deployment configuration.
- Security headers.
- Structured security and audit logs.
- Dependency and vulnerability scanning.
- Backups and restoration testing.
- Least-privilege database and deployment accounts.
- No raw internal exceptions exposed to users.

Audit logs must not be casually editable or deletable. Sensitive data must be masked in logs and exports.

---

## 13. UI and Design Requirements

The visual direction remains:

- Light overall background.
- White cards.
- Orange primary accent.
- Golden/yellow secondary accent.
- Fresh green supporting accent.
- Dark charcoal text.
- Light grey borders.
- Subtle shadows.
- Rounded corners.
- Spacious professional layouts.
- Warm hospitality character combined with enterprise usability.

Starting palette:

| Token | Value |
|---|---|
| Primary Orange | `#F28C00` |
| Deep Orange | `#E87500` |
| Golden | `#F4B400` |
| Light Golden | `#FFF3D6` |
| Green | `#43A047` |
| Light Green | `#EAF6EA` |
| Background | `#F7F8F9` |
| Card | `#FFFFFF` |
| Text | `#263238` |
| Secondary Text | `#6B7280` |
| Border | `#E5E7EB` |

The public website must work on desktop, laptop, tablet, and mobile. The admin application should prioritize desktop productivity while remaining usable on tablets and supporting essential mobile workflows where practical.

Required shared components include buttons, forms, tables, cards, modals, alerts, badges, navigation, pagination, filters, loading states, empty states, permission-denied states, error states, and dashboard metrics.

---

## 14. Testing and Quality Strategy

No phase is complete without proportionate automated verification.

### 14.1 Backend Tests

- Model validations and constraints.
- Policy and tenant-isolation tests.
- Request/API contract tests.
- Service/workflow tests.
- Transaction rollback tests.
- Accounting debit/credit balance tests.
- Availability concurrency tests.
- Duplicate document-number tests.
- Night-audit repeat/idempotency tests.
- Payment idempotency tests.
- Report reconciliation tests.

### 14.2 Frontend Tests

- Component behavior.
- Form validation and server errors.
- Authentication state.
- Permission-aware navigation.
- Public booking journey.
- Front-desk critical journeys.
- Responsive behavior.
- Accessibility checks.

### 14.3 End-to-End Scenarios

- Public search to confirmed reservation.
- Walk-in reservation and check-in.
- Restaurant KOT to room folio to checkout.
- Banquet quotation to advance to final settlement.
- Requisition to PO to receipt to supplier invoice and payment.
- Night audit and daily revenue report.
- Journal approval, posting, reversal, and financial statements.
- Tenant A user denied access to Tenant B records.

### 14.4 Quality Gates

Each phase must pass:

- Code formatting and static analysis.
- Automated tests.
- Database migration checks.
- Security and authorization review.
- Build verification.
- API contract verification.
- Responsive review for affected screens.
- No unresolved critical defects.

---

## 15. Delivery Roadmap

## Phase 0 - Repository and Decision Baseline

Deliverables:

- Initialize and protect the Git repository if not already done.
- Preserve a tagged snapshot of the current prototype.
- Record Ruby, Rails, Node, and PostgreSQL versions.
- Establish development, test, staging, and production environments.
- Approve API authentication and deployment topology.
- Approve initial accounting posting policy and fiscal settings.
- Establish coding, review, and migration conventions.

Exit criteria:

- Reproducible local setup.
- CI pipeline runs frontend and backend checks.
- Secrets are not committed.

## Phase 1 - Rails Foundation, Tenancy, and Security

Deliverables:

- Rails API application.
- PostgreSQL connection and migrations.
- Companies, properties, branches, departments, and settings.
- Secure authentication.
- Users, roles, permissions, and property assignments.
- Policy-based authorization.
- Tenant-scoped request context.
- Audit infrastructure.
- Standard error and serialization format.
- OpenAPI foundation.

Exit criteria:

- No demo login behavior.
- Protected endpoint tests pass.
- Cross-tenant access tests pass.

## Phase 2 - Rooms, Rates, Availability, and Reservations

Deliverables:

- Room types, rooms, features, and room status history.
- Rate plans, daily/effective rates, taxes, packages, and promotions.
- Availability engine.
- Public booking quotation.
- Reservation creation, modification, cancellation, and confirmation.
- Reservation-room allocations.
- Guest creation/deduplication.
- Migration of the Next.js booking UI to Rails APIs.

Exit criteria:

- Server-calculated totals.
- No overbooking under concurrency tests.
- Full public booking flow passes end to end.

## Phase 3 - Front Desk, Folios, Payments, and Night Audit

Deliverables:

- Arrivals, room assignment, and check-in.
- In-house guest management and room transfer.
- Folio items, payments, refunds, and adjustments.
- Checkout workflow.
- Housekeeping task creation after checkout.
- Night audit with preflight and idempotency.
- Initial accounting posting integration.

Exit criteria:

- Check-in and checkout are atomic.
- Folio totals reconcile with lines and payments.
- Night audit cannot double-post.

## Phase 4 - Housekeeping and Maintenance

Deliverables:

- Cleaning tasks and assignments.
- Checklists and inspections.
- Room discrepancies.
- Maintenance requests.
- Lost and found.
- Linen and supply tracking foundations.
- Housekeeping dashboard.

Exit criteria:

- Room readiness/status is consistent between housekeeping and PMS.

## Phase 5 - Restaurant POS

Deliverables:

- Outlets, tables, menus, modifiers, and KOT.
- Kitchen workflow.
- Billing, discounts, taxes, split payments, and voids.
- Room-folio posting.
- Cashier shifts and closing.
- Sales reporting and accounting postings.

Exit criteria:

- A KOT can become a settled bill or a verified room-folio charge.
- POS sales reconcile with cashier and ledger totals.

## Phase 6 - Banquets and Events

Deliverables:

- Hall availability and double-booking protection.
- Inquiries, quotations, revisions, packages, and contracts.
- Resource, menu, decoration, and equipment scheduling.
- Advances, event folios, final billing, and accounting.

Exit criteria:

- End-to-end banquet workflow passes, including conflicts and settlement.

## Phase 7 - Inventory and Procurement

Deliverables:

- Items, units, stores, balances, and stock movements.
- Transfers, issues, wastage, adjustments, and counts.
- Reorder notifications.
- Suppliers and purchase requisitions.
- Approval workflow.
- Purchase orders, GRNs, invoices, returns, and matching.
- Inventory valuation and accounting integration.

Exit criteria:

- Stock movement history reconciles to balances.
- Purchase lifecycle creates correct inventory and payable entries.

## Phase 8 - Accounting ERP

Deliverables:

- Final chart of accounts and configurable posting rules.
- Journals and approval/posting workflow.
- Receivables, payables, cash, and bank.
- Tax engine and tax reports.
- Fixed assets.
- Period controls and closing.
- Financial statements and ledger reports.

Exit criteria:

- Every posted journal balances.
- Operational subledgers reconcile with the general ledger.
- Trial Balance, P&L, and Balance Sheet reconcile for approved test scenarios.

## Phase 9 - Enterprise CMS and Public Website Completion

Deliverables:

- Pages, sections, menus, localized content, media, galleries, blog/news, testimonials, offers, packages, FAQs, and SEO.
- Draft/review/publish workflow and revisions.
- All required public pages.
- Dynamic footer, navigation, contact data, and hotel configuration.
- Sitemap and metadata.

Exit criteria:

- CMS administrators can manage public content without code changes.
- No reusable public page depends on hard-coded Hotel New Era content except explicit safe fallbacks approved for error handling.

## Phase 10 - Reporting, Notifications, Integrations, and Hardening

Deliverables:

- Management and departmental dashboards.
- Complete exportable reports.
- Notification templates and delivery providers.
- Approved payment, email, SMS, WhatsApp, OTA, or other integrations.
- Performance profiling and indexes.
- Security testing.
- Backup and disaster-recovery verification.
- Production monitoring and alerting.

Exit criteria:

- Production-readiness checklist approved.
- Restore test succeeds.
- Critical workflows meet agreed performance and security standards.

---

## 16. Immediate Next Actions

The recommended next implementation sequence is:

1. Preserve the current prototype in version control.
2. Create the Rails API project in a dedicated `backend/` directory.
3. Configure Rails and Next.js to run together locally.
4. Convert company, property, user, role, permission, and audit models first.
5. Implement secure authentication and tenant context.
6. Define the OpenAPI response/error conventions.
7. Convert room types, rooms, rate plans, taxes, and availability.
8. Rebuild reservation creation as the first complete Rails vertical slice.
9. Connect the existing booking frontend to Rails.
10. Verify the end-to-end workflow before migrating front desk and folios.

The first production-quality milestone should be:

```text
Secure login
  -> authenticated company/property context
  -> live room and rate data
  -> real availability search
  -> server-calculated quotation
  -> atomic reservation
  -> guest and room allocation
  -> confirmation and audit event
```

---

## 17. Decisions Requiring Business Confirmation

These decisions should be confirmed before their relevant phases because they materially affect architecture or accounting behavior:

- Whether the initial deployment needs only Hotel New Era or multiple properties immediately.
- Exact room inventory, room types, rate plans, and occupancy policies.
- Reservation deposit, cancellation, no-show, early check-in, and late-checkout policies.
- Whether folios are opened at booking, check-in, or according to reservation type.
- Accepted payment methods and first payment gateway.
- Exact Nepal tax and service-charge rules, effective dates, exemptions, and rounding.
- Accounting recognition timing for room revenue, restaurant sales, advances, and banquet income.
- Required approval thresholds and approval chains.
- Inventory valuation method.
- Fiscal year, accounting periods, and closing rules.
- Required Nepali-language scope for the first release.
- Email, SMS, and WhatsApp providers.
- File-storage and hosting provider.
- Required OTA/channel-manager integrations.
- Data retention, privacy, and guest-document policies.

Development can proceed with documented defaults for reversible choices. Financial, legal, payment, and irreversible migration choices require explicit approval.

---

## 18. Definition of Done

A feature is complete only when:

- Its business behavior is documented.
- The Rails API performs authoritative validation and calculation.
- Authentication, authorization, and tenant scope are enforced.
- Required database constraints and indexes exist.
- Multi-step writes are transactional where necessary.
- Audit events are recorded where required.
- Frontend loading, empty, validation, permission, and failure states work.
- Automated tests cover the main path and important failure paths.
- API documentation is updated.
- Migrations run on a clean database and upgrade an existing supported database.
- Responsive behavior is verified for affected interfaces.
- No demo fallback is presented as production functionality.
- Build and CI checks pass.

---

## 19. Final Assessment

The existing work is valuable and should be retained primarily as:

- A visual design foundation.
- A frontend prototype.
- A domain-discovery artifact.
- A starting database entity inventory.
- A demonstration of intended operational flows.

It should not be deployed as a production hotel or accounting backend in its current form.

The safest path is to preserve the Next.js experience while replacing the Next.js API and Prisma-based prototype backend domain by domain with a secure, tenant-aware, transactional Rails API. The first priority is not adding more screens; it is establishing the Rails foundation and completing one reliable vertical workflow from authentication through availability and reservation creation.

---

## 20. Rails Migration Implementation Status - 2026-08-31

The first Rails migration milestone has now been implemented in the repository.

Completed:

- Installed Ruby 3.4.10 and Rails 8.1.3.1.
- Added an API-only Rails application under `backend/`.
- Added a reproducible Docker/Linux development runtime.
- Added PostgreSQL 17 through Docker Compose.
- Added a versioned initial Rails migration using UUID primary keys, foreign keys, indexes, check constraints, and decimal monetary fields.
- Added company, property, role, user, user-property, tax, room type, room, rate plan, service offering, guest, reservation, reservation room, folio, folio item, document sequence, and audit models.
- Added secure password authentication and time-limited signed JWT access tokens.
- Removed the original Next.js demonstration login bypass and password override.
- Added a Next.js authentication proxy that stores the Rails token in an HTTP-only, SameSite cookie.
- Added tenant/property request context and permission checks for protected Rails endpoints.
- Added public availability search with overlap detection.
- Added server-authoritative room, add-on, service-charge, and VAT calculation.
- Added PostgreSQL advisory locking for reservation inventory.
- Added atomic reservation, guest, room-allocation, folio, document-number, and audit creation.
- Added collision-safe, property-scoped document sequences.
- Added an idempotent Hotel New Era development seed containing 43 rooms.
- Connected the public booking page to the Rails reservation endpoint.
- Removed fake booking confirmation behavior from the public booking page.
- Added OpenAPI documentation for the implemented API slice.
- Added backend integration tests for authentication, server pricing, atomic records, and overbooking prevention.

Verified:

- Rails migration succeeds against PostgreSQL.
- Hotel New Era seed succeeds and contains 43 rooms.
- Rails test suite: 4 tests, 22 assertions, 0 failures.
- Brakeman security scan: 0 warnings.
- API health check succeeds.
- Availability returns all six seeded room types.
- Secure admin authentication succeeds; invalid demonstration credentials are rejected by tests.
- Live API reservation creates a real reservation and folio using server-calculated totals.
- Next.js production build succeeds.

Still on the legacy Next.js/Prisma backend and scheduled for later migration phases:

- Front desk, check-in, room assignment, folio operations, checkout, and night audit.
- POS and KOT.
- Banquets.
- Housekeeping.
- Inventory and procurement.
- CRM administration.
- Accounting and reporting.
- CMS and media.
- Contact inquiries, notifications, and remaining administrative APIs.

The application is therefore operating in a staged migration architecture. Rails is authoritative for the newly implemented authentication, availability, room foundation, and public reservation workflow. Legacy Next.js API routes remain temporarily for modules not yet migrated and must be removed as each Rails replacement is completed.

# Hotel New Era — User & Project Preferences

## 1. Property Identity & Location
- **Name**: Hotel New Era (Pvt. Ltd.)
- **Location**: Kalikapath, New Buspark, Butwal-8, Rupandehi, Lumbini Province, Nepal (near Tilottama / Tinau River).
- **Domain & Website**: `www.hotelnewera.com.np`
- **Phone**: `(+977) - 71 - 543833`
- **Email**: `info@hotelnewera.com.np` / `reservations@hotelnewera.com.np`
- **Heritage**: Founded in 1982 by Mr. & Mrs. Nepal (originating from the 10-bedroom Sangam Hotel in Butwal).
- **Motto**: *"Security, Cleanliness and Hospitality has always been the motto of the hotel."*

## 2. Operational Capacity & Setup
- **43 Saleable Rooms**: Distributed across 4 floors in 6 categories (Luxury, Deluxe, Family, Honeymoon, Standard AC, Standard Non-AC).
- **2 Restaurants**:
  1. `Dhiki Restaurant & Bhojangriha` (Traditional Bhojangriha, Thakali, Tandoori, and Family dining)
  2. `New Era Terrace Lounge & Bar` (Terrace outdoor dining, continental grill, sizzlers, cocktails, mocktails)
- **3 Seminar & Conference Halls**:
  1. `Nilkantha Grand Ballroom` (300 Pax capacity)
  2. `Tulki Devi Function Hall` (150 Pax capacity)
  3. `Devakala Executive Meeting Suite` (60 Pax capacity)
- **1 Main Kitchen**:
  - `Main Central Kitchen` unified production facility servicing Dhiki Restaurant, Terrace Lounge, Banquets, and 24/7 in-room dining.

## 3. Brand Colors & UI Aesthetics
- **Background**: Clean Plain White Background (`#FFFFFF` / `#F8FAFC`).
- **Logo Crimson Red**: `#A81C24` (Primary brand accent, buttons, active indicators).
- **Logo Emerald Green**: `#15803D` / `#16A34A` (Secondary accent, success, green leaf in spiral).
- **Logo Amber Gold**: `#D97706` / `#B45309` (Window accent in house logo).
- **Logo File**: `HD Logo.png` in workspace root, served via `/logo.png`. Always use this official HD logo across all interfaces.

## 4. Dual Calendar Inheritance
- Always inherit and render both the Nepali Bikram Sambat (BS) calendar and the English Gregorian (AD) calendar with Nepali Devanagari numerals and Nepali Fiscal Year compliance (Shrawan 1 to Ashadh 31, e.g. FY 2083/84).

## 5. Documentation & Conversation Logging
- Update Markdown documentation, handoff files, plans, and conversation logs only when the user explicitly asks to save or update `.md` files.
- Do not automatically record normal code changes in `docs/CONVERSATION.md`, `PROJECT_HANDOFF.md`, or implementation plans.

## 6. Mandatory Code and Folder Organization
- Keep the project domain-first and easy to navigate, following the clean separation used by the local `D:\Laravel Projects\recruitment_system` reference project.
- Every React URL must have its own route folder and a `page.tsx` entry file. Group routes by audience and business module, for example `src/pages/public/rooms/`, `src/pages/admin/pms/rooms/`, and `src/pages/admin/cms/hotel-setup/`.
- A route's `page.tsx` must coordinate data loading, state, and composition only. Do not grow it into a catch-all file.
- When a route has meaningful CRUD, forms, tables, dialogs, API calls, constants, types, or hooks, keep those files in that route's own folder: `components/`, `api.ts`, `types.ts`, `constants.ts`, and `hooks/` as appropriate.
- Put a component in `src/components/` only when it is shared by two or more routes. Keep feature-only code next to its page.
- Keep shared frontend concerns in their dedicated folders: `src/layouts/`, `src/lib/`, `src/styles/`, and `src/types/`. Do not recreate deprecated Next.js-style `src/app/` or frontend API-route folders.
- Keep Rails code domain-first too: controllers under `backend/app/controllers/api/v1/<domain>/`, services under `backend/app/services/<domain>/`, models under `backend/app/models/`, migrations under `backend/db/migrate/`, and domain routes under `backend/config/routes/`.
- Preserve this organization for every new file and refactor existing oversized pages before adding substantial new functionality to them.

## 7. Response Length
- Keep user-facing responses short and outcome-focused by default.
- Do not repeat completed work or provide long summaries unless the user explicitly requests detail, explanation, commands, or a report.

## 8. End-to-End Change Completeness
- Treat every approved feature or data-field change as end-to-end work by default. Update all affected UI create, edit, and view states; frontend types and API clients; Rails routes, controllers, serializers, strong parameters, models, validation, migrations/schema, audit data, and relevant tests in the same change.
- Do not wait for the user to separately request the related layers when they are required for the feature to function correctly.

## 9. Authoritative Data Synchronization
- Wrong or stale data is unacceptable. A write API must not report success until the database transaction has completed, and its response must be serialized from the persisted, reloaded database record.
- After create, update, or delete operations, the frontend must reconcile with authoritative API/database data before showing success. Do not rely on optimistic or locally fabricated master, operational, inventory, reservation, accounting, or financial values.
- Every data-changing feature must include relevant integration coverage proving that the submitted value, database value, API response, and refreshed view contract agree.

## 10. Project-Wide Performance
- Every page load, view transition, search, form submission, and CRUD action must remain responsive. Avoid unnecessary full-page reloads, duplicate API calls, blocking refetches, sequential requests that can run together, and repeated authentication or database work.
- Use authoritative persisted API responses to update the interface immediately, then perform background revalidation only when needed. Performance improvements must never weaken validation, transactions, tenant isolation, authorization, auditability, or data correctness.
- Design APIs and queries for the complete screen workflow: consolidate closely related reads, preload required associations, prevent N+1 queries, paginate large datasets, add appropriate indexes, and measure slow paths before considering work complete.
- Loading and saving states must provide immediate visual feedback and must not freeze unrelated parts of the interface.

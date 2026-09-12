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
- Always record all architectural actions, decision logs, and conversation entries in `docs/CONVERSATION.md`.
- Maintain version-controlled implementation plans under `docs/plans/`.

## 6. Mandatory Code and Folder Organization
- Keep the project domain-first and easy to navigate, following the clean separation used by the local `D:\Laravel Projects\recruitment_system` reference project.
- Every React URL must have its own route folder and a `page.tsx` entry file. Group routes by audience and business module, for example `src/pages/public/rooms/`, `src/pages/admin/pms/rooms/`, and `src/pages/admin/cms/hotel-setup/`.
- A route's `page.tsx` must coordinate data loading, state, and composition only. Do not grow it into a catch-all file.
- When a route has meaningful CRUD, forms, tables, dialogs, API calls, constants, types, or hooks, keep those files in that route's own folder: `components/`, `api.ts`, `types.ts`, `constants.ts`, and `hooks/` as appropriate.
- Put a component in `src/components/` only when it is shared by two or more routes. Keep feature-only code next to its page.
- Keep shared frontend concerns in their dedicated folders: `src/layouts/`, `src/lib/`, `src/styles/`, and `src/types/`. Do not recreate deprecated Next.js-style `src/app/` or frontend API-route folders.
- Keep Rails code domain-first too: controllers under `backend/app/controllers/api/v1/<domain>/`, services under `backend/app/services/<domain>/`, models under `backend/app/models/`, migrations under `backend/db/migrate/`, and domain routes under `backend/config/routes/`.
- Preserve this organization for every new file and refactor existing oversized pages before adding substantial new functionality to them.

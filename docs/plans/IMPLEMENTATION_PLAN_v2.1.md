# Hotel New Era - Implementation Plan v2.1.0

## Dynamic CMS & Front-End Integration Plan for All Pages

This plan details the implementation to ensure that **all 7 front-facing guest pages** (Home, About Us, Rooms & Suites, Dining & Bars, Banquets & Conferences, Special Offers & Packages, and Contact Us) are **fully dynamic, database-driven, and manageable from the Admin Portal**.

---

## 1. User Review Required

- **Special Offers (`/offers`)** will be connected to a dedicated dynamic CMS package engine (`CmsOffer` database model) where administrators can add, edit, activate/deactivate seasonal packages, promo codes, discount percentages, and validity dates.
- **Contact Us (`/contact`)** will be connected to dynamic property contact settings (phone, email, address, reception hours, Google Maps embed) and an interactive inquiry intake endpoint (`/api/contact/inquiry`) that logs customer messages into the admin notification center.
- **All 7 Public Pages** (`home`, `about`, `rooms`, `dining`, `banquet`, `offers`, `contact`) will be manageable from the CMS Page Builder (`/admin/cms/pages`) with live hero copy, banner image selection, and SEO metadata editing.

---

## 2. Architecture of Dynamic Front-End Pages

```
                   Admin CMS & Platform (/admin/cms/pages)
                                    │
                                    ▼ (JSON Mutate)
                  Next.js REST API Layer (/api/cms/*, /api/contact/*)
                                    │
                                    ▼ Prisma ORM
                         PostgreSQL Database
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                           ▼
[Static/Dynamic CMS Pages]   [CmsOffers Catalog]     [Property Contact & Inquiries]
  - Home (Hero & Stats)       - Butwal Heritage Escape  - Phone, Email, Address
  - About Us (Story & 1982)   - Lumbini Pilgrimage      - Direct Inquiries API
  - Rooms Showcase            - Corporate Conference    - Reception Operating Hours
  - Dining & Outlets          - Honeymoon Romance
  - Banquets & Events
```

---

## 3. Proposed Step-by-Step Changes

### 1. REST API Layer for CMS & Special Offers
- **`src/app/api/cms/pages/route.ts`**:
  - `GET`: Returns published page settings, hero text, and SEO metadata for any requested slug (`home`, `about`, `rooms`, `dining`, `banquet`, `offers`, `contact`).
  - `POST`: Persists updated page title, hero heading, subheading, description, banner image URL, and SEO tags to `CmsPage` / `CmsSection`.
- **`src/app/api/cms/offers/route.ts`**:
  - `GET`: Returns all active promotional packages and discount offers for `/offers` and booking engine promo validation.
  - `POST`: Create or update special offer packages (title, promo code, discount %, price, inclusions, banner image, validity dates).
  - `DELETE`: Deactivate or delete offers.
- **`src/app/api/contact/inquiry/route.ts`**:
  - `POST`: Receives contact form submissions (name, email, phone, subject, message), stores notification in database, and logs audit event.

### 2. CMS Admin Portal Enhancement ([`src/app/(admin)/admin/cms/pages/page.tsx`](file:///c:/Users/lph/OneDrive/Projects/Hotel%20New%20Era/src/app/(admin)/admin/cms/pages/page.tsx))
- Expand the page switcher to include **all 7 pages**:
  1. 🏠 **Homepage** (`home`)
  2. 🏛️ **About Us** (`about`)
  3. 🛏️ **Rooms & Suites** (`rooms`)
  4. 🍽️ **Dining & Bars** (`dining`)
  5. 👥 **Banquets & Conferences** (`banquet`)
  6. 🎁 **Special Offers & Packages** (`offers`) - includes Package Card Manager & Promo Code Generator.
  7. 📞 **Contact Us & Map** (`contact`) - includes Contact details, WhatsApp hotline, map coords, and incoming inquiries viewer.

### 3. Front-End Dynamic Pages Alignment
- Update `src/app/(public)/offers/page.tsx` to dynamically fetch active offers from `/api/cms/offers`.
- Update `src/app/(public)/contact/page.tsx` to connect its contact inquiry form to `POST /api/contact/inquiry` with instant user feedback.
- Ensure all public pages utilize the database-backed hero text and SEO metadata.

---

## 4. Verification Plan

### Automated & API Tests
- `GET /api/cms/pages?slug=offers` -> Returns dynamic offers page settings.
- `GET /api/cms/pages?slug=contact` -> Returns dynamic contact page settings.
- `POST /api/cms/offers` -> Creates a test promotional package in PostgreSQL.
- `POST /api/contact/inquiry` -> Submits a test guest message and verifies audit log entry.
- Execute `next build` to verify 0 compilation errors across all routes.

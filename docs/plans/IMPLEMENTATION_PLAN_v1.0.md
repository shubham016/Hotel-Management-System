# System Architecture & Implementation Plan: Hotel New Era Platform
**Version:** 1.0.0
**Date:** 2026-08-22
**Status:** Approved by User - In Execution

---

## Executive Summary & Vision

**Hotel New Era** is conceived not merely as a standalone hotel website, but as an **integrated, enterprise-grade Hotel Management & Hospitality SaaS Platform**. The platform unites a public-facing booking engine and marketing website with a headless CMS, a core Property Management System (PMS), Point of Sale (POS), Banquet & Conference Management, Inventory & Procurement, a double-entry General Ledger Accounting ERP, CRM, and real-time Management Business Intelligence.

The architecture is designed strictly around multi-tenancy (`Company -> Property/Hotel -> Branch -> Departments`), enabling immediate operation for Hotel New Era while remaining fully prepared for SaaS multi-property commercial distribution.

---

## 1. System Architecture & Tier Hierarchy

The platform adheres to a strict layered hierarchy where the public website is a dynamic consumer of the CMS and operational APIs, backed by a unified PostgreSQL database:

```
PUBLIC WEBSITE & BOOKING ENGINE (Next.js / Responsive SSR + Dynamic Client)
       │
       ▼
ENTERPRISE CMS & MEDIA ENGINE (Page Builder, Sections, Banners, SEO, Media Library)
       │
       ▼
HOTEL APPLICATION & BUSINESS LOGIC LAYER
 ├── PMS & Front Desk Engine (Reservations, Folios, Night Audit)
 ├── Restaurant & Outlets POS (KOT, Tables, Room Posting)
 ├── Banquet & Event Engine (Halls, Calendars, Contracts)
 ├── Inventory & Procurement (Multi-Store, GRN, Stock Issues)
 ├── Guest CRM & Loyalty (Profiles, Stay/Spend History)
 ├── Core Accounting ERP (General Ledger, COA, Tax Engine, Auto-Journals)
 └── BI & Operational Reporting (Manager, Front Desk, Housekeeping Dashboards)
       │
       ▼
SECURITY & MULTI-TENANT CORE (RBAC, Tenant Scoping, Audit Trail, Nepali BS Calendar Support)
       │
       ▼
POSTGRESQL DATABASE (Fully Normalized, Relational Integrity, ACID Transactions)
```

---

## 2. Technology Stack & Rationale

| Layer | Recommended Technology | Architectural Rationale |
| :--- | :--- | :--- |
| **Language** | **TypeScript (Strict Mode)** | Full-stack end-to-end type safety across database schemas, DTOs, API contracts, and UI components. |
| **Framework** | **Next.js 14+ / React 18+** | Unified full-stack architecture supporting SSR for public SEO pages, static asset optimization, dynamic Server Actions & REST API routes (`/api/*`), and rich client dashboards. |
| **Database** | **PostgreSQL 15+** | ACID-compliant relational transactions essential for double-entry financial ledgers, row-locking reservation integrity, and complex relational reporting. |
| **ORM / Data Layer** | **Prisma ORM** | Schema-as-code with type generation, robust migrations, relation filters, connection pooling, and multi-tenant query middleware. |
| **Design System / Styling** | **Vanilla CSS + CSS Variables / Modules** | Zero-bloat, pixel-perfect enterprise UI inspired by OrangeHRM's clean card-based layout, warm hotel accents, high contrast, and responsive flex/grid layouts without heavy framework lock-in. |
| **Authentication & RBAC** | **JWT with HttpOnly Secure Cookies + Argon2id/Bcrypt** | Session security, multi-role granular permission validation per route and API endpoint. |
| **Date / Localization Engine** | **Standard Gregorian (UTC) with Nepali Bikram Sambat (BS) Adapter** | Accurate financial calculations using Gregorian ISO timestamps in the database, with bi-directional Bikram Sambat conversion for Nepali calendar display and fiscal year compliance. |

---

## 3. Multi-Tenant & Multi-Property Architecture

Every data record is scoped to ensure complete tenant isolation:

```
Company (Tenant Level: e.g. "New Era Hospitality Group")
  └── Property / Hotel (e.g. "Hotel New Era - Pokhara / Kathmandu")
        ├── Branch / Location
        ├── Departments (Front Office, Housekeeping, F&B, Maintenance, Accounts, Store)
        ├── Cost Centers & Warehouses
        ├── Users & Roles
        └── Operational Transactions (Reservations, Folios, Journal Entries, Stock Transactions)
```

---

## 4. Complete Module Map & Functional Scope

```
├── 1. PUBLIC WEBSITE & BOOKING ENGINE
│   ├── Dynamic Homepage (Hero, Rooms, Dining, Facilities, Events, Gallery, Offers, Testimonials)
│   ├── Room Catalog & Detail Pages with Dynamic Amenities
│   ├── Direct Booking Engine (Date Picker, Occupancy, Real-Time Availability, Room Selection, Add-on Services, Folio Reservation Creation)
│   ├── Restaurant, Banquet & Experience Showcase
│   ├── Dynamic Content Pages (About Us, Contact, Policies, Blog/News, Careers)
│   └── SEO Meta Tags, OpenGraph, Canonical URLs & Dynamic Sitemap.xml
│
├── 2. ENTERPRISE CMS & MEDIA LIBRARY
│   ├── Section-Based Visual Homepage & Page Builder
│   ├── Banners, Promotional Popups & Offer Managers
│   ├── Centralized Media Library (Multi-upload, Categorization, Tagging, Alt-text, File Re-use)
│   ├── Navigation & Footer Menu Customizers
│   ├── Dynamic Page Management with Custom Slugs
│   └── Multi-language Content Structures (English & Nepali)
│
├── 3. PROPERTY MANAGEMENT SYSTEM (PMS) & FRONT DESK
│   ├── Room Management (Types, Floors, Numbers, Status: Clean, Dirty, Inspected, Occupied, Out-of-Order, Out-of-Service)
│   ├── Reservation Engine (Walk-ins, Online, Corporate, OTA, Group Bookings, Waitlists, Cancellations, No-shows)
│   ├── Front Desk Operations (Today's Arrivals, Departures, In-House Guests, Early Check-in, Late Check-out, Room Transfers)
│   ├── Guest Folio System (Room Charges, F&B Charges, Laundry/Spa Additions, Tax breakdown, Partial Payments, Split Folios)
│   └── Night Audit Automation (Daily closing, Revenue reconciliation, Auto-posting room charges, Audit log generation)
│
├── 4. GUEST MANAGEMENT (CRM)
│   ├── Master Guest Database with Duplicate Profile Detection (Phone/Email/ID matching)
│   ├── KYC & ID Document Storage (Passports, Citizenship, Driving Licenses)
│   ├── Guest Preferences, VIP Status, Dietary Needs, Stay History & Lifetime Spend Analytics
│   └── Feedback, Complaint Resolution & Loyalty Tier Tracking
│
├── 5. RESTAURANT & POINT OF SALE (POS)
│   ├── Outlets & Floor/Table Management
│   ├── Menu Management (Categories, Items, Modifiers, Kitchen Routing)
│   ├── Kitchen Order Ticket (KOT) System & Live Order Tracking
│   ├── Billing Engine (Discounts, Service Charges, VAT, Cash/Card/Digital Wallet)
│   ├── Direct Room Posting (Charge to Guest Room Folio with Room & Guest Validation)
│   └── Cashier Shift Management & End-of-Day Register Closing
│
├── 6. BANQUET, CONFERENCE & EVENTS
│   ├── Hall Masters (Capacity, Layout Configurations: Theater, U-Shape, Classroom, Banquet)
│   ├── Interactive Visual Event Calendar with Double-Booking Prevention
│   ├── Event Booking Lifecycle (Inquiry -> Quotation -> Contract -> Advance Deposit -> BEO -> Final Billing)
│   ├── Package & Menu Catering Management
│   └── Equipment, AV & Decoration Logistics Tracking
│
├── 7. HOUSEKEEPING & MAINTENANCE
│   ├── Live Room Status Grid (Clean, Dirty, Inspected, Occupied, Vacant, OOO)
│   ├── Housekeeper Roster & Floor-wise Cleaning Task Assignments
│   ├── Digital Room Inspection Checklist
│   ├── Work Orders & Maintenance Ticket Management
│   └── Linen Management & Lost & Found Tracker
│
├── 8. INVENTORY & MULTI-STORE MANAGEMENT
│   ├── Store Hierarchy (Main Store, Kitchen Store, Bar Store, Housekeeping Store, Maintenance Store)
│   ├── Item Master, UOMs, Categories, Reorder Levels & Batch/Expiry Tracking
│   ├── Stock Transactions (Opening Stock, GRN Receipts, Internal Issues, Departmental Transfers, Wastage/Spoilage, Adjustments)
│   └── Physical Stock Counting & Discrepancy Audits
│
├── 9. PROCUREMENT & SUPPLIER MANAGEMENT
│   ├── Supplier Master & Ledger Accounts
│   ├── Purchase Requisitions with Multi-Tier Approval Workflows
│   ├── Purchase Orders (PO Generation, Email dispatch)
│   ├── Goods Receipt Notes (GRN) with 3-Way Matching (PO vs GRN vs Invoice)
│   └── Supplier Invoicing, Payment Scheduling & Statement of Accounts
│
├── 10. FINANCIAL ACCOUNTING ERP & TAX ENGINE
│   ├── Hierarchical Chart of Accounts (Assets, Liabilities, Equity, Revenue, Cost of Sales, Expenses)
│   ├── Double-Entry General Ledger with Automated Background Journal Posting
│   │   ├── Room Checkout -> Dr Cash/AR | Cr Room Revenue, Cr Tax Payable
│   │   ├── Restaurant Bill -> Dr Cash/Folio AR | Cr Food/Bev Revenue, Cr Service Charge, Cr Tax Payable
│   │   ├── Purchase Invoice -> Dr Inventory/Expense | Dr Input Tax | Cr Supplier Payable
│   │   └── Guest Advance -> Dr Bank/Cash | Cr Guest Advance Liability
│   ├── Configurable Tax Engine (VAT, Service Charge, Inclusive/Exclusive calculation rules)
│   └── Financial Reports (Trial Balance, P&L, Balance Sheet, Cash Flow, AR/AP Aging, Departmental P&L)
│
├── 11. DASHBOARD & BUSINESS INTELLIGENCE
│   ├── General Management Executive Dashboard (Occupancy %, ADR, RevPAR, Total Revenue, Net Profit, In-House Count)
│   ├── Front Desk Dashboard (Arrivals, Departures, Available/Dirty Rooms, VIP list)
│   ├── Housekeeping Dashboard (Rooms to Clean, Cleaned, Inspected, Maintenance Blocks)
│   └── Financial Dashboard (Daily Cash Flow, Receivables, Payables, Revenue vs Expense Trend)
│
└── 12. CORE ADMINISTRATION, SECURITY & AUDIT
    ├── Granular Role-Based Access Control (RBAC) with predefined and custom roles
    ├── Tamper-Proof Audit Trail (Who, When, IP, Module, Entity, Action, Before/After Snapshot)
    ├── Multi-Step Approval Workflows (Requisitions, Journal Vouchers, Discounts)
    ├── Initial Setup Wizard (Company, Property, Fiscal Year, Currency, Tax Profiles, Default COA)
    └── Extensible Notification Service (In-App, Email, SMS, WhatsApp triggers)
```

---

## 5. UI/UX Design System (OrangeHRM-Inspired Tokens)

```css
:root {
  /* Primary & Accent Colors */
  --color-primary-orange: #F28C00;
  --color-deep-orange: #E87500;
  --color-golden: #F4B400;
  --color-light-golden: #FFF3D6;
  --color-green: #43A047;
  --color-light-green: #EAF6EA;
  --color-red-danger: #E53935;
  --color-light-red: #FFEBEE;
  
  /* Neutral & Base */
  --color-bg-main: #F7F8F9;
  --color-bg-card: #FFFFFF;
  --color-bg-sidebar: #FFFFFF;
  --color-text-primary: #263238;
  --color-text-secondary: #6B7280;
  --color-text-muted: #9CA3AF;
  --color-border: #E5E7EB;
  --color-border-hover: #D1D5DB;

  /* Typography */
  --font-family-base: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  
  /* Shadows & Radius */
  --shadow-subtle: 0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03);
  --shadow-card: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
  --shadow-hover: 0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04);
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-pill: 9999px;
}
```

---

## 6. Phased Roadmap

```
Phase 1: Architecture, Data Models & Schema Design (DONE)
Phase 2: UI Design System & Component Library (IN PROGRESS)
Phase 3: Core Multi-Tenant Engine, Auth & Security, Initial Setup Wizard, Audit Trail
Phase 4: Property Management System (PMS) — Room Inventory, Reservations, Front Desk, Guest Folios
Phase 5: Operational Engines — Restaurant POS (KOT + Room Posting), Banquet/Events, Housekeeping
Phase 6: Multi-Store Inventory, Procurement & Supplier Management
Phase 7: General Ledger Accounting ERP, Automated Journal Engine & Configurable Tax System
Phase 8: Enterprise Headless CMS & Media Library
Phase 9: Public Hotel Website & Real-Time Booking Engine
Phase 10: Dashboards, BI Analytics, Night Audit, Financial Exporters & Final Verification
```

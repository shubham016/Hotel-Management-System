# Frontend Source Guide

The frontend is organized by route and business area so a developer can find a screen from its URL.

```text
src/
|-- pages/
|   |-- public/                 public hotel website
|   |-- auth/                   login and authentication screens
|   `-- admin/                  admin portal, grouped by hotel module
|-- layouts/                    shells shared by several routes
|-- components/
|   |-- ui/                     generic reusable controls
|   |-- public/                 shared public-site components
|   `-- admin/                  shared admin-portal components
|-- lib/                        API, authentication, routing, date, and export helpers
|-- styles/                     global styles and design tokens
|-- types/                      types shared by multiple features
|-- App.tsx                     URL-to-page route registry
`-- main.tsx                    browser entry point
```

## Page folder convention

Every URL has its own folder and `page.tsx`. For example:

- `/rooms` → `pages/public/rooms/page.tsx`
- `/admin/dashboard` → `pages/admin/dashboard/page.tsx`
- `/admin/cms/hotel-setup` → `pages/admin/cms/hotel-setup/page.tsx`

Small pages may contain their view directly. A larger page should keep its private files beside the route:

```text
hotel-setup/
|-- page.tsx                    state coordination and screen composition
|-- api.ts                     Rails API requests for this feature
|-- types.ts                   data and form shapes
|-- constants.ts               defaults and fixed choices
`-- components/                feature-only forms, tables, and dialogs
```

Move a component to the top-level `components/` directory only when more than one route uses it. Business rules, database access, authorization, and validation belong in the Rails `backend/`, not in React pages.

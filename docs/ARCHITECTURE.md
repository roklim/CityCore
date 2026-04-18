# Architecture Notes

## Current Maturity

The project is now an early SaaS foundation. It remains a working food-ordering product, but core records can be scoped by business.

It is not yet a complete multi-tenant marketplace SaaS because onboarding, per-business admin users, billing and non-food modules are still future phases.

## Core Tenant

`Business` is the root tenant entity.

Important fields:

- `name`
- `slug`
- `type`
- `plan`
- `subscriptionStatus`
- `branding`
- `features`
- `settings`
- `deployment`

`deployment` stores Vercel/app metadata for the separate frontend project of each business:

- `publicUrl`
- `vercelProjectName`
- `apiBaseUrl`
- `notes`

Every operational model should be scoped with `businessId` unless it is global platform configuration.

## Implemented Tenant-Aware Models

- `Business`
- `User` scaffold
- `MenuItem`
- `Order`
- `Customer`
- `Coupon`
- `StoreSettings`
- `Booking` scaffold
- `Rental` scaffold

## Tenant Resolution

Requests are resolved in this order:

1. `X-Business-Slug` header
2. `?business=` query parameter
3. `/admin/<slug>` frontend route
4. `/p/<slug>` frontend route
5. `DEFAULT_BUSINESS_SLUG`

The default fallback keeps the current pizza app working during the transition.

## Deployment Model

The recommended production model is:

- one backend API
- one MongoDB database
- many `Business` documents
- one frontend codebase
- one Vercel project per business

Each Vercel project uses:

```env
VITE_API_BASE_URL=https://your-api.example.com/api
VITE_BUSINESS_SLUG=<business-slug>
```

This gives every activity its own app/domain while keeping code, database, and operations centralized.

## Platform Admin

The platform owner can use `/admin` and the `Business` section to:

- list all businesses
- create a new business
- edit plan/status/type/branding/deployment metadata
- see total orders, estimated GMV, products and customers
- copy the Vercel slug variable

The current global admin can still use env credentials. Per-business users are Mongo-backed and receive JWTs containing `businessId` and `businessSlug`.

## Auth And Roles

Roles:

- `global_admin`: full platform access.
- `owner`: full access to one business.
- `admin`: operational access to one business.
- `staff`: limited access to orders and availability.

Security rule:

- public routes resolve the tenant from slug/header/query.
- global admins may choose a tenant with `X-Business-Slug`, `/admin/<slug>`, or `?business=`.
- business users are locked to the `businessId` in their JWT.
- if a business user sends another slug, the backend ignores it and uses the token tenant.

This prevents an owner of Mucho Gusto from reading or modifying Sushi Centro data.

## Modules

### Ordering

Implemented as the first real vertical. It includes:

- public menu
- cart and order creation
- pickup slots
- order tracking
- admin order management
- customer lookup
- product availability
- coupons
- custom pizza flag

### Booking

Scaffold only. Intended for:

- table reservations
- appointments
- small venue bookings

### Rental

Scaffold only. Intended for:

- bike rental
- equipment rental
- hourly or daily rental

## Roadmap

### Phase 1: Modular SaaS Foundation

- Business model
- businessId scoping
- default tenant
- feature flags
- tenant-aware ordering routes
- documentation

### Phase 2: Multi-Business Food SaaS

- public routes like `/p/:slug`
- owner/admin users per business
- platform admin business creation
- onboarding polish
- branding
- pricing page
- analytics
- export tools

### Phase 3: Modular Marketplace Platform

- booking MVP
- rental MVP
- billing integration
- business templates
- marketplace landing
- security and transfer checklist

## Risks To Handle Before Real Multi-Tenant Sales

- Drop legacy global unique indexes in MongoDB and replace them with compound tenant indexes.
- Replace single admin credentials with real per-business users.
- Add stronger authorization checks.
- Add onboarding and business provisioning.
- Add billing lifecycle handling.

## Supporting Docs

- `docs/VERCEL_BUSINESS_APPS.md`
- `docs/BUSINESS_METRICS.md`
- `docs/TROUBLESHOOTING.md`
- `docs/TECHNICAL_REVIEW.md`

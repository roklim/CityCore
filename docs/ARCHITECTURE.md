# Architecture Notes

## Current Maturity

The project is now an early SaaS foundation. It remains a working food-ordering product, but core records can be scoped by business.

It is not yet a complete multi-tenant marketplace SaaS because guided onboarding, billing, audit logs and non-food modules are still future phases.

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

`deployment` stores optional metadata for a separate/customer-specific frontend
project. The default production model uses one central Vercel app and routes by
business slug.

- `publicUrl`
- `vercelProjectName`
- `apiBaseUrl`
- `notes`

Every operational model should be scoped with `businessId` unless it is global platform configuration.

## City And Market Layer

The platform has two city levels:

- `CityRegistry`: verified Italian municipalities imported from ISTAT/SITUAS or another trusted source.
- `City`: activated platform market visible to public users.

Public city search reads only active `City` records. The global admin can search `CityRegistry` and activate a city before assigning businesses to it.

## Implemented Tenant-Aware Models

- `Business`
- `CityRegistry`
- `City`
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

1. owner/admin/staff JWT `businessId`
2. `X-City-Slug` + `X-Business-Slug` headers
3. `?city=` + `?business=` query parameters
4. `/:citySlug/:businessSlug` frontend route
5. `/:citySlug/:businessSlug/admin` frontend route
6. `/:citySlug/:businessSlug/ordine/:id` frontend route
7. legacy `/:businessSlug` frontend route
8. legacy `/:businessSlug/admin` frontend route
9. `DEFAULT_BUSINESS_SLUG`

The default fallback keeps the current pizza app working during the transition.

## Deployment Model

The recommended production model is:

- one backend API
- one MongoDB database
- many `Business` documents
- one frontend codebase
- one central Vercel project, currently `https://cagli.vercel.app`

The central Vercel project uses:

```env
VITE_API_BASE_URL=https://mucho-gusto-mg5y.onrender.com/api
VITE_BUSINESS_SLUG=mucho-gusto
```

`VITE_BUSINESS_SLUG` is only the legacy fallback. Normal customer/admin traffic
uses path-based routing:

```txt
/                         city search
/admin                    global login/platform console
/admin/cities             platform city registry and market status
/admin/businesses         global business/user management
/admin/users              global tenant users
/admin/settings           global platform settings
/:citySlug                city directory
/:citySlug/:businessSlug  public menu/app
/:citySlug/:businessSlug/admin      business admin
/:citySlug/:businessSlug/ordine/:id order tracking
```

Legacy direct business routes remain available during migration.

## Platform Admin

The platform owner uses `/admin` to see the platform console.
`/admin` no longer opens the default Mucho Gusto operational dashboard.

From the platform console the global admin can:

- open a dashboard with platform metrics and operational priorities
- search verified municipalities in the registry
- activate a city/market and set `active`, `coming_soon` or `disabled`
- list all businesses
- create a new business
- edit plan/status/type/branding/deployment metadata
- manage owner/admin/staff users for each business
- see total orders, estimated GMV, products and customers
- open any business menu with `/:citySlug/:slug`
- open any operational admin with `/:citySlug/:slug/admin`

Platform administration and local business administration use separate menus:

- `/admin`, `/admin/cities`, `/admin/businesses`, `/admin/users` and `/admin/settings` are platform-level surfaces.
- `/:citySlug/:businessSlug/admin` is the local operational counter for the selected business.

Platform-only actions such as city activation, tenant creation and owner provisioning should not appear in the local business sidebar.

The current global admin can still use env credentials. Per-business users are Mongo-backed and receive JWTs containing `businessId` and `businessSlug`.

## Auth And Roles

Roles:

- `global_admin`: full platform access.
- `owner`: full access to one business.
- `admin`: operational access to one business.
- `staff`: limited access to orders and availability.

Security rule:

- public routes resolve the tenant from slug/header/query.
- global admins may choose a tenant with `X-City-Slug` + `X-Business-Slug` or `?city=` + `?business=`.
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

- city-based public routes like `/:citySlug/:slug`
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
- Drop any legacy global unique index on `businesses.slug`; the target uniqueness is `location.citySlug + slug`.
- Keep the legacy env global admin only as bootstrap/fallback; day-to-day business access should use Mongo-backed owner/admin/staff users.
- Add stronger authorization checks.
- Add onboarding and business provisioning.
- Add billing lifecycle handling.

## Supporting Docs

- `docs/CITY_REGISTRY.md`
- `docs/TROUBLESHOOTING.md`
- `docs/AUTH_ROADMAP.md`
- `docs/V2_PLATFORM_BLUEPRINT.md`
- `docs/V2_DATA_MODEL.md`
- `docs/V2_MIGRATION_PLAN.md`
- `docs/V2_EXECUTION_ROADMAP.md`

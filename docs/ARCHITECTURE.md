# Architecture Notes

## Current Shape

CityCore is a monorepo with three active applications:

- `apps/web`: Next.js App Router for public and admin surfaces
- `apps/api`: Fastify + Prisma + Postgres
- `apps/worker`: background jobs

Shared logic lives in `packages/*`.

## Core Platform Entities

Primary platform entities:

- `CityRegistry`
- `City`
- `Business`
- `AccessGrant`
- `User`

Operational entities currently active:

- `MenuItem`
- `Order`
- `Customer`
- `Coupon`
- `StoreSettings`

The platform is city-first: a public city is the discovery layer, while a
business is the operational tenant.

## Routing Model

Public routes:

```txt
/                         global home
/:citySlug                city surface
/:citySlug/:businessSlug  business surface
/:citySlug/:businessSlug/ordine/:id
```

Admin routes:

```txt
/admin/login
/admin
/select-access
/:citySlug/:businessSlug/admin
```

## Tenant Resolution

Requests are resolved through explicit platform context:

1. authenticated access grants
2. `X-City-Slug` + `X-Business-Slug` headers when needed
3. city-first route parameters

The active system does not rely on a single default business route.

## Deployment Model

Recommended deployment:

- one Vercel project for `apps/web`
- one app host service for `apps/api`
- one worker service for `apps/worker`
- one Postgres database
- one Redis instance

Minimum required public env:

```env
NEXT_PUBLIC_API_BASE_URL=https://citycore-api-staging.onrender.com
```

## Surface Split

Public and admin surfaces share a base system, but serve different jobs:

- public: discovery, trust, action
- admin: operations, control, auditability

They should look related, not identical.

## Current Direction

The active UI direction is:

- charcoal foundation
- restrained yellow accent
- mobile-first hierarchy
- city-first public discovery
- business pages that convert quickly

## Non-Goals

This repo does not currently model:

- billing as a finished product surface
- advanced onboarding flows
- fully internationalized public copy
- a production-grade worker job catalogue

Those remain future slices on top of the current V2 platform.

# Technical Review

## Current Maturity

The project is now an early multi-tenant SaaS foundation with a working ordering vertical, city-based routing, a verified city registry, Mongo-backed business users, and a dedicated platform console.

The product is not yet a complete marketplace SaaS because guided onboarding, billing, audit logs, automated migrations, automated regression tests, and real booking/rental modules are still incomplete.

## What Is Now In Place

- Central public home at `/` for active city search.
- City directory at `/:citySlug`.
- Public business app at `/:citySlug/:businessSlug`.
- Local business counter at `/:citySlug/:businessSlug/admin`.
- Dedicated platform console at `/admin`, `/admin/cities`, `/admin/businesses`, `/admin/users`, `/admin/settings`.
- Platform controller separated from the local admin controller.
- City activation from `CityRegistry` into `City` with `active`, `coming_soon`, and `disabled` states.
- Business creation/editing with verified city assignment.
- Owner/admin/staff users scoped to one business.

## Critical Risks

- Password reset and invitation flows are not implemented yet.
- Granular role permissions are intentionally minimal; expand them as staff workflows become clearer.
- Existing MongoDB deployments may still have legacy global unique indexes such as `name_1`, `phone_1`, `code_1`, or `businesses.slug_1`.
- Platform actions do not yet have audit logs.
- Billing and plan lifecycle enforcement are not implemented yet.

## Important Risks

- Business settings exist both in `Business.settings` and `StoreSettings`; keep the split intentional: platform metadata in `Business`, operational counter settings in `StoreSettings`.
- Booking and rental are scaffolded, not real modules yet.
- `PlatformHome.jsx` has been trimmed to the city directory; root search and platform admin are now isolated in their dedicated views.
- There is no automated regression suite beyond build, smoke checks and manual browser checks.

## Recommended Refactor Order

1. Add owner invitation and password reset flows.
2. Add audit logs for platform actions: city status changes, business edits, user provisioning.
3. Extract platform API/business/city logic from `backend/routes/platform.js` into services.
4. Add regression tests for routing, tenant isolation and role permissions.
5. Add billing lifecycle handling for `plan` and `subscriptionStatus`.

## Current Frontend Structure

```txt
frontend/src/
  App.jsx
  lib/
    api.js
  constants.js
  components/
    admin/
    customer/
    ui/
  hooks/
    useAdminController.js
    useCustomerController.js
    usePlatformConsoleController.js
  views/
    PlatformLanding.jsx
    CityHome.jsx
    PlatformHome.jsx
    PlatformAdminView.jsx
    PlatformConsoleView.jsx
    AdminView.jsx
    CustomerView.jsx
    TrackingView.jsx
  styles/
    base.css
    city.css
    customer.css
    admin.css
    platform.css
    responsive.css
```

## Suggested Backend Structure

```txt
backend/
  config/
  db/
  middleware/
  routes/
  services/
    businessService.js
    cityRegistryService.js
    menuTemplateService.js
    orderStatsService.js
    platformService.js
  scripts/
    check-db.js
    import-city-registry.js
    index-report.js
    smoke-test.js
  utils/
    slug.js
    phone.js
```

## Verification Checklist

- `npm --prefix frontend run build`
- `npm --prefix backend run smoke` while the API server is running.
- `npm --prefix backend run check:db`
- `npm --prefix backend run check:indexes`
- Manual login check for `global_admin`, owner/admin/staff.
- Manual route check for `/admin`, `/admin/cities`, `/admin/businesses`, `/admin/users`, and `/:citySlug/:businessSlug/admin`.

## Next Best Milestone

The next milestone should improve auth operations and governance:

- owner invitations
- password reset
- clearer staff permission matrix
- platform audit log
- minimal automated regression suite for tenant isolation

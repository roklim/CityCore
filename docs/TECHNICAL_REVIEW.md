# Technical Review

## Current Maturity

The project is an early multi-tenant SaaS foundation. The ordering vertical is usable, and the platform now has business-aware data, a platform admin, Vercel-per-business routing, and starter menu templates.

It is not yet production multi-tenant SaaS because billing, automated migrations, and automated tests are still incomplete. Per-business user auth now exists, but should keep receiving security review as permissions become more granular.

## Critical Risks

- Per-business owner/admin/staff authentication exists, but password reset and invitation flows are not implemented yet.
- Granular role permissions are intentionally minimal; expand them as staff workflows become clearer.
- Existing MongoDB deployments may still have legacy global unique indexes such as `name_1`, `phone_1`, or `code_1`.
- The frontend is concentrated in `frontend/src/main.jsx`, which makes regression risk higher as features grow.

## Important Risks

- `frontend/src/styles.css` is large and mixes customer, admin, platform, and responsive styles.
- Business settings exist both in `Business.settings` and `StoreSettings`; the split is workable, but should be documented and kept intentional.
- Booking and rental are scaffolded, not real modules yet.
- The platform admin and business admin share one screen and should eventually be separated into clearer components.
- There is no automated regression suite beyond build and syntax checks.

## Recommended Refactor Order

1. Add owner invitation/password reset flows.
2. Extract frontend constants and helpers from `main.jsx`.
3. Extract platform admin, business admin, and customer UI into separate components.
4. Split CSS into `tokens`, `customer`, `admin`, `platform`, and `responsive`.
5. Extract backend business/platform/order stats logic into services.
6. Add smoke tests and migration scripts to CI/deploy checklist.

## Suggested Frontend Structure

```txt
frontend/src/
  main.jsx
  App.jsx
  lib/
    api.js
    business.js
    format.js
  constants/
    menu.js
    statuses.js
  components/
    customer/
    admin/
    platform/
    ui/
  hooks/
    useBusinessSlug.js
    useCart.js
    useAdminData.js
  styles/
    tokens.css
    customer.css
    admin.css
    platform.css
    responsive.css
```

Do not do this as one huge move. Start with constants and helpers first, then components.

## Suggested Backend Structure

```txt
backend/
  config/
  db/
  middleware/
  routes/
  services/
    businessService.js
    menuTemplateService.js
    orderStatsService.js
  scripts/
    check-db.js
    index-report.js
    smoke-test.js
  utils/
    slug.js
    phone.js
```

## Verification Checklist

- `node --check` on changed backend files.
- `npm run build` in `frontend`.
- `npm run check:db` in `backend`.
- `npm run check:indexes` in `backend`.
- `npm run smoke` in `backend` while the API server is running.

## Next Best Milestone

Next milestone should improve auth operations:

- password reset or invitation emails
- owner self-service profile
- clearer staff permission matrix
- audit logs for platform actions

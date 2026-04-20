## Stack

- Frontend: React + Vite
- Backend: Node.js + Express
- Database: MongoDB + Mongoose
- Hosting target: Vercel frontend, Render or similar backend

## Local Setup

Backend:

```bash
cd backend
cp .env.example .env
npm install
npm start
```

Frontend:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev -- --port 5173
```

## Default Business

The app ships with a default tenant:

- Name: Mucho Gusto
- Slug: `mucho-gusto`
- Type: `pizzeria`
- Enabled modules: ordering, custom pizza, coupons, analytics

Frontend requests send `X-Business-Slug`. If no slug is provided, the backend falls back to `DEFAULT_BUSINESS_SLUG`.

## SaaS Direction

The platform is designed around:

- a shared `Business` core
- tenant-scoped products, orders, customers, settings and coupons
- feature flags for ordering, booking and rental modules
- a migration path from single pizzeria app to multi-business SaaS
- one backend/database with multiple businesses
- one frontend codebase deployed as separate Vercel apps per business

The global admin is available from `/admin`. The new `Business` section lets the platform owner create and monitor businesses, store Vercel URLs, and copy the slug env variable for each app.

## Admin Roles

The platform now supports Mongo-backed business users:

- `global_admin`: platform owner, can see and manage all businesses.
- `owner`: business owner, can see only their own business.
- `admin`: business operator, can manage the assigned business.
- `staff`: limited operator, focused on orders and availability.

The legacy `.env` admin login still works as `global_admin`. Business owners are created from the `Business` section by adding owner name, email, and a temporary password.

Tenant isolation rule: for `owner`, `admin`, and `staff`, the backend uses `businessId` from the JWT and ignores conflicting frontend slugs.

For day-to-day convenience, you can manage a specific business without changing env files:

```txt
/admin/mucho-gusto
/admin/sushi-centro
```

Customer previews use:

```txt
/p/mucho-gusto
/p/sushi-centro
```

Owner example:

1. Create business `Mucho Gusto`.
2. Add owner `mario@muchogusto.it` with a temporary password.
3. Mario logs in at `/admin` or `/admin/mucho-gusto`.
4. Mario sees only Mucho Gusto data.

See:

- `docs/ARCHITECTURE.md`
- `docs/BUSINESS_METRICS.md`
- `docs/VERCEL_BUSINESS_APPS.md`
- `docs/TROUBLESHOOTING.md`
- `docs/TECHNICAL_REVIEW.md`

## Verification

Run these checks before deploy:

```bash
cd frontend
npm run build
```

```bash
node --check backend/db/index.js
node --check backend/routes/orders.js
node --check backend/routes/menu.js
```

Backend diagnostics:

```bash
cd backend
npm run check:db
npm run check:indexes
```

With the backend already running, smoke test the key API routes:

```bash
cd backend
npm run smoke
```

## Migration Note

Existing MongoDB collections may still contain legacy global unique indexes such as `name`, `phone` or `code`. Before onboarding multiple real businesses, review and replace them with compound indexes scoped by `businessId`.

## Troubleshooting

See `docs/TROUBLESHOOTING.md` for common issues such as old backend processes, wrong MongoDB database names, and missing platform tokens.

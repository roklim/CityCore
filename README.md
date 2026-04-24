## Stack

- Frontend: React + Vite
- Backend: Node.js + Express
- Database: MongoDB + Mongoose
- Hosting target: Vercel frontend, Render or similar backend

## V2 Foundation

The repository now also contains the first non-breaking scaffold for the future
V2 platform:

- `apps/web`: Next.js App Router web layer
- `apps/api`: Fastify platform API foundation
- `apps/worker`: async jobs foundation
- `packages/*`: shared platform packages

This scaffold lives alongside the current legacy app so the new architecture can
grow without breaking the existing production path.

### V2 Local Bootstrap

Start local infra:

```bash
docker compose up -d
```

Copy the environment templates:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/worker/.env.example apps/worker/.env
cp apps/web/.env.example apps/web/.env.local
```

Required V2 environment variables:

- `apps/web`
  - `NEXT_PUBLIC_API_BASE_URL`
- `apps/api`
  - `NODE_ENV`
  - `PORT`
  - `DATABASE_URL`
  - `REDIS_URL`
  - `AUTH_SECRET`
- `apps/worker`
  - `NODE_ENV`
  - `DATABASE_URL`
  - `REDIS_URL`
  - `AUTH_SECRET`
  - `WORKER_NAME`

Default local infra endpoints expected by the V2 scaffold:

- Postgres: `postgresql://postgres:postgres@localhost:5432/platform_v2?schema=public`
- Redis: `redis://localhost:6379`
- API: `http://localhost:4000`

Useful V2 commands:

```bash
npm run infra:up
npm run dev
npm run typecheck
```

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
When the route is city-based, frontend requests also send `X-City-Slug`, so the same business slug can exist in different cities over time.

## City Registry

The app now separates:

- `CityRegistry`: verified Italian municipalities imported from ISTAT/SITUAS or another trusted provider.
- `City`: active platform markets visible in the public app.

The public home `/` searches only active platform cities. The global admin can search the registry and activate a municipality before assigning businesses to it.

Useful commands:

```bash
cd backend
npm run cities:import
npm run cities:import -- path/to/istat-comuni.csv
```

`npm run cities:import` without a file verifies the bootstrap registry seed. With a CSV/JSON file it upserts municipalities into MongoDB.

## SaaS Direction

The platform is designed around:

- a shared `Business` core
- tenant-scoped products, orders, customers, settings and coupons
- feature flags for ordering, booking and rental modules
- a migration path from single pizzeria app to multi-business SaaS
- one backend/database with multiple businesses
- one frontend codebase deployed primarily as one central Vercel app, with optional dedicated projects only for clients that need separate domains or deploys

The global admin is available from `/admin`. It is a dedicated platform console, not the local counter UI. The console has explicit sections for dashboard, cities, businesses, users and settings.

Admin menus are intentionally split:

- `/admin`, `/admin/cities`, `/admin/businesses`, `/admin/users` and `/admin/settings` use the platform console menu.
- `/:citySlug/:businessSlug/admin` uses the local business operations menu.

The business owner should never see platform-only items such as city activation or tenant creation inside the local counter UI.

## Admin Roles

The platform now supports Mongo-backed business users:

- `global_admin`: platform owner, can see and manage all businesses.
- `owner`: business owner, can see only their own business.
- `admin`: business operator, can manage the assigned business.
- `staff`: limited operator, focused on orders and availability.

The legacy `.env` admin login still works as `global_admin`. Business owners are created from the `Business` section by adding owner name, email, and a temporary password.

Tenant isolation rule: for `owner`, `admin`, and `staff`, the backend uses `businessId` from the JWT and ignores conflicting frontend slugs.

Current public routing:

```txt
/                         city search
/admin                    platform dashboard
/admin/cities             city registry and active markets
/admin/businesses         tenant, owner and asset management
/admin/users              owner/admin/staff management
/admin/settings           platform settings and routing notes
/:citySlug                city home/directory
/:citySlug/:businessSlug  business public app
/:citySlug/:businessSlug/admin
/:citySlug/:businessSlug/ordine/:id
```

Legacy direct business URLs remain compatible during migration:

```txt
/:businessSlug
/:businessSlug/admin
```

Owner example:

1. Create business `Mucho Gusto`.
2. Add owner `mario@muchogusto.it` with a temporary password.
3. Mario logs in from the public manager entry or directly at `/:citySlug/:businessSlug/admin`.
4. Mario sees only Mucho Gusto data.

See:

- `docs/ARCHITECTURE.md`
- `docs/CITY_REGISTRY.md`
- `docs/TROUBLESHOOTING.md`
- `docs/AUTH_ROADMAP.md`
- `docs/V2_FOUNDATION_TASKS.md`
- `docs/V2_PLATFORM_BLUEPRINT.md`
- `docs/V2_DATA_MODEL.md`
- `docs/V2_MIGRATION_PLAN.md`
- `docs/V2_EXECUTION_ROADMAP.md`

## Verification

Run these checks before deploy:

```bash
cd frontend
npm run build
```

```bash
node --check backend/db/index.js
node --check backend/middleware/business.js
node --check backend/routes/platform.js
node --check backend/routes/businesses.js
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

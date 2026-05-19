# CityCore - Staging Runbook

## Objective

Define one concrete staging shape for the current CityCore platform.

## Service Topology

| Surface     | Provider                          | Service name                   | Source                    | Notes                                                           |
| ----------- | --------------------------------- | ------------------------------ | ------------------------- | --------------------------------------------------------------- |
| Web         | Vercel                            | `citycore-web-staging`         | `apps/web`                | Dedicated Vercel project; its production deployment is staging. |
| API         | Render or equivalent app host     | `citycore-api-staging`         | `apps/api`                | HTTP service with `/health`.                                    |
| Worker      | Render or equivalent app host     | `citycore-worker-staging`      | `apps/worker`             | Background worker, no public HTTP surface.                      |
| Database    | Managed Postgres                  | `citycore-postgres-staging`    | `packages/database`       | Runs Prisma migrations before deploy.                           |
| Cache/Queue | Managed Redis                     | `citycore-redis-staging`       | `apps/api`, `apps/worker` | Shared by API and worker.                                       |

## Branch And Environment Policy

- Staging branch: `staging`
- Web staging uses a dedicated Vercel project for `apps/web`.
- The Vercel staging project's Production environment represents staging.
- API and worker staging must never use production Postgres, Redis or auth secrets.
- Migrations run before web/API/worker deploys.

## Vercel Web Project

Create a new Vercel project named `citycore-web-staging`.

Project settings:

- Root Directory: `apps/web`
- Framework Preset: `Next.js`
- Install Command: `cd ../.. && npm ci`
- Build Command: `cd ../.. && npm run build:web`
- Output Directory: leave empty for Next.js

Tracked config:

- `apps/web/vercel.json`
- `apps/web/.env.staging.example`

Required Vercel environment variable:

```txt
NEXT_PUBLIC_API_BASE_URL=https://citycore-api-staging.onrender.com
```

## API And Worker Services

Use `render.staging.yaml` as the staging blueprint, or mirror the same settings in
another backend host.

API service:

- Name: `citycore-api-staging`
- Build: `npm ci && npm run build:api`
- Start: `npm --workspace @platform/api run start`
- Health: `/health`

Worker service:

- Name: `citycore-worker-staging`
- Build: `npm ci && npm run build:worker`
- Start: `npm --workspace @platform/worker run start`

Required API env:

```txt
NODE_ENV=production
DATABASE_URL=<staging-postgres-url>
REDIS_URL=<staging-redis-url>
AUTH_SECRET=<staging-auth-secret>
```

Required worker env:

```txt
NODE_ENV=production
DATABASE_URL=<staging-postgres-url>
REDIS_URL=<staging-redis-url>
AUTH_SECRET=<staging-auth-secret>
WORKER_NAME=citycore-worker-staging
```

## GitHub Secrets

The manual staging workflow `.github/workflows/staging-deploy.yml` expects:

```txt
STAGING_DATABASE_URL
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_WEB_STAGING_PROJECT_ID
RENDER_API_STAGING_DEPLOY_HOOK_URL
RENDER_WORKER_STAGING_DEPLOY_HOOK_URL
```

The Render deploy hook secrets are optional when deploying API/worker manually.

## Deploy Flow

1. Push the branch and wait for `Platform Quality` CI to pass.
2. Confirm staging Postgres and Redis are available.
3. Run `Staging Deploy` from GitHub Actions.
4. The workflow runs `npm run check`.
5. The workflow applies Prisma migrations to staging.
6. The workflow deploys the web project to Vercel.
7. The workflow triggers backend deploy hooks if configured.

## Manual Migration Fallback

Use this only from a trusted machine with staging credentials:

```bash
DATABASE_URL="<staging-postgres-url>" npx prisma migrate deploy --schema packages/database/prisma/schema.prisma
```

Do not run destructive reset commands against staging.

## Post Deploy Checks

Web:

```txt
https://citycore-web-staging.vercel.app
https://citycore-web-staging.vercel.app/api/health
```

API:

```txt
https://citycore-api-staging.onrender.com/health
https://citycore-api-staging.onrender.com/api/v2
```

Expected result:

- web health returns `status: ok`
- API health returns `status: ok`
- API reports database, Redis and auth as configured

## Admin Seed

If staging is empty and you need a real platform login without using the
bootstrap flow manually, create a global admin directly against the target
database:

```bash
DATABASE_URL="<staging-postgres-url>" npm run seed:global-admin
```

Default credentials:

```txt
email: global-admin@citycore.local
password: CityCoreAdmin123!
```

Override them with:

```txt
GLOBAL_ADMIN_EMAIL
GLOBAL_ADMIN_PASSWORD
GLOBAL_ADMIN_NAME
GLOBAL_ADMIN_PHONE
```

## Rollback

- Vercel: promote the previous good deployment in the staging project.
- API/worker: rollback to the previous backend host deployment.
- Database: do not rollback destructively; add a forward migration.

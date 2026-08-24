# CityCore - Staging Runbook

## Objective

Define one concrete staging shape for the current CityCore platform.

## Service Topology

| Surface  | Provider                      | Service name                       | Source              | Notes                                                           |
| -------- | ----------------------------- | ---------------------------------- | ------------------- | --------------------------------------------------------------- |
| Web      | Vercel                        | `citycore-web-staging`             | `apps/web`          | Dedicated Vercel project; its production deployment is staging. |
| API      | Render or equivalent app host | `citycore-api-thesis-staging`      | `apps/api`          | Dedicated HTTP service with `/health`.                          |
| Database | Managed Postgres              | `citycore-postgres-thesis-staging` | `packages/database` | Dedicated database; runs Prisma migrations before deploy.       |
| Cache    | Managed Redis                 | `citycore-redis-thesis-staging`    | `apps/api`          | Dedicated readiness dependency; distributed use is future work. |

## Branch And Environment Policy

- The workflow definition is always dispatched from `main`, but it checks out an explicitly supplied,
  reviewed 40-character commit SHA before that commit is merged.
- Web staging uses a dedicated Vercel project for `apps/web`.
- The Vercel staging project's Production environment represents staging.
- API staging must never use production Postgres, Redis or auth secrets.
- Migrations run before web/API deploys.

Bootstrap note: this pre-merge flow becomes available only after the hardened workflow itself exists
on `main`. For its first adoption, land the workflow separately or keep the staging workflow disabled
and use the protected Vercel preview plus the local E2E evidence. Never dispatch the older workflow
with staging secrets.

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

Required Vercel environment variables:

```txt
NEXT_PUBLIC_API_BASE_URL=https://citycore-api-thesis-staging.onrender.com
NEXT_PUBLIC_SITE_URL=https://citycore-web-staging.vercel.app
CITYCORE_ENABLE_EDITORIAL_FALLBACK=false
```

## API Service

Use `render.staging.yaml` to provision a service that is separate from the API used by the live web,
or mirror the same settings in another backend host. `render.yaml` remains the manifest for the
currently active API and must not be reused as the staging resource.

API service:

- Name: `citycore-api-thesis-staging`
- Build: `npm ci --include=dev && npm run build:api`
- Start: `npm --workspace @platform/api run start`
- Health: `/health`

The staging service has automatic deploys disabled. The reviewed SHA is supplied to its Render
deploy hook by the GitHub workflow. The workflow migrates first; the API `prestart` repeats the
idempotent migration check as a defensive startup guard.

Required API env:

```txt
NODE_ENV=production
DATABASE_URL=<staging-postgres-url>
REDIS_URL=<staging-redis-url>
AUTH_SECRET=<staging-auth-secret>
```

## GitHub Environment, Secrets And Variables

Create a GitHub Actions environment named `staging` and scope these secrets to that environment:

```txt
STAGING_DATABASE_URL
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_WEB_STAGING_PROJECT_ID
RENDER_API_STAGING_DEPLOY_HOOK_URL
```

The same environment requires these non-secret variables:

```txt
RENDER_API_STAGING_SERVICE_ID
STAGING_DATABASE_HOST
STAGING_DATABASE_NAME
```

The Render deploy hook secret is required when `deploy_backend_hooks` is selected. Leave that input
disabled only when deploying the API manually through the provider.

Keep all secrets scoped to staging resources. The workflow verifies that the linked Vercel project
is named `citycore-web-staging`, that the Render hook contains the configured staging service ID,
and that the database URL host and database name match the configured staging identity. These checks
reduce target-selection mistakes but do not replace provider-side access controls.

## Deploy Flow

1. Push the branch, open its pull request toward `main` and wait for both `Platform Quality` and the
   Vercel preview on that exact commit to pass.
2. Finish the code review, mark the pull request ready and copy its full 40-character head SHA.
3. Confirm the dedicated staging Postgres, Redis, Render service and Vercel project are available.
4. Run `Staging Deploy` from GitHub Actions using `main` as the workflow ref. Supply the reviewed SHA,
   choose at least one deploy target and type `citycore-staging` in the confirmation input.
5. The workflow verifies that the SHA is the head of the open, non-draft pull request and that all
   GitHub Quality Gate runs plus the Vercel preview status are successful. It then checks out the exact
   SHA and validates the required credential presence and configured provider target identities before
   migrating or deploying anything.
6. The workflow runs `npm run check` against the reviewed SHA.
7. The workflow applies Prisma migrations to the dedicated staging database.
8. The workflow deploys the staging web project and triggers the staging backend hook as selected.
9. Complete the post-deploy and thesis-demo checks on staging.
10. Merge only that verified SHA into `main`, then monitor the live Vercel and Render deployments.

If the preflight reports a missing secret, the workflow stops before any database mutation or
provider deploy. Staging deploys are serialized, and the Render hook requests the exact reviewed
commit selected by the workflow. After the hook returns, monitor Render until that deployment is live;
an accepted hook is not the final health gate. Do not merge first: the live Vercel project currently
deploys `main` automatically.

## Manual Migration Fallback

Use this only from a trusted machine with staging credentials. The CityCore wrapper is mandatory
because it runs the legacy demo-data preflight:

```bash
NODE_ENV=production DATABASE_URL="<staging-postgres-url>" npm run db:migrate:deploy
```

Do not call `prisma migrate deploy` directly and do not run destructive reset commands against
staging. If the preflight blocks the deploy, follow `LEGACY_DEMO_DATA_MIGRATIONS.md`.

## Post Deploy Checks

Web:

```txt
https://citycore-web-staging.vercel.app
https://citycore-web-staging.vercel.app/api/health
```

API:

```txt
https://citycore-api-thesis-staging.onrender.com/health
https://citycore-api-thesis-staging.onrender.com/api/v2
```

Expected result:

- web health returns `status: ok`
- API health returns `status: ok`
- API reports database, Redis and auth as configured

All dedicated URLs must be provisioned and verified before using staging for the thesis. A documented
URL that returns `DEPLOYMENT_NOT_FOUND` is a failed staging gate, not a valid fallback. The existing
`citycore-api-staging.onrender.com` endpoint is used by the live `citycore-web` project despite its
name, so it is not an isolated staging backend.

## Admin Seed

If staging is empty and you need a real platform login without using the
bootstrap flow manually, create a global admin directly against the target
database:

```bash
DATABASE_URL="<staging-postgres-url>" npm run seed:global-admin
```

Provide the required seed password explicitly and optionally override the default email:

```txt
GLOBAL_ADMIN_EMAIL
GLOBAL_ADMIN_PASSWORD
GLOBAL_ADMIN_NAME
GLOBAL_ADMIN_PHONE
```

## Rollback

- Vercel: promote the previous good deployment in the staging project.
- API: rollback to the previous backend host deployment.
- Database: do not rollback destructively; add a forward migration.

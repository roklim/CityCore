# Troubleshooting

## Web Does Not Load Locally

Symptom:

```txt
http://localhost:3000 does not respond
```

Checks:

```powershell
docker compose ps
npm run dev
```

Expected local services:

- web: `http://localhost:3000`
- api: `http://localhost:4000/health`
- postgres: `localhost:5432`
- redis: `localhost:6379`

## API Health Fails

Symptom:

```txt
GET /health returns 500 or does not respond
```

Checks:

```powershell
Invoke-RestMethod http://localhost:4000/health
docker compose ps
```

If Postgres or Redis are missing:

```powershell
npm run infra:up
```

## Database Schema Is Missing

Symptom:

- API starts but public queries fail
- Prisma reports missing tables

Fix:

```powershell
npm run db:migrate:deploy
npm run db:generate
```

If you need demo data:

```powershell
npm run seed:ordering
npm run seed:global-admin
```

## Wrong API Base URL

The web must point to the active API surface:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

For staging or production, use the active Render URL of `apps/api`.

## Admin Login Does Not Work

Checks:

1. Open `/admin/login`
2. Verify the API health endpoint
3. Verify the database contains the seeded admin

Seed if needed:

```powershell
npm run seed:global-admin
```

## Ordering Surface Looks Empty

If a business page loads but the ordering area is empty:

1. verify the business uses the ordering module
2. verify menu items exist in the active database
3. verify the public API responds for that city and business

If the environment is empty, reseed:

```powershell
npm run seed:ordering
```

## Staging Checks

Minimum checks after a deploy:

```txt
https://citycore-api-staging.onrender.com/health
https://citycore-api-staging.onrender.com/api/v2/public/businesses?limit=6
https://<web-domain>/
https://<web-domain>/admin/login
```

Expected result:

- API health returns `status: ok`
- public businesses endpoint responds
- web root loads
- admin login loads

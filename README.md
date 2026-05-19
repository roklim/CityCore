## CityCore

CityCore e una piattaforma modulare `city-first` per costruire ecosistemi
digitali locali.

Ogni citta ha una propria identita pubblica. Dentro ogni citta, ogni business
ha il proprio spazio, il proprio pannello e i propri moduli attivabili.

La gerarchia canonica del prodotto e:

1. `Platform`
2. `City`
3. `Business`
4. `Module`
5. `Page`
6. `Section`

## Cosa Resta Nel Repo

- `platform core`
- `city layer`
- `business layer`
- `auth`, `access grants`, ruoli e permessi
- `template catalog` e `builder-guided scaffold`
- superfici pubbliche city-first generiche
- shell admin generiche

Il repo rappresenta solo il core city-first della piattaforma.

## Shape Del Repo

- `apps/web`: Next.js App Router per home piattaforma, pagine citta, pagine business e shell admin
- `apps/api`: Fastify + Prisma per auth, registry citta, businesses, templates, access grants e surface pubblica
- `apps/worker`: scaffold per job asincroni futuri di piattaforma
- `packages/*`: moduli condivisi (`config`, `database`, `domain`, `permissions`, `shared`, `templates`, `ui`)
- `docs/*`: documentazione canonica di prodotto, architettura e workflow
- `tools/*`: script operativi coerenti con il core piattaforma

## Routing Corrente

Superfici pubbliche:

- `/`
- `/:citySlug`
- `/:citySlug/:businessSlug`

Superfici admin:

- `/admin/login`
- `/admin`
- `/select-access`
- `/:citySlug/:businessSlug/admin`

API principali:

- `/health`
- `/api/v2`
- `/api/v2/auth/*`
- `/api/v2/platform-core/*`
- `/api/v2/public/*`

## Bootstrap Locale

Avvia l'infrastruttura:

```bash
npm run infra:up
```

Copia gli env:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/worker/.env.example apps/worker/.env
cp apps/web/.env.example apps/web/.env.local
```

Variabili minime:

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

Comandi utili:

```bash
npm run dev
npm run typecheck
npm run lint
npm run format:check
npm run db:validate
npm run db:migrate:status
npm run db:migrate:deploy
npm run db:generate
```

## Documenti Canonici

- `AGENTS.md`
- `docs/MASTER_PRODUCT_MAP.md`
- `docs/ARCHITECTURE.md`
- `docs/V2_PLATFORM_BLUEPRINT.md`
- `docs/REPO_WORKFLOW.md`
- `docs/CITY_REGISTRY.md`
- `docs/V2_STAGING_RUNBOOK.md`

## CityCore

Repository monorepo V2:

- `apps/web`: Next.js App Router pubblico + shell admin
- `apps/api`: Fastify + Prisma + Postgres
- `apps/worker`: job asincroni
- `packages/*`: moduli condivisi

Nota di prodotto:

- il nome del prodotto e ora `CityCore`
- `CityCore` va trattato come piattaforma cittadina per scoprire attivita locali e come gestionale semplice per piccole imprese
- il naming tecnico deve convergere progressivamente su `citycore-*`

Il repo attivo contiene solo la piattaforma CityCore corrente.

Il manifest Render primario del repo e ora [render.yaml](c:/Users/marco/Desktop/apppizzeria/render.yaml:1), allineato alla V2.

### Stato

La V2 oggi copre:

- foundation monorepo
- auth V2 iniziale
- platform core iniziale: `templates`, `cities`, `businesses`, `access-grants`
- surface pubblica read-only V2 per `cities` e `businesses`
- shell web V2 separate: pubblico e admin

### Bootstrap Locale

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

Endpoint locali attesi:

- Postgres: `postgresql://postgres:postgres@localhost:5432/platform_v2?schema=public`
- Redis: `redis://localhost:6379`
- API: `http://localhost:4000`
- Web: `http://localhost:3000`

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

### Verifica

Gate principali:

```bash
npm --workspace @platform/api run typecheck
npm --workspace @platform/api run build
npm --workspace @platform/web run typecheck
npm run lint
npm run format:check
```

Nota di ambiente:

- il build web non dipende dal fetch dei font Google
- eventuali errori residui di `build:web` o dei tool Prisma vanno letti come limiti di spawn/rete dell'ambiente locale

### Routing V2

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

### Deploy

Percorso corrente:

- web: progetto Vercel dedicato con root `apps/web`
- api: servizio dedicato per `apps/api`
- worker: worker dedicato per `apps/worker`

Il deploy web va configurato come progetto separato puntato a `apps/web`.

Convenzione consigliata:

- brand prodotto: `CityCore`
- repo/folder tecnico: `citycore`
- progetto Vercel web: `citycore-web`
- servizi Render: `citycore-api`, `citycore-worker`

Nota di riallineamento:

- il file locale `.vercel/project.json` puo ancora puntare a un progetto storico
- il rename finale su Vercel va completato fuori dal repo rilinkando il workspace al progetto `CityCore` corretto

### Documenti Guida

- `AGENTS.md`
- `docs/REPO_WORKFLOW.md`
- `docs/V2_EXECUTION_ROADMAP.md`
- `docs/V2_PLATFORM_BLUEPRINT.md`
- `docs/V2_DATA_MODEL.md`
- `docs/V2_FOUNDATION_TASKS.md`
- `docs/V2_STAGING_RUNBOOK.md`
- `docs/ARCHITECTURE.md`
- `docs/CITY_REGISTRY.md`
- `docs/TROUBLESHOOTING.md`

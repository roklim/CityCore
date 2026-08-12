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

API principali, mantenute sotto un namespace HTTP versionato:

- `/health`
- `/api/v2`
- `/api/v2/auth/*`
- `/api/v2/platform-core/*`
- `/api/v2/public/*`

## Local Development

Requisiti: Node.js `>=20.9`, npm `>=10`, Docker Desktop avviato (PostgreSQL e
Redis). Non sono necessari segreti nel repository: partire sempre dai file
`.env.example` e usare valori locali solo sul proprio computer.

1. Installa le dipendenze da una working tree pulita:

```bash
npm ci
```

2. Copia e configura gli environment template:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

Variabili minime:

- `apps/web/.env.local`: `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_SITE_URL`
- `apps/api/.env`: `NODE_ENV`, `PORT`, `DATABASE_URL`, `REDIS_URL`, `AUTH_SECRET`;
  in produzione anche `AUTH_BOOTSTRAP_SECRET`, `WEB_ORIGINS` e
  `TRUST_PROXY_HOPS`

3. Avvia database e cache:

```bash
npm run infra:up
```

4. Applica le migrazioni e genera Prisma Client:

```bash
npm run db:migrate:deploy
npm run db:generate
```

5. Facoltativamente, crea il global admin di sviluppo. La password non ha un
   default e deve essere fornita dall'ambiente:

```bash
GLOBAL_ADMIN_PASSWORD="scegli-una-password-locale" npm run seed:global-admin
```

Per caricare il dataset dimostrativo idempotente della Fase 3 usa una password
solo locale (non viene stampata):

```bash
DEMO_SEED_PASSWORD="scegli-una-password-demo" npm run db:seed
```

Test API:

```bash
npm --workspace @platform/api run test
npm --workspace @platform/api run test:coverage
DATABASE_URL_TEST="postgresql://.../citycore_test" npm --workspace @platform/api run test:integration
```

I test d'integrazione richiedono esplicitamente un database il cui URL contiene
`test` e rifiutano l'URL locale standard. Non usare mai il database di sviluppo
per test distruttivi.

Per predisporre il database test locale con Docker:

```bash
npm run db:test:up
DATABASE_URL_TEST="postgresql://.../citycore_test" npm run db:test:migrate
DATABASE_URL_TEST="postgresql://.../citycore_test" npm run test:integration
npm run db:test:down
```

I runner rifiutano URL senza `test`, uguali a `DATABASE_URL` o privi della
variabile esplicita. Il database di sviluppo non viene mai resettato dai test.

### Verifica pulita su Windows

Se il runtime locale mantiene occupato `query_engine-windows.dll.node`, esegui
le build in una copia temporanea del repository, senza `.git`, `node_modules`
o artefatti. Dopo `npm ci`, la copia consente `npm run db:generate`, le build e
i test senza interferire con il server locale. La copia usa una directory
temporanea del sistema e non deve essere riutilizzata come working tree.

6. Avvia API e frontend:

```bash
npm run dev
```

In alternativa usa `npm run dev:api` e `npm run dev:web` in terminali
separati. La console e disponibile da `/admin`; il bootstrap del primo admin
e disponibile da `/admin/login` quando il database non contiene grant
`global_admin`.

Problemi ambientali noti: `npm ci` e necessario quando `npm ls` segnala
dipendenze estranee o workspace invalidi; Docker Desktop deve essere attivo
prima dei comandi Prisma che richiedono il database. I controlli disponibili
sono elencati sotto e la procedura di staging e in `docs/STAGING_RUNBOOK.md`.

## Comandi Utili

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
- `docs/PLATFORM_BLUEPRINT.md`
- `docs/REPO_WORKFLOW.md`
- `docs/CITY_REGISTRY.md`
- `docs/ADMIN_ONBOARDING_FLOW.md`
- `docs/STAGING_RUNBOOK.md`

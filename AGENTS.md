# AGENTS

## Obiettivo

Ridurre il tempo di orientamento nel repo e rendere prevedibili i punti in cui
leggere, modificare e validare il codice.

Il prodotto va letto come piattaforma modulare city-first, non come verticale
transazionale specializzato.

## Mappa Rapida

- `apps/web`: Next.js App Router, superfici pubbliche e shell admin
  - `src/app`: routing
  - `src/components`: componenti UI
  - `src/lib`: helper lato web
- `apps/api`: Fastify + Prisma
  - `src/app.ts`: bootstrap server
  - `src/platform-core.ts`: entrypoint del core di piattaforma
  - `src/platform-core/routes.ts`: route group admin del core
  - `src/platform-core/routes-public.ts`: route pubbliche city-first
  - `src/platform-core/*`: config, helper, mapper, access filters, citta, business, access grants e registri
- `packages/*`: moduli condivisi (`config`, `database`, `domain`, `permissions`, `shared`, `templates`, `ui`)
- `docs`: documentazione durevole, blueprint e workflow
- `tools`: script operativi coerenti con il core
- `.vscode`: impostazioni minime per usare TypeScript locale e tooling coerente
- root: manifest e orchestrazione (`package.json`, `compose.yml`, `render.yaml`, `tsconfig.json`, `tsconfig.base.json`)

## Modello Prodotto

Gerarchia canonica:

1. `Platform`
2. `City`
3. `Business`
4. `Module`
5. `Page`
6. `Section`

Principio di repo:

- `platform core` e `city/business surfaces` restano il centro del sistema
- i moduli sono scaffold standardizzati, non feature custom per singolo cliente
- la logica di business specifica non deve contaminare il core se non viene promossa a modulo ufficiale

Documenti canonici:

- `README.md`
- `docs/MASTER_PRODUCT_MAP.md`
- `docs/ARCHITECTURE.md`
- `docs/PLATFORM_BLUEPRINT.md`
- `docs/REPO_WORKFLOW.md`

## Comandi Canonici

Bootstrap locale:

```bash
npm run infra:up
```

Avvio:

```bash
npm run dev
npm run dev:web
npm run dev:api
```

Controlli:

```bash
npm run lint
npm run typecheck
npm run format:check
npm run build
```

Database:

```bash
npm run db:validate
npm run db:migrate:status
npm run db:migrate:deploy
npm run db:generate
```

## Env Minimi

- `apps/web/.env.local`
  - `NEXT_PUBLIC_API_BASE_URL`
- `apps/api/.env`
  - `NODE_ENV`
  - `PORT`
  - `DATABASE_URL`
  - `REDIS_URL`
  - `AUTH_SECRET`
## Convenzioni Di Repo

- Il codice sorgente va solo in `apps/*` e `packages/*`.
- La documentazione che deve restare nel tempo va solo in `docs/`.
- Gli script operativi e i seed vanno in `tools/`.
- Gli artefatti temporanei vanno in `.tmp/` oppure come `tmp-*` al root e devono restare ignorati da Git.
- I file al root devono essere pochi e infrastrutturali.
- `tsconfig.json` al root e intenzionalmente vuoto: serve come entrypoint stabile per editor e tooling.
- `tsconfig.base.json` contiene le opzioni condivise dai workspace.

## Flusso Di Lavoro Consigliato

1. Controllare sempre `git status --short` prima di toccare file.
2. Leggere il minimo set di file necessario nel workspace interessato.
3. Validare in modo mirato il workspace toccato prima dei check globali.
4. Aggiornare i documenti canonici se cambia una convenzione strutturale o il modello del prodotto.

## Note Pratiche

- `apps/web` puo contenere WIP di UI: evitare refactor laterali non richiesti.
- `apps/api/src/platform-core.ts` deve restare solo un entrypoint: per nuove feature aggiungere o estendere moduli in `apps/api/src/platform-core/*`.
- Se introduci nuove superfici pubbliche, mantieni il routing city-first.
- I manifest di deploy attivi sono `render.yaml` per API e il progetto Vercel con root `apps/web`.

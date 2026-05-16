# AGENTS

## Obiettivo

Ridurre il tempo di orientamento nel repo e rendere prevedibili i punti in cui leggere, modificare e validare il codice.

## Mappa Rapida

- `apps/web`: Next.js App Router, superfici pubbliche e shell admin
  - `src/app`: routing
  - `src/components`: componenti UI
  - `src/lib`: helper lato web
- `apps/api`: Fastify + Prisma
  - `src/app.ts`: bootstrap server
  - `src/platform-core.ts`: route layer del core di piattaforma
  - `src/platform-core/*`: config statica e schemi del core
  - `src/ordering.ts`: route layer ordering
  - `src/ordering/*`: route modules, helper condivisi, business lookup, pickup availability e order service
- `apps/worker`: worker asincrono
- `packages/*`: moduli condivisi (`config`, `database`, `domain`, `permissions`, `shared`, `templates`, `ui`)
- `docs`: documentazione durevole, blueprint, runbook, roadmap
- `tools`: script operativi, seed e smoke test
- root: manifest e orchestrazione (`package.json`, `compose.yml`, `render.yaml`, `tsconfig.base.json`)

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
npm run dev:worker
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
- `apps/worker/.env`
  - `NODE_ENV`
  - `DATABASE_URL`
  - `REDIS_URL`
  - `AUTH_SECRET`
  - `WORKER_NAME`

## Convenzioni di Repo

- Il codice sorgente va solo in `apps/*` e `packages/*`.
- La documentazione che deve restare nel tempo va solo in `docs/`.
- Gli script operativi e i seed vanno in `tools/`.
- Gli artefatti temporanei vanno in `.tmp/` oppure come `tmp-*` al root e devono restare ignorati da Git.
- I file al root devono essere pochi e infrastrutturali. Se un nuovo file non e un manifest, una config o un entrypoint, probabilmente non dovrebbe stare al root.

## Flusso di Lavoro Consigliato

1. Controllare sempre `git status --short` prima di toccare file, per distinguere WIP utente e modifiche nuove.
2. Leggere il minimo set di file necessario nel workspace interessato.
3. Validare in modo mirato il workspace toccato prima dei check globali.
4. Aggiornare `README.md` o `docs/REPO_WORKFLOW.md` se cambia una convenzione strutturale.

## Note Pratiche

- In questo momento `apps/web` contiene spesso WIP di UI: evitare refactor laterali non richiesti.
- `apps/api/src/platform-core.ts` e `apps/api/src/ordering.ts` sono file grandi: per nuove feature conviene estrarre moduli invece di allargarli ancora.
- I manifest di deploy attivi sono `render.yaml` per API/worker e il progetto Vercel con root `apps/web`.

# Implementation log — Fase 1

## Fase 3B — 2026-08-05

- Aggiunto `compose.test.yml` con PostgreSQL isolato `citycore_test` su porta
  dedicata e runner protetti per migrate/reset/test.
- Le guardie richiedono `NODE_ENV=test`, `DATABASE_URL_TEST`, URL contenente
  `test` e diverso da sviluppo.
- Aggiunti tre test d'integrazione Fastify inject: categorie/albero, categorie
  atomiche e orari, publish/servizi/inquiry con isolamento grant.
- Corretto `local_admin`: ora possiede `businesses.manage`, necessario per
  modificare e pubblicare il proprio business nel flusso MVP.
- Coverage unit: statement 82.69%, branch 76.74%, function 86.66%, line 83.5%.

## Fase 3 — 2026-08-05

- Aggiunti `tools/seed-demo.mjs` e `npm run db:seed`: dataset idempotente con
  tre city, cinque business, categorie, servizi, orari e inquiry demo.
- Aggiunti Vitest e coverage V8 al workspace API; cinque test unitari passano.
- Estratti `createInquiryRateLimiter`, albero categorie e transizioni inquiry
  in funzioni pure testabili.
- `DATABASE_URL_TEST` è obbligatoria per i test d'integrazione e deve indicare
  esplicitamente un database di test; il database locale standard è escluso.
- Residuo: la suite di integrazione completa richiede il provisioning del DB
  PostgreSQL test isolato; non è stato usato il DB di sviluppo per tale scopo.

## Fase 2 — 2026-08-05

- Ambiente: `npm ci`, `npm ls`, Prisma validate/generate e migrate status
  superati; PostgreSQL locale sano.
- Riutilizzati `CityCategory`, `BusinessCategoryAssignment`, `Business`,
  `PublicationStatus`, `AccessGrant` e `AuditLog`.
- Aggiunti servizi, giorni/intervalli di apertura e inquiry; migrazione
  `20260805001838_phase2_business_mvp_core` applicata localmente.
- Aggiunte API scoped per categorie, assegnazioni, servizi, orari,
  publish-readiness/pubblicazione e inquiry pubbliche/inbox.
- Decisioni: gerarchia categorie limitata a due livelli; gli orari non
  supportano oltre mezzanotte; `Business.status=active` e pubblicazione.
- Residuo: seed demo completo e test Vitest/integration non sono ancora
  completati; non iniziare ricerca o UI admin prima della relativa fase.

## Sessione

Data: 2026-08-05. Branch: `main`. Stato iniziale: working tree pulita; nessun
file locale preesistente modificato o rimosso.

## Analisi e controlli eseguiti

- Esaminati AGENTS, README, manifest npm/workspaces, documenti tecnici,
  schema e migrazioni Prisma, script, API, web, package condivisi, Compose,
  Render, GitHub Actions e file `.env.example`.
- Eseguiti `npm run lint`, `npm run format:check` e `npm run typecheck`:
  superati.
- Eseguito `npm run db:validate`: non eseguito dal CLI per `spawnSync ...
EPERM`; il wrapper identifica il blocco come ambientale.
- Verificato Docker: daemon non disponibile. Non eseguiti migrazioni, seed,
  health runtime o connessione DB.
- Non eseguiti `db:generate` e build: i comandi scrivono negli artefatti
  generati (`node_modules`, `.next`, `dist`), esclusi dalla richiesta.
- Non esiste uno script test ne file test/spec nel codice sorgente.

## Correzioni minime effettuate

- Allineati ruoli condivisi a Prisma/API: rimosso `customer`, non supportato
  dal modello dati corrente.
- La selezione accesso web non serializza piu il JWT nel DOM; l'action usa il
  cookie di sessione `httpOnly` sul server.
- Il seed global admin ora richiede la password in environment e non la
  ristampa; il runbook non contiene piu credenziali di default.
- Aggiunta documentazione dello stato reale, MVP, architettura e avvio locale.

## File modificati

- `README.md`
- `apps/web/src/app/admin/actions.ts`
- `apps/web/src/app/select-access/page.tsx`
- `apps/web/src/app/select-access/access-selector.tsx`
- `packages/domain/src/roles.ts`
- `packages/permissions/src/index.ts`
- `tools/seed-global-admin.mjs`
- `docs/STAGING_RUNBOOK.md`
- Quattro documenti di Fase 1 in `docs/`.

## Errori residui e primo passo successivo

L'installazione corrente ha pacchetti estranei/workspace invalidi secondo
`npm ls`; eseguire `npm ci` in un ambiente con accesso ai registry, avviare
Docker Desktop, poi ripetere `db:validate`, `db:migrate:status`, `db:generate`,
build e verifica runtime. Il primo lavoro Fase 2 e implementare il modello e
flusso MVP per categorie, servizi, orari e pubblicazione, non il builder o IA.

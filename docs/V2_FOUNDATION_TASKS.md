# Platform V2 - Foundation Tasks

## Obiettivo

Trasformare la `Milestone 1 - Foundation` in task tecnici pronti da eseguire.

Questa checklist parte dallo stato reale del repo:

- scaffold workspace root presente
- `apps/web` creato
- `apps/api` creato
- `apps/worker` creato
- `packages/*` iniziali creati

Quindi la Foundation non parte da zero: una parte e gia bootstrapata, ma non e
ancora completa.

## Decisioni Tecniche Bloccate

Per evitare continui ripensamenti, la Foundation lavora con queste decisioni gia
fissate:

- web: `Next.js App Router`
- api: `Fastify + TypeScript`
- worker: `Node + TypeScript`
- workspace: `npm workspaces`
- database core: `Postgres`
- cache/queue: `Redis`
- ORM raccomandato: `Prisma`

## Stato Attuale

### Gia fatto

- root workspace in [package.json](/c:/Users/marco/Desktop/apppizzeria/package.json)
- config TS base in [tsconfig.base.json](/c:/Users/marco/Desktop/apppizzeria/tsconfig.base.json)
- dipendenze root installate e `package-lock.json` root presente
- scaffold web in [apps/web](/c:/Users/marco/Desktop/apppizzeria/apps/web)
- scaffold api in [apps/api](/c:/Users/marco/Desktop/apppizzeria/apps/api)
- scaffold worker in [apps/worker](/c:/Users/marco/Desktop/apppizzeria/apps/worker)
- package database condiviso in [packages/database](/c:/Users/marco/Desktop/apppizzeria/packages/database)
- schema Prisma foundation valido
- migration Prisma iniziale `20260425121828_init_foundation` creata e applicata
- Prisma Client generato dopo la migration iniziale
- compose locale Postgres/Redis in [compose.yml](/c:/Users/marco/Desktop/apppizzeria/compose.yml)
- Postgres e Redis verificati healthy in locale dopo installazione Docker
- `.env.example` V2 presenti per web, api e worker
- healthcheck e boot logs V2 presenti
- build e typecheck root verificati
- lint e format check root per V2 presenti e verificati
- workflow GitHub Actions V2 Foundation presente
- README con bootstrap locale V2
- pacchetti condivisi iniziali in [packages](/c:/Users/marco/Desktop/apppizzeria/packages)
- docs V2 strategiche gia scritte

### Non ancora fatto

- staging deploy shape
- verification checklist automatizzata

## Sequenza Esecutiva

L'ordine corretto e questo:

1. stabilizzare workspace root
2. aggiungere package database
3. aggiungere local infra
4. completare env model
5. aggiungere quality tooling
6. aggiungere CI minima
7. definire staging bootstrap

## Task Operativi

### F1-01 - Installazione Workspace Root

Status: completed

**Obiettivo**  
Rendere il monorepo V2 realmente installabile.

**Da fare**

- eseguire `npm install` alla root
- generare `package-lock.json` root
- verificare che i workspace siano risolti correttamente

**File coinvolti**

- [package.json](/c:/Users/marco/Desktop/apppizzeria/package.json)
- nuovo `package-lock.json` root

**Definition of done**

- `npm install` finisce senza errori
- i package `apps/*` e `packages/*` vengono risolti come workspace

### F1-02 - Normalizzare Script Root

Status: completed

**Obiettivo**  
Avere comandi root minimi per sviluppo e build.

**Da fare**

- aggiungere script `dev`, `build`, `check`, `typecheck`
- aggiungere script root per lanciare insieme `web`, `api`, `worker`
- scegliere se usare `npm-run-all`, `concurrently` o approccio equivalente

**File coinvolti**

- [package.json](/c:/Users/marco/Desktop/apppizzeria/package.json)

**Definition of done**

- esiste un comando root leggibile per development
- esiste un comando root leggibile per typecheck

### F1-03 - Aggiungere Package Database

Status: completed

**Obiettivo**  
Creare il cuore dati della V2.

**Da fare**

- creare `packages/database`
- aggiungere `prisma/schema.prisma`
- aggiungere client Prisma lazy/singleton
- aggiungere exports condivisi

**Struttura target**

```txt
packages/database/
  package.json
  tsconfig.json
  prisma/schema.prisma
  src/client.ts
  src/index.ts
```

**Definition of done**

- il package database esiste
- Prisma e configurato
- `DATABASE_URL` e usata dal package database

### F1-04 - Primo Schema Prisma Foundation

Status: completed

**Obiettivo**  
Portare nel DB il minimo indispensabile per iniziare la V2.

**Tabelle da creare adesso**

- `users`
- `access_grants`
- `city_registry`
- `cities`
- `business_templates`
- `businesses`
- `business_modules`
- `audit_logs`

**Riferimento**

- [V2_DATA_MODEL.md](/c:/Users/marco/Desktop/apppizzeria/docs/V2_DATA_MODEL.md)

**Definition of done**

- schema Prisma compilabile
- prima migration generabile
- naming coerente con il data model V2

**Verifica 2026-04-25**

- `prisma validate` passa con `DATABASE_URL` locale
- Migration creata in `packages/database/prisma/migrations/20260425121828_init_foundation`
- Migration applicata a Postgres locale con `prisma migrate deploy`
- `prisma migrate status` conferma database aggiornato
- Prisma Client generato con `prisma generate`

### F1-05 - Docker Compose Locale

Status: completed

**Obiettivo**  
Avviare Postgres e Redis in locale in modo standard.

**Da fare**

- creare `docker-compose.yml` o `compose.yml` root
- aggiungere servizio `postgres`
- aggiungere servizio `redis`
- definire porte, volume e credenziali locali coerenti con `.env.example`

**File coinvolti**

- nuovo `docker-compose.yml`
- [apps/api/.env.example](/c:/Users/marco/Desktop/apppizzeria/apps/api/.env.example)
- [apps/worker/.env.example](/c:/Users/marco/Desktop/apppizzeria/apps/worker/.env.example)
- [apps/web/.env.example](/c:/Users/marco/Desktop/apppizzeria/apps/web/.env.example)

**Definition of done**

- `docker compose up -d` avvia Postgres e Redis
- le env locali puntano ai container giusti

**Verifica 2026-04-25**

- `docker compose up -d` eseguito dopo installazione Docker
- `platform-v2-postgres` healthy su `5432`
- `platform-v2-redis` healthy su `6379`

### F1-06 - Env Strategy Completa

Status: completed

**Obiettivo**  
Separare bene configurazione local, staging e production.

**Da fare**

- definire env obbligatorie web/api/worker
- creare `.env.example` coerenti
- documentare le env richieste
- evitare segreti hardcoded

**Env minime**

- `NEXT_PUBLIC_API_BASE_URL`
- `PORT`
- `DATABASE_URL`
- `REDIS_URL`
- `AUTH_SECRET`

**Definition of done**

- ogni app ha il suo `.env.example`
- non ci sono valori sensibili hardcoded
- le env richieste sono documentate

### F1-07 - Healthcheck e Boot Logs

Status: completed

**Obiettivo**  
Avere segnali minimi di vita del sistema.

**Da fare**

- lasciare e rifinire health web
- lasciare e rifinire health api
- aggiungere boot log leggibili
- definire convenzione minima log

**File coinvolti**

- [apps/web/src/app/api/health/route.ts](/c:/Users/marco/Desktop/apppizzeria/apps/web/src/app/api/health/route.ts)
- [apps/api/src/app.ts](/c:/Users/marco/Desktop/apppizzeria/apps/api/src/app.ts)
- [apps/api/src/index.ts](/c:/Users/marco/Desktop/apppizzeria/apps/api/src/index.ts)
- [apps/worker/src/index.ts](/c:/Users/marco/Desktop/apppizzeria/apps/worker/src/index.ts)

**Definition of done**

- web risponde con health JSON
- api risponde con health JSON
- worker logga boot chiaro

### F1-08 - UI Foundation Web

Status: completed

**Obiettivo**  
Stabilizzare la base UI del nuovo web layer.

**Da fare**

- confermare shell dark professionale
- mantenere Geist via `next/font`
- definire app shell base
- definire tokens minimi in `packages/ui`
- evitare CSS sperimentale inutile

**File coinvolti**

- [apps/web/src/app/layout.tsx](/c:/Users/marco/Desktop/apppizzeria/apps/web/src/app/layout.tsx)
- [apps/web/src/app/globals.css](/c:/Users/marco/Desktop/apppizzeria/apps/web/src/app/globals.css)
- [packages/ui/src/index.ts](/c:/Users/marco/Desktop/apppizzeria/packages/ui/src/index.ts)

**Definition of done**

- homepage V2 leggibile e coerente
- tokens UI centralizzati almeno al livello base

### F1-09 - Shared Package Hardening

Status: completed

**Obiettivo**  
Rendere i package condivisi davvero utili, non solo placeholder.

**Da fare**

- consolidare `shared`
- consolidare `permissions`
- consolidare `templates`
- esportare tipi e costanti iniziali

**File coinvolti**

- [packages/shared/src/index.ts](/c:/Users/marco/Desktop/apppizzeria/packages/shared/src/index.ts)
- [packages/permissions/src/index.ts](/c:/Users/marco/Desktop/apppizzeria/packages/permissions/src/index.ts)
- [packages/templates/src/index.ts](/c:/Users/marco/Desktop/apppizzeria/packages/templates/src/index.ts)

**Definition of done**

- ogni package esporta qualcosa di realmente riusabile
- niente package vuoti o puramente ornamentali

### F1-10 - Lint e Formatting

Status: completed

**Obiettivo**  
Impedire che la V2 nasca gia disordinata.

**Da fare**

- scegliere `ESLint`
- scegliere `Prettier`
- configurare root
- aggiungere script `lint` e `format:check`

**File da creare**

- `.eslintrc` o config moderna equivalente
- `.prettierrc`
- eventuale `.prettierignore`

**Definition of done**

- esiste lint root
- esiste format check root

**Verifica 2026-04-25**

- `npm run lint` passa
- `npm run format:check` passa
- Il perimetro include `apps/*`, `packages/*`, config root V2 e questa checklist Foundation.

### F1-11 - CI Minima

Status: completed

**Obiettivo**  
Avere una prima pipeline automatica.

**Da fare**

- creare workflow GitHub Actions
- install dipendenze root
- eseguire `typecheck`
- eseguire `build:web`
- eseguire build API/worker se possibile

**File da creare**

- `.github/workflows/v2-foundation.yml`

**Definition of done**

- push o PR eseguono almeno typecheck e build base

**Verifica 2026-04-25**

- Workflow creato in `.github/workflows/v2-foundation.yml`
- La pipeline installa con `npm ci`
- Esegue `lint`, `format:check`, `typecheck`, `build:web`, `build:api`, `build:worker`

### F1-12 - Documentare Bootstrap Locale V2

Status: completed

**Obiettivo**  
Far partire un altro sviluppatore senza chat infinita.

**Da fare**

- aggiungere sezione README dedicata a V2
- documentare:
  - `npm install`
  - `docker compose up -d`
  - env da copiare
  - comandi `dev:web`, `dev:api`, `dev:worker`

**File coinvolti**

- [README.md](/c:/Users/marco/Desktop/apppizzeria/README.md)

**Definition of done**

- uno sviluppatore nuovo riesce ad avviare il cantiere V2

### F1-13 - Staging Shape

Status: partially documented - implementation pending

**Obiettivo**  
Definire subito come andra deployata la Foundation.

**Da fare**

- decidere target staging:
  - web su Vercel
  - api e worker su provider backend
- definire env staging minime
- definire naming servizi

**Definition of done**

- esiste una forma di deploy staging chiara
- nomi app e env sono gia coerenti

**Stato reale**

- La topologia e descritta in [V2_PLATFORM_BLUEPRINT.md](/c:/Users/marco/Desktop/apppizzeria/docs/V2_PLATFORM_BLUEPRINT.md): web su Vercel, api e worker su host backend, Postgres e Redis managed.
- Mancano ancora configurazione concreta, nomi servizi staging e env staging operative.

## Ordine di Esecuzione Raccomandato

Eseguire in questo ordine:

1. `F1-01`
2. `F1-02`
3. `F1-03`
4. `F1-04`
5. `F1-05`
6. `F1-06`
7. `F1-07`
8. `F1-08`
9. `F1-09`
10. `F1-10`
11. `F1-11`
12. `F1-12`
13. `F1-13`

## Definition Of Done Milestone 1

La `Milestone 1 - Foundation` e davvero chiusa quando:

- [x] il monorepo installa e parte
- [x] web, api e worker hanno bootstrap stabile
- [x] Postgres e Redis girano in locale
- [x] Prisma ha una migration iniziale committata e applicabile
- [x] env local sono chiare tramite `.env.example`
- [x] typecheck e build base esistono e passano
- [x] healthcheck esistono
- [x] lint/format root esistono e passano
- [x] CI minima e definita
- [ ] staging shape e definita operativamente

## Prossimo Passo Dopo Foundation

Appena questa checklist e chiusa, si apre la `Milestone 2 - Platform Core`:

- users
- access grants
- cities
- city registry
- businesses
- templates
- business modules
- audit log

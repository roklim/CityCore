# Architettura corrente verificata

Questa e l'architettura presente nel codice al 2026-08-05. Non implica che gli
scaffold di moduli, pagine, sezioni, media o collezioni siano gia esposti.

## Monorepo

```mermaid
flowchart TB
  Web[apps/web\nNext.js App Router]
  Api[apps/api\nFastify + Zod]
  DbPkg[packages/database\nPrisma schema/client]
  Shared[packages/domain/shared/permissions/templates/ui]
  Docs[docs + tools]
  Web --> Shared
  Api --> DbPkg
  Api --> Shared
  Docs --> Api
  Docs --> DbPkg
```

## Frontend, API e dati

```mermaid
flowchart LR
  Browser --> Web[Next.js]
  Web -->|server fetch + Bearer JWT| Api[Fastify /api/v2]
  Web -->|httpOnly cookie| Browser
  Api --> Prisma[Prisma Client]
  Prisma --> Postgres[(PostgreSQL)]
  Api --> Redis[(Redis health check)]
```

Il frontend usa le API pubbliche per city/business e le API protette per admin.
Quando queste non rispondono, il runtime pubblico puo usare fallback editoriali
statici: non e una sorgente dati primaria.

## Modello Platform → City → Business

```mermaid
erDiagram
  USER ||--o{ ACCESS_GRANT : receives
  CITY_REGISTRY ||--o| CITY : activates
  CITY ||--o{ BUSINESS : contains
  BUSINESS_TEMPLATE ||--o{ BUSINESS : shapes
  BUSINESS ||--o{ BUSINESS_MODULE : enables
  BUSINESS ||--o{ BUSINESS_PAGE : owns
  BUSINESS_PAGE ||--o{ BUSINESS_SECTION : contains
  CITY ||--o{ CITY_CATEGORY : owns
  BUSINESS ||--o{ BUSINESS_CATEGORY_ASSIGNMENT : receives
```

`BusinessPage`, `BusinessSection`, categorie e assegnazioni esistono nel
database, ma non fanno parte del runtime/API MVP corrente.

## Autenticazione

```mermaid
sequenceDiagram
  participant U as Browser
  participant W as Next server action
  participant A as Fastify
  participant D as PostgreSQL
  U->>W: Login form
  W->>A: POST /auth/login
  A->>D: Verifica User, password e grant attivi
  A-->>W: JWT con activeAccessId
  W-->>U: Cookie httpOnly citycore_session
  U->>W: Admin request
  W->>A: Bearer JWT su /auth/me e API protette
```

Il token e firmato HMAC, include `authVersion` e `activeAccessId`; revocare o
incrementare la versione dell'utente invalida la sessione alla successiva
verifica. Non esiste refresh token.

## Ruoli e access grant

```mermaid
flowchart TD
  U[User] --> G[AccessGrant attivo]
  G --> P{scopeType}
  P -->|platform| GA[global_admin]
  P -->|city| CA[city_admin + cityId]
  P -->|business| LA[local_admin/staff + businessId]
  GA --> All[Tutte le city e business]
  CA --> City[La sola city e i suoi business]
  LA --> One[Il solo business]
```

I filtri `buildAccessibleCityFilter` e `buildAccessibleBusinessFilter`
restringono le query admin. Le mutate route rileggono l'entita e controllano
permesso e scope prima dell'update; un local admin non ottiene dati di un altro
business tramite le route esaminate.

## Flusso pubblico attuale

```mermaid
flowchart LR
  H[/] --> PC[/public/cities + /public/businesses]
  PC --> C[/:citySlug]
  C --> CB[/public/cities/:citySlug/businesses]
  CB --> B[/:citySlug/:businessSlug]
  B --> PB[/public/cities/:citySlug/businesses/:businessSlug]
  PC -. API non raggiungibile .-> F[Fallback editoriale statico]
  CB -. API non raggiungibile .-> F
  PB -. API non raggiungibile .-> F
```

Le route pubbliche includono city attive/non disabilitate e business `active`.
Non includono ancora ricerca, filtri, servizi, orari, pagine/section pubblicate
o invio richiesta di contatto.

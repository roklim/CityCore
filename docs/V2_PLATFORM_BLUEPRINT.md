# CityCore - Platform Blueprint

## Visione

La V2 non deve piu essere pensata come "app pizzeria estesa", ma come
una piattaforma multi-citta, multi-verticale, city-first.

Obiettivo finale:

- ogni citta ha un marketplace locale
- ogni attivita entra tramite un template standardizzato
- ogni template attiva uno o piu moduli operativi
- l'AI accelera onboarding e contenuti, ma non sostituisce i dati strutturati
- piattaforma, citta, business e clienti hanno superfici distinte e coerenti

La piattaforma deve poter coprire:

- food ordering
- appointments per servizi come barber e beauty
- stays per camere e strutture
- mobility request per trasporto locale
- rental e altri verticali futuri


## Obiettivi Architetturali

La V2 deve essere:

- multi-tenant reale
- role-based e scope-based
- SEO-friendly
- modulare
- osservabile
- testabile
- estendibile senza riscrivere il core

Le superfici principali devono essere:

- pubblico piattaforma
- marketplace citta
- pagina pubblica attivita
- console piattaforma
- console citta
- banco locale
- area cliente


## Decisione Architetturale

### Stack target

- `Next.js App Router` per tutta la parte web
- `API backend separata` per il dominio applicativo
- `Worker` separato per task asincroni
- `Postgres` come database principale
- `Redis` per cache, rate limiting, queue e realtime leggero
- `Object storage` per immagini, media e asset generati

### Perche Next.js

Next.js ha senso per la V2 per questi motivi:

- routing forte e file-based
- Server Components per pagine pubbliche performanti
- Client Components per dashboard e interazioni complesse
- metadata dinamici
- sitemap e robots gestibili bene
- layout persistenti per aree admin e account
- rendering server-side delle pagine citta e business

Riferimenti ufficiali:

- https://nextjs.org/docs/app
- https://nextjs.org/docs/app/getting-started/server-and-client-components
- https://nextjs.org/docs/app/getting-started/route-handlers-and-middleware
- https://nextjs.org/docs/pages/guides/migrating/from-vite

### Perche API separata

Il dominio e troppo importante per essere sparso solo in route handler web.

Una API separata permette di tenere:

- auth e permission engine
- audit log
- billing
- moduli verticali
- webhooks
- orchestrazione AI
- task asincroni

in uno strato coerente e indipendente dal rendering web.


## Monorepo Target

```txt
apps/
  web/
  api/
  worker/

packages/
  ui/
  config/
  auth/
  permissions/
  templates/
  ai/
  shared/
```

### `apps/web`

Responsabilita:

- home piattaforma
- pagine citta
- pagine business
- console admin
- area cliente
- metadata, sitemap, robots, OG image

### `apps/api`

Responsabilita:

- auth
- users e access grants
- cities e business
- template engine
- moduli verticali
- audit log
- billing
- integrazioni

### `apps/worker`

Responsabilita:

- email inviti e reset
- AI onboarding
- sync media
- resize e processamento immagini
- job di reindex/search
- reminder appuntamenti
- task post-ordine/post-prenotazione

### `packages/ui`

- design system condiviso
- componenti base
- token di design
- layout shell

### `packages/auth`

- session parsing
- cookie helpers
- token helpers
- auth guards condivise

### `packages/permissions`

- permission map
- role matrix
- helper scope-aware

### `packages/templates`

- template definitions
- field schema
- section schema
- default CTA
- default AI prompts

### `packages/ai`

- prompt builder
- sanitizzazione output
- fallback content
- content generation policies

### `packages/shared`

- tipi condivisi
- validazioni
- costanti dominio
- helper comuni


## Routing Target

```txt
/                                 home piattaforma
/[citySlug]                       marketplace citta
/[citySlug]/[businessSlug]        pagina pubblica business
/admin                            global admin
/admin/cities/[citySlug]          city admin
/[citySlug]/[businessSlug]/admin  local admin/staff
/account                          account cliente
```

Route secondarie previste:

```txt
/login
/register
/select-access
/account/orders
/account/bookings
/account/stays
```


## Domini Principali

### 1. Platform Core

Nucleo comune a tutta la piattaforma:

- utenti
- ruoli e permessi
- citta
- business
- template
- moduli
- asset
- audit log
- AI generations

### 2. City Layer

Ogni citta ha:

- stato di attivazione
- zone coperte
- ranking e featured business
- moduli disponibili
- eventuali contenuti editoriali

### 3. Business Layer

Ogni business ha:

- un template
- uno o piu moduli attivi
- pagina pubblica standardizzata
- accessi scoped
- asset
- pricing plan
- settings operative


## Template Engine

La piattaforma non deve creare "siti custom da zero", ma "attivita operative
template-driven".

Ogni template definisce:

- campi obbligatori
- campi opzionali
- layout pubblico
- CTA primaria
- moduli attivati
- blocchi AI iniziali

Template iniziali consigliati:

- `pizzeria`
- `restaurant`
- `sushi`
- `barber`
- `beauty`
- `bnb`
- `hotel_light`
- `taxi_ncc`
- `rental`
- `service`
- `custom`


## Moduli Verticali

### `ordering`

Per food e retail leggero:

- menu
- categorie
- disponibilita
- carrello
- ordine
- tracking
- banco locale

### `appointments`

Per barber, beauty, servizi:

- servizi prenotabili
- durate
- disponibilita
- staff assegnabile
- booking slots
- dashboard appuntamenti

### `stays`

Per camere e strutture:

- camere o unita
- disponibilita
- prezzo base
- richieste o prenotazioni
- dashboard soggiorni

### `mobility_request`

Per il primo livello trasporto locale:

- richiesta corsa
- zona servita
- fascia oraria
- conferma manuale o semi-manuale

Nota: non e ancora il modulo "Uber completo".

### `rentals`

Per bici, attrezzatura e noleggi locali:

- item prenotabili
- disponibilita
- durata
- richiesta o prenotazione


## AI Onboarding Engine

L'AI deve essere usata come acceleratore di onboarding.

### Input minimi

Il gestore o il global admin inserisce:

- citta
- nome attivita
- tipo attivita
- descrizione breve
- orari
- contatti
- eventuali servizi/prodotti base

### Output AI atteso

- titolo pubblico
- sottotitolo
- descrizione lunga
- FAQ
- blocchi pagina
- meta title
- meta description
- categorie suggerite
- tono brand
- prompt media suggeriti

### Regola di sicurezza

L'AI non e fonte di verita per:

- prezzi
- disponibilita
- indirizzi
- aree servite
- regole di prenotazione
- policy legali


## Auth e Permessi

La V2 deve usare un modello scoped:

- `User` = identita
- `AccessGrant` = ruolo + scope

Ruoli:

- `global_admin`
- `city_admin`
- `local_admin`
- `staff`
- `customer`

Scope:

- `platform`
- `city`
- `business`

Lato web:

- layout e menu filtrati
- redirect guidati dal backend

Lato API:

- verifiche reali di permesso
- tenant isolation
- audit log su azioni sensibili


## Realtime e Async

Non tutto deve essere realtime, ma la piattaforma deve essere pronta.

### Realtime necessario nella V2

- stato ordini
- aggiornamento availability
- aggiornamento prenotazioni

### Async necessario nella V2

- inviti
- reset password
- AI generation
- reminder
- processing media
- notifiche


## SEO e Discoverability

La V2 deve essere forte sul pubblico.

Da avere:

- metadata dinamici
- sitemap
- robots
- canonical URL
- OG tags
- pagine citta indicizzabili
- pagine business indicizzabili
- blocco indicizzazione delle aree admin


## Observability

Da introdurre nella V2:

- request logging strutturato
- error tracking frontend
- error tracking backend
- health checks
- metrics base
- audit log piattaforma
- tracing essenziale sui flussi critici


## Sicurezza

La V2 deve prevedere:

- cookie sessione sicuri per la parte web
- access policy centralizzata
- rate limit login e API critiche
- invalidazione sessioni
- inviti e reset con scadenza
- audit log
- enforcement lato API, non solo frontend


## Deployment Topology

```txt
Vercel
  -> apps/web

Render / Railway / Fly / altro backend host
  -> apps/api
  -> apps/worker

Managed Postgres
Managed Redis
Object storage
```

Ambienti minimi:

- local
- staging
- production


## Cosa tenere del repo attuale

Da preservare concettualmente:

- `CityRegistry -> City -> Business`
- separazione tra console piattaforma e banco locale
- primo verticale ordering
- city-based routing
- scripts di smoke e diagnostica come cultura operativa


## Cosa superare

Da superare nella V2:

- auth legata a `User.role + businessId`
- sessione centrata su `localStorage`
- `backend/db/index.js` monolitico
- `DEFAULT_BUSINESS_SLUG` come fallback strutturale
- route legacy come base primaria
- Mongo come cuore unico di tutti i domini


## Decisione Finale

La direzione raccomandata per la V2 e:

- Next.js App Router come web layer principale
- API backend separata
- worker separato
- Postgres come database principale
- template engine
- module engine
- AI onboarding
- ordering e appointments come primi verticali forti
- stays subito dopo
- mobility_request prima di eventuale dispatch realtime completo

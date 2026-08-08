# Stato corrente di CityCore

Data dell'analisi: 2026-08-05. Questo documento descrive il codice presente,
non il prodotto pianificato.

## Struttura e tecnologie

CityCore e un monorepo npm workspaces. `apps/web` e un frontend Next.js 16 con
App Router; `apps/api` e un'API Fastify 5 con Zod e Prisma Client; PostgreSQL
e Redis sono descritti in `compose.yml`. I package `domain`, `shared`,
`permissions`, `templates`, `ui`, `config` e `database` raccolgono tipi,
cataloghi e integrazione Prisma.

Lo schema Prisma ha due migrazioni: baseline del core e consolidamento di
pubblicazione, media, categorie, collezioni e catalogo moduli.

## Funzionalita realmente operative nel codice

- Autenticazione tramite password scrypt e JWT HMAC a 8 ore, con cookie web
  `httpOnly` e selezione dell'access grant attivo.
- Bootstrap una tantum del primo global admin, login, `me` e cambio scope.
- API amministrative per registry dei comuni, cities, business, access grant e
  audit log; city e business supportano create/list/update.
- Creazione business con template persistito, owner opzionale, grant business
  opzionale e moduli iniziali.
- Letture pubbliche di city e business attivi, sotto `/api/v2/public`.
- Filtri di tenant per city/business nelle letture amministrative e nelle
  modifiche; il grant business e limitato al proprio `businessId`.
- Shell web per login, scelta accesso, dashboard globale in sola lettura e
  dashboard business in sola lettura.

## Funzionalita parziali o solo rappresentate

- La dashboard globale legge l'API ma non offre form/UI per attivare una city,
  creare business o assegnare owner/grant: le operazioni esistono solo via API.
- Business admin visualizza dati reali, ma non modifica profilo, moduli,
  contenuti, pubblicazione o utenti.
- Pagine e sezioni Prisma esistono ma non hanno route API; non sono usate dal
  runtime pubblico.
- Categorie, assegnazioni, collezioni, media asset e platform module sono nel
  database ma non dispongono di CRUD/API o UI.
- `status: active` rende pubblico un business; `publishedAt` e gli stati di
  pubblicazione di pagine/sezioni non vengono applicati al runtime.
- La ricerca pubblica e un semplice elenco ordinato con limite: non supporta
  query testuale, categoria, servizi, orari o altri filtri.
- Non esistono modelli, API o inbox per richieste di contatto. Le CTA aprono
  telefono, sito esterno o email.
- Non esistono servizi, orari, benchmark di ricerca, test automatici o
  assistente IA.

## Dati simulati e fallback

`apps/web/src/lib/public-marketplace.ts` contiene i profili editoriali usati
solo come fallback degraded. Se l'API non e raggiungibile, homepage, city page
e business page segnalano chiaramente lo stato; sulla scheda business richieste
e ordini restano disattivati. Le superfici live mostrano i dati pubblici
disponibili senza presentare copy editoriale come informazione dell'attività.

## Modello Prisma e uso effettivo

| Modello                                                                                                              | Uso corrente                      |
| -------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| `User`, `AccessGrant`, `AuditLog`                                                                                    | Autenticazione, grant e audit API |
| `CityRegistry`, `City`, `BusinessTemplate`, `Business`, `BusinessModule`                                             | CRUD/parziale API e letture web   |
| `BusinessPage`, `BusinessSection`                                                                                    | Solo schema/migrazione            |
| `MediaAsset`, `PlatformModule`, `CityCategory`, `BusinessCategoryAssignment`, `CityCollection`, `CityCollectionItem` | Solo schema/migrazione            |

I moduli `content`, `catalog`, `forms_inbox`, `booking`, `hospitality`,
`listings`, `directory` ed `events` sono catalogo/scaffold; non implementano
i relativi flussi verticali.

## Coerenza, sicurezza e debito tecnico

- La discrepanza `customer` nei package condivisi rispetto a Prisma/API e
  stata eliminata in questa sessione. I soli ruoli sono `global_admin`,
  `city_admin`, `local_admin`, `staff`.
- Il token JWT era passato come hidden input nella pagina di scelta accesso;
  ora l'action server legge esclusivamente il cookie `httpOnly`.
- Le permission map esistono sia in `apps/api/src/auth.ts` sia in
  `packages/permissions`: oggi hanno valori equivalenti ma la duplicazione e
  un rischio di divergenza.
- Template e moduli sono duplicati tra API e `packages/templates`; stessa
  osservazione per enum/tipi API e package domain.
- `routes.ts` supera 1.600 righe e accorpa registry, city, business, grant e
  audit: e la prima candidata a separazione per resource quando l'MVP cresce.
- Il seed global admin richiede ora `GLOBAL_ADMIN_PASSWORD` e non stampa mai
  la password; non esistono credenziali demo sicure committate.

## Dipendenze e rischi

Dipendenze principali: Next.js, React, Fastify, Prisma, Zod, TypeScript,
ESLint, Prettier e Docker Compose. Al momento dell'analisi `npm ls --depth=0`
segnala workspace invalidi e pacchetti estranei: occorre un `npm ci` locale
con rete disponibile prima dell'avvio affidabile. Docker Desktop non era
disponibile, quindi database, migrazioni, seed e health runtime non sono stati
verificati. Il wrapper Prisma non ha potuto generare un processo figlio in
questo ambiente, quindi lo schema non puo essere dichiarato validato qui.

Elementi riutilizzabili: schema multi-tenant, mappers, validazioni Zod,
cataloghi template/moduli, auth con grant e filtri di scope, shell web e CI.

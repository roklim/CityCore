# Architecture

## Direzione

CityCore e una piattaforma `city-first` modulare. Il core del repo e costruito
per gestire:

- piattaforma
- citta
- business
- moduli attivabili
- pagine pubbliche
- shell admin

La gerarchia canonica e:

1. `Platform`
2. `City`
3. `Business`
4. `Module`
5. `Page`
6. `Section`

## Strati Del Sistema

### Platform Core

Responsabilita:

- autenticazione
- ruoli e permessi
- access grants
- registry citta
- gestione city e business
- catalogo moduli
- catalogo template
- audit log

Tecnologia:

- `apps/api`
- `packages/database`
- `packages/domain`
- `packages/permissions`
- `packages/templates`

### Public Web

Responsabilita:

- home piattaforma
- home citta
- pagina business
- fallback editoriali coerenti con il runtime

Tecnologia:

- `apps/web`
- `packages/ui`
- `packages/shared`

### Admin Surfaces

Responsabilita:

- global admin
- scelta accesso
- business admin generico

Le shell admin devono restare coerenti con scope e permessi, non con un singolo
verticale operativo.

## Routing Canonico

Pubblico:

- `/`
- `/:citySlug`
- `/:citySlug/:businessSlug`

Admin:

- `/admin/login`
- `/admin`
- `/select-access`
- `/:citySlug/:businessSlug/admin`

API, mantenute sotto un namespace HTTP versionato:

- `/health`
- `/api/v2`
- `/api/v2/auth/*`
- `/api/v2/platform-core/*`
- `/api/v2/public/*`

## Moduli

Il repo conserva un catalogo moduli standardizzati.

Moduli core/scaffold:

- `content`
- `catalog`
- `forms_inbox`
- `booking`
- `hospitality`
- `listings`
- `directory`
- `events`

Questi moduli oggi vanno letti come struttura e lessico condiviso del sistema,
non come verticali completi gia implementati.

## Template

I template restano un livello di orchestrazione sopra i moduli:

- suggeriscono un modulo principale
- definiscono campi di onboarding
- definiscono i section type disponibili

Il builder deve essere guidato. La liberta riguarda:

- sequenza sezioni
- contenuti
- CTA
- colori
- media

La logica dei moduli non deve essere riscritta da ogni tenant.

## Confini

CityCore non deve tornare a essere:

- mono-verticale
- cucito su un solo caso d'uso operativo
- un marketplace specialistico travestito da piattaforma
- un pannello locale modellato attorno a un unico flusso

Deve restare:

- `platform core`
- `city layer`
- `business layer`
- `module scaffold`
- `guided builder scaffold`

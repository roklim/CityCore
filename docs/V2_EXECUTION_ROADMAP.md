# CityCore - Execution Roadmap

## Obiettivo

Questa roadmap organizza il lavoro della V2 in milestone professionali.

Non e una lista di idee. E una sequenza di consegne con dipendenze, priorita e
definition of done.


## Principi di esecuzione

- niente verticali complessi su fondamenta deboli
- niente AI senza modello dati pulito
- niente UX "bella" senza auth e operativita solide
- niente produzione senza audit, smoke e observability


## Milestone 1 - Foundation

### Obiettivo

Creare il nuovo cantiere V2.

### Include

- monorepo
- apps `web`, `api`, `worker`
- Postgres
- Redis
- env local/staging/prod
- CI minima
- design tokens e UI foundation

### Definition of done

- repo V2 avviabile
- migrations funzionanti
- healthcheck disponibili
- deploy staging funzionante


## Milestone 2 - Platform Core

### Obiettivo

Portare il dominio base della piattaforma.

### Include

- users
- access grants
- cities
- city registry
- businesses
- templates
- business modules
- assets
- audit logs

### Definition of done

- global admin puo creare e governare business
- city admin puo esistere con scope reale
- business puo essere creato in draft


## Milestone 3 - Public Platform Web

### Obiettivo

Portare il layer pubblico in Next.js.

### Include

- home piattaforma
- city pages
- business pages
- metadata dinamici
- sitemap
- robots
- responsive pass serio

### Definition of done

- home, citta e business sono SEO-ready
- pubblico gira sulla V2
- layout e navigazione sono coerenti


## Milestone 4 - Auth and Admin Shells

### Obiettivo

Portare accesso e superfici operative.

### Include

- login unica
- session model serio
- global admin shell
- city admin shell
- local admin shell
- staff shell
- account base customer

### Definition of done

- ogni ruolo entra nella superficie corretta
- menu e permessi sono coerenti
- API enforceano i permessi


## Milestone 5 - AI Onboarding Engine

### Obiettivo

Far nascere business professionali da pochi input.

### Include

- wizard nuova attivita
- scelta template
- campi minimi
- generazione AI di contenuti
- generazione page sections
- revisione umana
- pubblicazione draft -> active

### Definition of done

- un business puo nascere da onboarding guidato
- la pagina pubblica e credibile gia al primo giro


## Milestone 6 - Ordering Pro

### Obiettivo

Portare il verticale food in forma definitiva.

### Include

- menu
- categorie
- availability
- ordini
- tracking
- dashboard locale
- metriche base

### Definition of done

- un tenant food puo lavorare davvero su V2
- ordine e backoffice sono stabili


## Milestone 7 - Appointments Pro

### Obiettivo

Portare il verticale servizi/prenotazioni.

### Include

- servizi prenotabili
- disponibilita
- slot
- staff assegnabile
- prenotazione
- dashboard appuntamenti

### Definition of done

- barber/beauty/service puo vivere sulla piattaforma


## Milestone 8 - Stays Pro Light

### Obiettivo

Aprire il verticale soggiorni senza creare una OTA mostruosa.

### Include

- room types
- camere
- disponibilita
- richieste o prenotazioni
- dashboard soggiorni

### Definition of done

- una struttura light puo stare in piattaforma in modo serio


## Milestone 9 - Mobility Request

### Obiettivo

Aggiungere trasporto locale in modo professionale e sostenibile.

### Include

- richiesta trasporto
- service areas
- stato richiesta
- conferma
- assegnazione non realtime avanzata

### Definition of done

- il verticale trasporto esiste come modulo reale
- non promette ancora un sistema stile Uber completo


## Milestone 10 - Growth and Hardening

### Obiettivo

Rendere la piattaforma pronta per scala e vendita seria.

### Include

- billing
- invitation flow
- password reset
- notifications
- analytics
- support tooling
- rate limit e anti-abuso
- observability
- QA strutturata

### Definition of done

- piattaforma governabile
- tenant onboarding ripetibile
- incidenti osservabili


## Workstream Trasversali

### Security

Sempre attivo su tutte le milestone:

- RBAC
- session hardening
- audit log
- rate limit
- secure defaults

### UX

Sempre attivo su tutte le milestone:

- coerenza visiva
- loading states
- error states
- responsive
- admin ergonomics

### Docs

Sempre attivo:

- architecture docs
- module docs
- rollout docs
- runbook

### QA

Sempre attivo:

- smoke
- regression critical path
- manual test scripts


## Priorita assolute

Se bisogna scegliere, l'ordine corretto e:

1. Foundation
2. Platform Core
3. Auth and Admin Shells
4. Public Platform Web
5. AI Onboarding
6. Ordering
7. Appointments
8. Stays
9. Mobility Request
10. Growth and Hardening


## Cose da non anticipare

Non anticipare queste aree prima del momento giusto:

- dispatch realtime completo trasporto
- customer super app avanzata
- features decorative
- esperimenti visuali costosi senza valore operativo
- nuovi verticali oltre i primi quattro


## Definizione di successo V2

La V2 e considerata riuscita quando:

- una citta puo essere attivata in modo serio
- un business puo essere creato da template
- il business riceve pagina pubblica professionale
- il business puo operare con il modulo giusto
- ruoli e permessi sono puliti
- il global admin governa davvero la piattaforma
- il city admin governa davvero il suo territorio
- il local admin governa davvero il suo business
- l'AI velocizza onboarding e contenuti
- il sistema e osservabile, testabile e deployabile

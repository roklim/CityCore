# Platform V2 - Migration Plan

## Obiettivo

Migrare dal repo attuale a una V2 professionale senza buttare via il valore gia
costruito.

La migrazione deve:

- preservare il dominio gia validato
- evitare un big bang cieco
- permettere build parallela della V2
- arrivare a un cutover netto e leggibile


## Stato di Partenza

Il repo attuale ha gia basi utili:

- city registry
- city activation
- business tenant
- console piattaforma separata
- banco locale separato
- verticale ordering funzionante
- prime regole di tenant isolation

Ma ha anche limiti strutturali:

- Vite + router minimale
- backend Express monolitico
- auth ancora basata su `User.role`
- Mongo come database unico del core
- fallback legacy diffusi


## Strategia Generale

La strategia raccomandata e:

1. congelare il dominio attuale
2. avviare una V2 parallela
3. migrare il core in ordine controllato
4. portare per primi pubblico e ordering
5. fare cutover progressivo
6. lasciare la legacy solo come fallback breve


## Cosa Salvare

Da riusare come conoscenza o seed:

- naming di citta e business
- city registry import
- concetto di console piattaforma vs banco locale
- flow ordering esistente
- copy e UX gia validate lato business food
- diagnostica e smoke come base culturale


## Cosa Non Portare 1:1

Da non copiare meccanicamente:

- `backend/db/index.js` monolitico
- auth legacy con `role + businessId`
- dipendenza da `DEFAULT_BUSINESS_SLUG`
- route legacy come modello primario
- sessione frontend centrata su localStorage


## Monorepo Target

Struttura finale consigliata:

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

legacy/
  frontend/
  backend/
```

La cartella `legacy/` puo essere introdotta solo al momento in cui parte la V2,
non e obbligatorio farlo subito.


## Fase 0 - Freeze Strategico

Prima di costruire la V2:

- definire scope V2
- definire stack
- definire modello dati
- definire ruoli
- definire moduli iniziali
- bloccare refactor grandi casuali sulla legacy

Output:

- blueprint V2
- data model V2
- migration plan V2


## Fase 1 - Bootstrap V2

Obiettivo:
creare lo scheletro tecnico della nuova piattaforma.

Da fare:

- inizializzare monorepo
- creare `apps/web`
- creare `apps/api`
- creare `apps/worker`
- configurare Postgres
- configurare Redis
- configurare linting, formatting, env e CI base

Definition of done:

- repo V2 parte in locale
- web, api e worker si avviano
- DB migrations funzionano


## Fase 2 - Platform Core

Obiettivo:
portare prima il cuore, non i verticali.

Da fare:

- users
- access grants
- city registry
- cities
- business templates
- businesses
- business modules
- assets
- audit logs

Definition of done:

- global admin puo gestire citta e business
- city admin puo avere scope reale
- business puo nascere in `draft`


## Fase 3 - Public Web V2

Obiettivo:
portare il layer pubblico su Next.js.

Da fare:

- home piattaforma
- pagine citta
- pagine business
- metadata dinamici
- sitemap
- robots
- OG base

Cutover parziale possibile:

- pubblico su V2
- admin ancora legacy per un periodo limitato


## Fase 4 - Auth e Shell Admin V2

Obiettivo:
rendere V2 usabile anche operativamente.

Da fare:

- login unica
- shell global admin
- shell city admin
- shell local admin
- shell staff
- account cliente base

Definition of done:

- ruoli reali e scoped
- redirect coerenti
- navigazione separata per ogni tipo accesso


## Fase 5 - Ordering Migration

Obiettivo:
portare il verticale piu maturo.

Da fare:

- categorie menu
- items
- disponibilita
- ordini
- tracking
- dashboard locale
- reporting base

Strategia dati:

- import iniziale da Mongo a Postgres
- freeze scritture legacy durante il cutover del business pilota


## Fase 6 - AI Onboarding

Obiettivo:
rendere la V2 differenziante e scalabile.

Da fare:

- wizard nuova attivita
- scelta template
- generazione contenuti
- generazione page sections
- salvataggio AI outputs
- revisione umana


## Fase 7 - Appointments

Obiettivo:
aggiungere il secondo verticale serio.

Da fare:

- servizi
- staff assegnabile
- disponibilita
- slot
- prenotazioni
- dashboard locale servizi


## Fase 8 - Stays

Obiettivo:
aggiungere strutture e camere in forma professionale ma sostenibile.

Da fare:

- room types
- camere
- disponibilita
- richieste o prenotazioni
- dashboard soggiorni


## Fase 9 - Mobility Request

Obiettivo:
aggiungere trasporto locale senza entrare subito nel dispatch realtime totale.

Da fare:

- richiesta trasporto
- zone coperte
- stato richiesta
- assegnazione manuale o semi-manuale


## Strategia Dati

### Migrazione Mongo -> Postgres

Percorso consigliato:

1. export controllato dal Mongo attuale
2. script ETL per Postgres
3. validazione record counts
4. validazione spot su tenant pilota
5. cutover del primo business reale

### Evitare dual-write prolungato

Dual-write lungo su due sistemi diversi aumenta rischio e complessita.

Scelta consigliata:

- legacy continua a vivere per un periodo definito
- V2 importa snapshot
- al momento del cutover dei tenant pilota si blocca la scrittura legacy
- da quel momento il tenant pilota scrive solo su V2


## Strategia di Cutover

### Opzione raccomandata

Cutover per superficie e per verticale.

Ordine:

1. pubblico
2. auth e shell admin
3. ordering
4. appointments
5. stays

### Tenant pilota

Prima di migrare tutti:

- una citta pilota
- uno o due business food
- un business service

Questo permette di trovare i problemi veri senza rompere tutta la piattaforma.


## Ambiente Legacy Durante la Transizione

La legacy serve finche:

- ordering V2 non e stabile
- auth scoped V2 non e stabile
- i primi tenant pilota non sono validati

Quando la V2 copre il core:

- legacy pubblico puo essere dismesso
- legacy admin puo restare solo in fallback limitato


## Rischi Principali

### 1. Migrare troppo presto a verticali complessi

Mitigazione:

- ordering prima
- appointments seconda
- stays terza
- mobility_request prima di mobility realtime

### 2. Migrazione dati sporchi

Mitigazione:

- import dry run
- data quality report
- validazione tenant pilota
- backup obbligatorio

### 3. Auth instabile

Mitigazione:

- auth e access grants prima dei verticali nuovi
- test permessi automatizzati

### 4. Team dispersion

Mitigazione:

- milestone chiare
- confini modulo forti
- definizione di done rigorosa


## Criteri di Fine Migrazione

La legacy puo essere davvero pensionata quando:

- pubblico V2 e live
- global admin V2 e live
- local admin V2 per ordering e live
- appointments V2 e live
- migration scripts sono stabili
- tenant pilota operano da V2 senza fallback quotidiano
- smoke, QA e osservabilita sono in piedi


## Decisione Finale

Il passaggio corretto non e "aggiornare un po il repo attuale", ma:

- costruire una V2 parallela
- migrare il core in modo strutturato
- portare ordering per primo
- aggiungere i nuovi verticali sopra un platform core vero

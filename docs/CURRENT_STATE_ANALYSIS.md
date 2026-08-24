# Stato corrente di CityCore

Data dell'analisi: 2026-08-25. Revisione di base della lavorazione: `fc67693`.

Questo documento descrive il codice realmente implementato. La visione di lungo periodo resta in
`MASTER_PRODUCT_MAP.md`; il perimetro della tesi resta in `THESIS_MVP_SCOPE.md`.

## Sintesi

CityCore è un MVP city-first funzionante e adatto a una dimostrazione accademica controllata. Il
caso pilota persistito è Cagli; include un'agenda eventi pubblica minimale e Mucho Gusto mostra
anche un'estensione pickup dimostrativa. Il repository non rappresenta ancora una produzione
nazionale e non deve essere presentato come tale.

Il flusso core disponibile è:

```text
Platform -> City -> Business
-> profilo, categorie, servizi e orari
-> readiness e pubblicazione
-> directory e ricerca
-> inquiry
-> inbox owner

City -> eventi pubblicati -> agenda cronologica
```

## Struttura e runtime

- monorepo npm workspaces;
- `apps/web`: Next.js 16 App Router e React 19;
- `apps/api`: Fastify 5, Zod e Prisma Client;
- PostgreSQL come database applicativo;
- Redis dichiarato come dipendenza di health, non ancora usato per cache o rate limit distribuito;
- package condivisi reali: `config`, `database`, `domain`, `templates`, `ui`;
- Vercel per il web e Render per l'API staging.

La runtime CI e Render è fissata a Node.js `24.14.1`. `.gitattributes` e Prettier definiscono una
policy EOL riproducibile tra Windows e Linux.

## Funzionalità operative

### Platform e accessi

- bootstrap controllato del primo global admin;
- login, logout logico tramite `authVersion` e selezione access grant;
- ruoli `global_admin`, `city_admin`, `local_admin`, `staff`;
- scope platform, city e business;
- creazione e modifica di City, Business e grant;
- filtri tenant applicativi e test cross-city/cross-business;
- audit log per autenticazione e operazioni amministrative principali.

### Business MVP

- gestione profilo e contatti pubblici;
- categorie cittadine e assegnazione al business;
- servizi con stato, descrizione, prezzo e durata;
- orari settimanali e calcolo stato aperto/chiuso nel timezone del business;
- readiness, publish e unpublish;
- inquiry pubblica e inbox owner;
- pickup ordering dimostrativo con capacità e transazione serializzabile.

### Superficie pubblica

- home piattaforma;
- pagina città e directory filtrabile con indice in-memory per query ripetute;
- agenda cronologica degli eventi attivi e pubblicati della città;
- pagina business con servizi, orari, contatti e azione primaria;
- metadata, canonical e JSON-LD `LocalBusiness`;
- sitemap e robots;
- pagine provvisorie Privacy e Termini/Nota demo;
- disclaimer persistente che identifica il prodotto come prototipo di tesi;
- aree admin e access selector impostate `noindex,nofollow`.

In produzione le build web richiedono URL API e origine canonica validi. I fallback editoriali
sono disabilitati per default in produzione e possono essere abilitati soltanto esplicitamente in
un ambiente demo. Le chiamate web verso l'API hanno un timeout finito.

### Eventi del caso pilota

- entità persistita `CityEvent`, appartenente a una `City`;
- titolo, sintesi, luogo, intervallo temporale, timezone e stato di pubblicazione;
- nome organizzatore conservato come snapshot e collegamento opzionale a un `Business`;
- endpoint pubblico paginato con filtro temporale per sovrapposizione;
- tre eventi sintetici di Cagli nel seed idempotente, con date fisse nel giugno 2030;
- rendering isolato nella home città: un errore dell'agenda non rende indisponibile la directory.
- anteprima esplicita dei primi sei eventi quando il totale disponibile è maggiore.

Il vertical slice è deliberatamente read-only sulla superficie applicativa. Non comprende CRUD
admin, ricorrenze, ticketing, prenotazioni, pagamenti o import di calendari esterni.

## Dati e migrazioni

Lo schema dispone di dodici migrazioni condivise. Quattro migrazioni storiche del 17 agosto 2026
contengono aggiornamenti specifici per il caso demo Cagli/Mucho Gusto. Non devono essere cancellate
o riscritte se risultano già applicate.

Il repository include:

- seed demo separati e idempotenti;
- blocco dei seed demo con `NODE_ENV=production`, salvo acknowledgement esplicito e puntuale;
- preflight read-only prima di un `migrate deploy` production;
- audit read-only degli artefatti demo legacy;
- procedura operativa in `LEGACY_DEMO_DATA_MIGRATIONS.md`.

La pipeline autorevole ISTAT per tutti i comuni italiani non è ancora implementata. Il registry
globale compatto serve soltanto a dimostrare ricerca, normalizzazione e timezone; non equivale a
copertura nazionale.

## Ricerca ed efficienza

La directory costruisce sul client un indice invertito in memoria sui Business già ricevuti. Le
posting list di trigrammi restringono i candidati testuali, quelle di categoria applicano il filtro
e una verifica finale di sottostringa mantiene la semantica della precedente scansione lineare. Le
query inferiori a tre caratteri riusano i campi pre-normalizzati.

Il benchmark riproducibile `npm run benchmark:search` confronta indice e scansione su dataset
sintetici crescenti, controllando anche la parità esatta dei risultati. Metodo, misure e limiti sono
riportati in `SEARCH_EFFICIENCY_EVALUATION.md`. È un esperimento algoritmico isolato: non misura
rete, rendering, concorrenza o query PostgreSQL e non dimostra capacità nazionale.

## Qualità verificata

La revisione di lavoro ha superato il quality gate completo locale:

- schema Prisma valido, 12 migrazioni allineate e client generato;
- 4 test del guard migrazioni;
- 20 test unitari API;
- 126 test web;
- 29 test d'integrazione su PostgreSQL isolato;
- lint, format check, typecheck globale e build di produzione web/API.

I 179 test complessivi includono query e mapper degli eventi, filtro temporale, paginazione,
formattazione timezone, fallback testato per timezone IANA e date non valide, isolamento del guasto
agenda e parità fra indice e scansione. Il seed demo è stato inoltre eseguito due volte sul database
di test: sono rimasti gli stessi tre eventi di Cagli con date e organizzatori invariati.

Il quality gate GitHub include schema e migrazioni Prisma, seed idempotente del registry globale,
unit test API/web, integration test su database isolato, lint, format, typecheck e build. La verifica
del seed principale resta un controllo locale esplicito. Prima della consegna il gate va comunque
rieseguito sulla revisione congelata seguendo `THESIS_DEMO_RUNBOOK.md`.

## Limiti noti

- catalogo live dimostrativo, non dataset nazionale;
- ricerca pubblica e sitemap ancora basate su fetch paginati e non dimensionate per grandi volumi;
- indice di ricerca solo in memoria: non riduce il payload API e non rimuove il limite difensivo di
  100 pagine da 24 Business della directory;
- coerenza città-organizzatore e validità IANA della timezone devono essere validate in un futuro
  write path degli eventi; il mapper pubblico sopprime già i link cross-city e la UI applica un
  fallback `Europe/Rome` testato sia per timezone non valide sia per `startsAt`/`endsAt` malformati,
  cosi che un dato sporco non generi mai un RangeError durante il rendering server-side;
- cache CDN/ISR e invalidazione non implementate;
- rate limit per-processo, non distribuito;
- autenticazione senza MFA, recovery self-service o rotazione chiavi completa;
- nessuna pipeline email, queue/outbox o object storage media;
- backup, PITR, restore drill, SLO, tracing, alert e on-call non dimostrati dal repository;
- privacy demo non sostitutiva di documentazione e processi validati per utenti reali;
- `npm audit --omit=dev` segnala tre vulnerabilità high nella catena di configurazione/CLI Prisma
  (`@prisma/config` -> `deepmerge-ts`); npm propone soltanto una variazione forzata e breaking, da
  valutare con una migrazione Prisma dedicata prima di un'apertura pubblica;
- CRUD eventi, ricorrenze, ticketing, booking, hospitality verticale, listing, billing, domini e
  analytics restano scaffold o roadmap;
- copertura test ancora concentrata su helper e API, senza suite browser E2E automatizzata.

## Classificazione corretta del risultato

Il risultato può essere descritto come:

> MVP verificato di piattaforma modulare city-first, dimostrato su una città pilota e progettato
> per un'estensione progressiva.

Non va descritto come servizio nazionale production-ready. Il passaggio a produzione richiede la
roadmap tecnica, operativa, legale e dati riportata nei documenti di audit e nel blueprint.

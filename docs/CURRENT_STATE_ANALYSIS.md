# Stato corrente di CityCore

Data dell'analisi: 2026-08-24. Baseline verificata: `origin/main` `225389c`.

Questo documento descrive il codice realmente implementato. La visione di lungo periodo resta in
`MASTER_PRODUCT_MAP.md`; il perimetro della tesi resta in `THESIS_MVP_SCOPE.md`.

## Sintesi

CityCore è un MVP city-first funzionante e adatto a una dimostrazione accademica controllata. Il
caso pilota persistito è Cagli; Mucho Gusto mostra anche un'estensione pickup dimostrativa. Il
repository non rappresenta ancora una produzione nazionale e non deve essere presentato come tale.

Il flusso core disponibile è:

```text
Platform -> City -> Business
-> profilo, categorie, servizi e orari
-> readiness e pubblicazione
-> directory e ricerca
-> inquiry
-> inbox owner
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
- pagina città e directory filtrabile;
- pagina business con servizi, orari, contatti e azione primaria;
- metadata, canonical e JSON-LD `LocalBusiness`;
- sitemap e robots;
- pagine provvisorie Privacy e Termini/Nota demo;
- disclaimer persistente che identifica il prodotto come prototipo di tesi;
- aree admin e access selector impostate `noindex,nofollow`.

In produzione le build web richiedono URL API e origine canonica validi. I fallback editoriali
sono disabilitati per default in produzione e possono essere abilitati soltanto esplicitamente in
un ambiente demo. Le chiamate web verso l'API hanno un timeout finito.

## Dati e migrazioni

Lo schema dispone di undici migrazioni condivise. Quattro migrazioni storiche del 17 agosto 2026
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

## Qualità verificata

La baseline aggiornata e le correzioni per la tesi hanno superato:

- schema Prisma, typecheck globale, lint, format e build web/API;
- 4 test del guard migrazioni legacy;
- 17 unit test API;
- 115 test web;
- 28 integration test su PostgreSQL isolato.

Il quality gate GitHub include schema e migrazioni Prisma, seed idempotente, unit test API/web,
integration test su database isolato, lint, format, typecheck e build. La verifica completa locale
va rieseguita prima della consegna seguendo `THESIS_DEMO_RUNBOOK.md`.

## Limiti noti

- catalogo live dimostrativo, non dataset nazionale;
- ricerca pubblica e sitemap ancora basate su fetch paginati e non dimensionate per grandi volumi;
- cache CDN/ISR e invalidazione non implementate;
- rate limit per-processo, non distribuito;
- autenticazione senza MFA, recovery self-service o rotazione chiavi completa;
- nessuna pipeline email, queue/outbox o object storage media;
- backup, PITR, restore drill, SLO, tracing, alert e on-call non dimostrati dal repository;
- privacy demo non sostitutiva di documentazione e processi validati per utenti reali;
- `npm audit --omit=dev` segnala tre vulnerabilità high nella catena di configurazione/CLI Prisma
  (`@prisma/config` -> `deepmerge-ts`); npm propone soltanto una variazione forzata e breaking, da
  valutare con una migrazione Prisma dedicata prima di un'apertura pubblica;
- booking, hospitality, listing, eventi, billing, domini e analytics restano scaffold o roadmap;
- copertura test ancora concentrata su helper e API, senza suite browser E2E automatizzata.

## Classificazione corretta del risultato

Il risultato può essere descritto come:

> MVP verificato di piattaforma modulare city-first, dimostrato su una città pilota e progettato
> per un'estensione progressiva.

Non va descritto come servizio nazionale production-ready. Il passaggio a produzione richiede la
roadmap tecnica, operativa, legale e dati riportata nei documenti di audit e nel blueprint.

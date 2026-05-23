# Master Product Map

CityCore e una piattaforma modulare `city-first`: ogni citta ha una propria
identita pubblica, e dentro ogni citta ogni attivita ha il suo sito, il suo
pannello e i suoi moduli operativi attivabili.

## Visione

- ecosistema urbano digitale
- directory e discovery locale
- siti business personalizzabili
- moduli operativi standardizzati
- gestione centralizzata di citta, business, ruoli e contenuti

## Gerarchia Del Sistema

- `Platform`
- `City`
- `Business`
- `Module`
- `Page`
- `Section`

## Platform

Gestisce:

- autenticazione
- ruoli
- billing e piani
- domini
- media
- audit
- analytics base
- catalogo moduli
- catalogo template
- configurazioni globali

## City

Ogni citta:

- ha nome, slug e identita propria
- ha homepage, contenuti editoriali e SEO
- puo avere featured business, categorie, collezioni ed eventi
- governa la discovery locale senza cambiare la logica dei moduli
- usa categorie e collezioni come strumenti editoriali, non come logica custom

## Business

Ogni business:

- appartiene a una citta
- ha brand, contenuti, contatti e pagine pubbliche
- attiva uno o piu moduli compatibili
- ha owner e staff con permessi scoped
- puo vivere sotto percorso piattaforma o dominio proprio
- puo essere collegato a categorie cittadine e collezioni featured

## Module

I moduli sono motori standardizzati, non feature bespoke.

Moduli core/scaffold:

- `content`
- `catalog`
- `forms_inbox`
- `booking`
- `hospitality`
- `listings`
- `directory`
- `events`

Il catalogo moduli e persistente nel core tramite `PlatformModule`, cosi il
prodotto puo distinguere moduli attivi, pubblici e amministrabili.

## Template

Ogni business sceglie:

- un template iniziale
- un modulo principale
- un set di sezioni
- uno stile visivo

I template ufficiali del repo oggi sono:

- `local_business`
- `studio_service`
- `hospitality`
- `events_listings`
- `custom`

## Public Surfaces

### Pagine Citta

- homepage citta
- directory attivita
- categorie
- collezioni / featured
- eventi / annunci

### Pagine Business

- homepage business
- chi siamo
- servizi / catalogo / listing principale
- contatti e mappa
- info pratiche
- FAQ

## Admin Surfaces

### Platform Admin

- registry citta
- cities
- businesses
- templates
- access grants
- audit log

### Business Admin

- profilo business
- moduli attivi
- contenuti pubblici
- contatti e dati operativi
- stato onboarding

## Builder

Il builder deve essere guidato:

- sezioni predefinite
- layout predefiniti
- blocchi collegabili ai moduli
- navigazione configurabile
- CTA e media personalizzabili

Non deve diventare un page builder illimitato in V1.

## Pubblicazione E Media

Le pagine e le sezioni hanno uno stato di pubblicazione:

- `draft`
- `in_review`
- `published`
- `archived`

Gli asset media sono entita tracciate e scoped:

- platform
- city
- business

Questo permette preview, publish review, libreria media e rollback futuro senza
mescolare contenuti pubblici con configurazioni operative.

## Principi Non Negoziabili

- `city-first`
- `module-driven`
- `builder-guided`
- `multi-tenant by design`
- `privacy e permessi rigorosi`
- `identita forti, struttura coerente`

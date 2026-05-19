# V2 Platform Blueprint

## Obiettivo

Stabilizzare CityCore come base di piattaforma:

- `platform core`
- `city layer`
- `business layer`
- `module scaffold`
- `guided builder`

## V2 Reale Del Repo

La V2 che questo repo deve rappresentare non e un verticale completo. E una
base pronta ad accogliere verticali futuri senza piegare tutta l'architettura a
uno solo.

## Capabilities Da Tenere

### Platform Core

- auth bootstrap e login
- sessione scoped
- access grants
- ruoli e permessi
- city registry
- cities
- businesses
- templates
- audit logs

### Public Runtime

- homepage piattaforma
- homepage citta
- pagina business
- fallback editoriali coerenti con i dati live

### Business Runtime

- profilo business
- contenuti pubblici base
- modulo principale come concetto
- business admin generico

## Moduli Del Catalogo

- `content`
- `catalog`
- `forms_inbox`
- `booking`
- `hospitality`
- `listings`
- `directory`
- `events`

## Template Ufficiali

- `local_business`
- `studio_service`
- `hospitality`
- `events_listings`
- `custom`

## Cosa Esce Dal Repo Attivo

- route verticali obsolete
- lookup pubblici non coerenti col core
- flussi transazionali specialistici
- feature promozionali specifiche
- seed e smoke di verticali eliminati
- documenti centrati su prodotti non piu attivi

## Stato Atteso Dopo Il Cleanup

- il repo racconta CityCore in modo coerente
- il core e buildabile
- la narrativa docs non si contraddice
- le superfici rimaste sono generiche e riusabili

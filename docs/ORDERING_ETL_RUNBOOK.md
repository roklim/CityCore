# Ordering ETL Runbook

Stato al `12 maggio 2026`.

## Obiettivo

Aprire un percorso ETL concreto Mongo -> Postgres per il verticale `ordering`
senza riattivare la V1 come runtime.

## Stato Decisionale Corrente

- i tenant legacy noti oggi sono:
  - `mucho-gusto` => `audit_only`
  - `sushi` => `ignored_demo`
- questo runbook resta utile come base ETL/audit, ma non e piu il focus
  principale della rimozione V1
- il focus applicativo si e spostato sul `Platform Core`, mentre la parte
  ordering legacy residua viene trattata soprattutto come archivio dati
- gli utenti legacy non vengono piu migrati: il piano attivo e ricrearli in V2

## Script Disponibili

- `npm run etl:ordering:inspect`
  - legge Mongo legacy e mostra i business ordering rilevanti con conteggi e classificazione
- `npm run etl:ordering:compare -- <slug>`
  - confronta i conteggi legacy con il business V2 corrispondente
- `npm run etl:ordering:export -- <slug>`
  - esporta un dataset JSON normalizzato pronto per audit/import
  - di default salta tenant demo/seed non candidati ETL
- `npm run etl:ordering:import`
  - esegue un import pilota in Postgres per i soli dati eleggibili

## Dataset Coperti In Questo Slice

- business ordering legacy
- settings operative
- categorie menu derivate da `menuitems.category`
- menu item
- customer profiles
- coupon
- orders normalizzati per audit/ETL

## Limitazioni Attuali

- lo script non scrive ancora ordini in Postgres
- utenti/access grant legacy non sono importati in questo slice
- i coupon non sono ancora ricollegati agli ordini legacy nel dataset V2
- i clienti senza telefono restano un blocker esplicito per import idempotente
- la classificazione demo/test vs ETL candidate usa euristiche e va confermata sui tenant reali

## Classificazione Tenant

Lo script distingue tra:

- `audit_only`
  - tenant default o fixture tecniche da tenere solo come riferimento/audit
- `ignored_demo`
  - tenant demo da ignorare nel percorso ETL normale
- `eligible_for_import`
  - tenant con segnali coerenti per import selettivo
- `rejected_dirty_data`
  - stato usato a livello record per dati scartati dal filtro ETL

## Regole ETL Attive

- non importare tenant demo/test
- non importare clienti senza telefono valido
- non importare ordini senza cliente coerente, slot valido o righe ordine sane
- non importare coupon legacy
- importare settings solo se diverse dai default V2
- importare menu solo per tenant eleggibili

## Flusso Consigliato

1. `npm run etl:ordering:inspect`
2. `npm run etl:ordering:export -- <slug>`
3. `npm run etl:ordering:compare -- <slug>`
4. `npm run etl:ordering:import`
5. usare il report finale per decidere il cutover dei dati utili

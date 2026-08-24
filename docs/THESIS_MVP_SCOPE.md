# Perimetro MVP della tesi

## Obiettivo

Dimostrare una piattaforma locale city-first in cui un amministratore abilita
una città e un'attività, l'owner completa e pubblica la scheda e un visitatore
la trova, la consulta e invia una richiesta tracciata.

## Core MVP

```text
City
→ Business
→ categorie
→ servizi
→ orari
→ pubblicazione
→ directory
→ ricerca
→ inquiry
→ inbox owner
```

Il core è un unico flusso verificabile:

1. Il global admin crea o abilita una città e un business e assegna l'owner.
2. L'owner, limitato al proprio business, gestisce profilo, categorie, servizi
   e orari.
3. La readiness espone i requisiti mancanti e abilita la pubblicazione solo
   quando la scheda è completa.
4. Il business pubblicato appare nella directory cittadina e nella ricerca con
   filtri basati su categorie e servizi reali.
5. Il visitatore apre la pagina pubblica e invia un'inquiry.
6. L'owner legge e chiude l'inquiry dalla propria inbox.

Il flusso non dipende da fallback editoriali o da chiamate API prive di una
superficie UI corrispondente.

## Funzionalità incluse

- Registry e gestione di City e Business.
- Autenticazione, ruoli, access grant e isolamento del local admin.
- Profilo pubblico con contatti, indirizzo e social configurati dall'owner.
- Categorie cittadine e assegnazioni atomiche al business.
- Servizi con stato editoriale, prezzo indicativo e durata opzionali.
- Orari settimanali e stato aperto/chiuso calcolato nel fuso del business.
- Readiness, pubblicazione e rimozione dalla directory.
- Home, directory cittadina, ricerca testuale e filtri.
- Pagina business pubblica con SEO essenziale e dati strutturati `LocalBusiness`.
- Inquiry pubblica e inbox owner con stato e nota interna.
- Test essenziali per scope, pubblicazione, ricerca e trasformazioni UI.

## Estensione opzionale

`Pickup ordering = estensione dimostrativa opzionale`

Il pickup ordering può essere attivato come modulo aggiuntivo, ma non appartiene
al percorso necessario della tesi. Non è richiesto dalla readiness e non può
bloccare publish, directory, ricerca, inquiry o inbox owner.

## Esclusioni

- Booking avanzato e hospitality verticale.
- Pagamenti ed e-commerce completi.
- Rating e recensioni.
- Distanze, coordinate e mappe avanzate.
- App consumer, preferiti, notifiche e profilo consumer.
- Raccomandazioni personalizzate, chatbot pubblico e builder completo.
- Eventi avanzati e contenuti editoriali promossi.

## Evidenze per la tesi

| Tema                              | Evidenza MVP                                              |
| --------------------------------- | --------------------------------------------------------- |
| Architettura software             | Monorepo, core city-first, API Fastify e schema Prisma    |
| Organizzazione dei servizi locali | City, Business, categorie, servizi e orari                |
| Ricerca                           | Query testuale e filtri su categorie e servizi pubblicati |
| Multi-tenancy e sicurezza         | Access grant, permission e test di isolamento             |
| Ciclo di pubblicazione            | Readiness, publish/unpublish e visibilità pubblica        |
| Validazione end-to-end            | Flusso admin → owner → visitatore → inbox owner           |

## Stato attuale

Il percorso core è implementato e ha superato lo STEP 4: installazione pulita,
controlli Prisma e qualità, test frontend/backend/integration, build e verifica
runtime del flusso owner → visitatore → inbox. Il pickup ordering resta
un'estensione dimostrativa opzionale e non condiziona il risultato del core.

La consegna viene classificata come MVP accademico su città pilota, non come
produzione nazionale. Preparazione, credenziali locali, sequenza della demo e
quality gate sono definiti in `THESIS_DEMO_RUNBOOK.md`.

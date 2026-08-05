# Perimetro MVP della tesi

## Obiettivo

Dimostrare una directory locale city-first in cui un amministratore abilita una
citta e un'attivita, l'owner completa la scheda e un visitatore la trova,
consulta e invia una richiesta di contatto tracciata.

## Flusso end-to-end di accettazione

1. Il global admin accede e attiva/crea una city dal registry.
2. Crea un business associato alla city e assegna owner/local admin.
3. L'owner accede solo al proprio business, inserisce identita, categorie,
   servizi, contatti e orari e visualizza l'anteprima.
4. L'owner pubblica il business.
5. La city pubblica mostra il business; il visitatore usa ricerca e filtri,
   apre il profilo e invia una richiesta di contatto.
6. L'owner vede la richiesta nella propria inbox.

Il flusso e completo soltanto quando i passi 3--6 non dipendono da fallback
editoriali o chiamate dirette all'API non rappresentate nella UI.

## Inclusioni

- Directory locale, registry e gestione city/business.
- Categorie cittadine, servizi essenziali, contatti e orari.
- Pagine pubbliche, ricerca testuale e filtri per categoria/servizio.
- Auth, ruoli, access grant e isolamento verificato del local admin.
- Pubblicazione business e semplice richiesta di contatto/inbox.
- Test essenziali su scope, pubblicazione e ricerca; benchmark ripetibile di
  ricerca su un dataset seed.

## Stato al termine della Fase 2

- Completato: modello/API per categorie, assegnazioni, servizi, orari,
  publish readiness e inquiry scoped.
- In corso: seed dimostrativo e test automatizzati del nuovo backend.
- Non iniziato: ricerca/filtri, UI amministrativa, benchmark e assistente IA.

## Stato al termine della Fase 3

- Completato: seed demo ripetibile, test unitari backend e guardia per il DB
  di test.
- In corso: test d'integrazione completi, da eseguire solo con PostgreSQL test
  dedicato.
- Non iniziato: UI amministrativa MVP, ricerca/filtri, ranking e IA.

## Esclusioni

## Aggiornamento Fase 3B

- Database PostgreSQL di integrazione isolato e ripetibile con Docker Compose.
- Suite Fastify `inject()` su categorie, business, servizi, orari,
  pubblicazione e inquiry, senza test skipped.
- Nessuna UI amministrativa, ricerca, ranking o funzionalità IA introdotta.

## Aggiornamento Fase 3C

- Verifica isolata in copia temporanea per installazione pulita, Prisma generate
  e build, senza interrompere il runtime locale.
- Copertura test estesa per sicurezza inquiry, rate limiting e visibilita
  pubblica condizionata da city/business.

Booking avanzato, pagamenti, e-commerce, recensioni, hospitality, eventi
avanzati, app mobile, mappe avanzate, raccomandazioni personalizzate,
chatbot pubblico e builder completo. L'assistente IA resta un'idea controllata
per una fase successiva: non e requisito implementativo di questo MVP.

## Priorita

| Priorita | Lavoro                                                                                                                                                          |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Must     | Riparare installazione locale; CRUD/UI city-business-owner; categorie, servizi, orari; pubblicazione; ricerca/filtri; contact request; test scope/pubblicazione |
| Should   | Preview coerente al dato persistito; audit esteso; seed dimostrativo; benchmark e documentazione tesi                                                           |
| Could    | Suggestion IA con output vincolato; upload media essenziale; collezioni featured                                                                                |

## Collegamento con la tesi

| Tema di tesi                      | Evidenza MVP                                          |
| --------------------------------- | ----------------------------------------------------- |
| Architettura software             | Monorepo, piattaforma city-first, API e schema Prisma |
| Organizzazione dei servizi locali | City, business, categorie, servizi e orari            |
| Ricerca efficiente                | Query/filtri, indici Prisma, benchmark ripetibile     |
| Multi-tenancy e sicurezza         | Access grant, scope filter, test di isolamento        |
| Validazione prototipale           | Flusso admin-owner-visitatore e seed demo             |

## Piano sintetico di due settimane

- Giorni 1--2: ripristino `npm ci`/Docker/Prisma, seed coerente, test auth e
  scope.
- Giorni 3--5: modelli/API/UI di categorie, servizi, orari e pubblicazione.
- Giorni 6--8: ricerca/filtri e pagine pubbliche solo live data.
- Giorni 9--10: richieste di contatto e inbox owner.
- Giorni 11--12: test e benchmark; correzioni e seed demo.
- Giorni 13--14: verifica end-to-end, screenshot/dati della tesi e demo.

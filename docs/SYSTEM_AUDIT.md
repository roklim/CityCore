# Audit completo del sistema

## Prompt operativo

> Esegui un audit end-to-end completo di CityCore sulla working tree attuale,
> trattandolo come piattaforma city-first multi-ruolo. Verifica e prova, senza
> perdere modifiche esistenti, tutti i percorsi per visitatore pubblico, global
> admin, city admin, local admin e staff: autenticazione e cambio scope;
> creazione/attivazione città; CRUD categorie e gerarchie; creazione attività e
> assegnazione gestore; profilo, categorie, servizi, orari, moduli, readiness,
> pubblicazione/unpublish; directory, ricerca, filtri, pagina pubblica, inquiry
> e inbox; pickup ordering opzionale; permessi, isolamento tra scope, errori,
> stati vuoti e responsive. Per ogni flusso controlla API, UI, navigazione,
> testi, feedback, prerequisiti e recupero dagli errori. Correggi bug reali e
> incoerenze UX, armonizza componenti e linguaggio senza redesign o feature
> fuori scope, usa solo dati reali e preserva sicurezza e routing city-first.
> Aggiungi test mirati per ogni regressione, aggiorna documentazione e matrice
> di accettazione, quindi esegui test unitari/integration, lint, format,
> typecheck, build, verifier e smoke runtime. Restituisci evidenze, problemi
> corretti, limiti residui e stato di ogni ruolo/flusso. Non eseguire commit,
> push o deploy senza richiesta esplicita.

## Matrice di accettazione

| Ruolo/superficie | Percorso                                        | Stato         |
| ---------------- | ----------------------------------------------- | ------------- |
| Visitatore       | Home → città → ricerca/filtri → attività        | Da verificare |
| Visitatore       | Servizi, orari, contatti e social reali         | Da verificare |
| Visitatore       | Inquiry → conferma → inbox owner                | Da verificare |
| Visitatore       | Pickup opzionale → disponibilità → ordine       | Da verificare |
| Global admin     | Login/bootstrap → dashboard → cambio scope      | Da verificare |
| Global admin     | Registry → città → attivazione → categorie      | Da verificare |
| Global admin     | Attività → gestore → accesso iniziale           | Da verificare |
| City admin       | Gestione isolata della propria città            | Da verificare |
| Local admin      | Profilo, categorie, servizi, orari e moduli     | Da verificare |
| Local admin      | Readiness → publish/unpublish → pagina pubblica | Da verificare |
| Local admin      | Inquiry e ordini nel proprio business           | Da verificare |
| Staff            | Lettura business e sole modifiche autorizzate   | Da verificare |
| Sicurezza        | Cross-city/cross-business, input e rate limit   | Da verificare |
| Qualità          | Responsive, accessibilità, errori e stati vuoti | Da verificare |

## Risultati dell'audit del 12 agosto 2026

L'audit ha confermato che le route pubbliche sono anonime e che il core
city-first è presente. Ha inoltre individuato e corretto problemi trasversali
che il gate precedente non copriva: onboarding credenziali owner, separazione
dei campi amministrativi dal profilo business, revoca dell'ex owner, filtri
scope fail-closed, stato pubblico dipendente anche dalla città, catalogo vuoto
senza dati demo, SEO persistita, configurazione pickup e gestione password
temporanee.

| Ruolo/superficie | Percorso                                        | Stato dopo le correzioni                       |
| ---------------- | ----------------------------------------------- | ---------------------------------------------- |
| Visitatore       | Home → città → ricerca/filtri → attività        | Implementato; anonimo                          |
| Visitatore       | Servizi, orari, contatti e social reali         | Implementato                                   |
| Visitatore       | Inquiry → conferma → inbox owner                | Implementato                                   |
| Visitatore       | Pickup opzionale → disponibilità → ordine       | Estensione opzionale configurabile             |
| Global admin     | Login/bootstrap → dashboard → cambio scope      | Implementato; bootstrap protetto in produzione |
| Global admin     | Registry → città → attivazione → categorie      | Implementato e guidato                         |
| Global admin     | Attività → gestore → accesso iniziale           | Implementato con password temporanea           |
| City admin       | Gestione isolata della propria città            | Implementato e scoped                          |
| Local admin      | Profilo, categorie, servizi, orari e moduli     | Implementato                                   |
| Local admin      | Readiness → publish/unpublish → pagina pubblica | Implementato con invarianti post-publish       |
| Local admin      | Inquiry e ordini nel proprio business           | Implementato e scoped                          |
| Staff            | Lettura business e sole modifiche autorizzate   | Implementato; PII operative escluse            |
| Sicurezza        | Cross-city/cross-business, input e rate limit   | Rafforzato e coperto da regressioni mirate     |
| Qualità          | Responsive, accessibilità, errori e stati vuoti | Uniformato sulle superfici core                |

### Decisioni operative

- Un gestore nuovo riceve una password temporanea di almeno 12 caratteri;
  l'amministratore può ruotarla e invalidare le sessioni precedenti. Non viene
  simulato un reset via email in assenza di un provider di posta.
- Il PATCH generico del profilo non pubblica una scheda e non modifica piano,
  subscription o owner senza il permesso amministrativo specifico.
- Un business è indicato come pubblico soltanto se sia il business sia la città
  sono pubblicati e abilitati.
- Il catalogo live vuoto resta vuoto: i contenuti editoriali dimostrativi sono
  usati solo nello stato degradato esplicitamente segnalato.
- Un servizio entra nel menu pickup soltanto dopo una scelta esplicita; avere
  un prezzo non basta.
- `NEXT_PUBLIC_SITE_URL` definisce l'origine canonica per metadata, robots e
  sitemap; va impostata in ogni ambiente pubblicato.

## Verifica conclusiva

| Controllo                         | Esito                                 |
| --------------------------------- | ------------------------------------- |
| Test web                          | 81/81 PASS                            |
| Unit test API                     | 10/10 PASS                            |
| Test d'integrazione               | 23/23 PASS                            |
| Coverage unit API                 | 79,37% statement; 82,47% linee        |
| Typecheck di tutti i workspace    | PASS                                  |
| Lint e format                     | PASS                                  |
| Prisma validate/migration status  | PASS; 5 migrazioni applicate          |
| Build web e API                   | PASS                                  |
| `verify:platform`                 | PASS                                  |
| Runtime pubblico senza login      | PASS su home, città e scheda attività |
| Login global admin e registri     | PASS sul runtime locale               |
| Robots, sitemap e health endpoint | PASS                                  |

Lo smoke runtime ha rilevato una città pubblica, cinque attività pubbliche e
sei attività complessive nel registro amministrativo. Le route pubbliche hanno
risposto senza credenziali; il login reale ha restituito lo scope
`global_admin` e l'accesso ai registri città e attività.

### Limiti operativi noti

- Il database locale contiene ancora contenuti editoriali con diciture
  `demo`/`smoke`. Sono dati persistiti, non fallback generati dal frontend: la
  loro eventuale riscrittura richiede una decisione editoriale e non è stata
  eseguita automaticamente.
- Il rate limit autenticazione è limitato e fail-safe ma vive nel processo API;
  un deploy futuro con più repliche dovrà condividerlo tramite Redis.
- L'hashing `scrypt` resta sincrono per compatibilità con gli hash esistenti;
  prima di carichi elevati va spostato fuori dal thread principale.
- Il recupero password è amministrativo tramite password temporanea. Un flusso
  self-service richiede un provider email reale e non viene simulato.

## Regole di intervento

- Correggere soltanto problemi riproducibili o incoerenze dimostrabili.
- Non introdurre dati pubblici fittizi, rating, recensioni o coordinate.
- Mantenere il pickup ordering separato dalla readiness core.
- Conservare permessi scoped e routing pubblico city-first.
- Registrare nel report finale test, evidenze e limiti residui.

# Product Refinement Roadmap

Stato di riferimento: `13 maggio 2026`.

## Obiettivo

Questa scaletta serve a trasformare la V2 attuale da base tecnica solida a
prodotto realmente presentabile, vendibile e poi scalabile.

Non e una roadmap di architettura. E una roadmap di rifinitura prodotto.

Il prodotto va trattato come:

- piattaforma cittadina per trovare attivita locali
- gestionale semplice per piccole imprese
- esperienza mobile-first per utenti finali e operatori business

Il prodotto usa ora il nome `CityCore`.

## Principio Guida

L'ordine corretto non e:

1. aggiungere piu feature possibile
2. fare billing subito
3. allargare il dominio troppo presto

L'ordine corretto e:

1. chiarire il messaggio
2. rendere forti le superfici pubbliche
3. rendere il local admin uno strumento davvero usabile
4. costruire onboarding e trust
5. solo dopo preparare vendita e monetizzazione

## Fase 1 - Presentabile

Obiettivo:
fare in modo che il prodotto non sembri piu un cantiere tecnico, ma una
piattaforma reale e credibile.

### 1. Posizionamento e messaggio

Obiettivo:
far capire in modo immediato cos'e il prodotto e per chi e.

Da fare:

- definire una frase madre unica per tutto il prodotto
- eliminare il linguaggio da sviluppatore o da architettura
- evitare messaggi troppo larghi come "piattaforma per tutto"
- evitare un tono troppo food-specific
- allineare home, city page, business page, admin login

Risultato atteso:

- il prodotto si presenta in modo coerente
- utente finale e business capiscono subito il valore

### 2. Home

Obiettivo:
trasformare la home in una pagina che orienta e converte.

Da togliere:

- testo troppo astratto
- struttura che parla piu della piattaforma che dell'utente
- CTA troppe o equivalenti

Da aggiungere o migliorare:

- hero con promessa concreta
- una CTA primaria chiara
- una CTA secondaria per business/partner
- blocco citta attive semplice e leggibile
- sezione "come funziona" piu breve e piu diretta
- attivita in evidenza piu concrete
- trust block
- footer serio

Priorita mobile:

- CTA visibile subito
- citta attive leggibili senza scroll lungo
- hero corto e forte

Risultato atteso:

- un utente capisce dove iniziare
- un business capisce che puo esserci dentro

### 3. City page

Obiettivo:
far sembrare ogni citta un luogo vivo e utile, non una lista tecnica.

Da fare:

- header citta piu forte
- filtri piu leggibili
- sezioni chiare come "in evidenza", "vicino a te", "piu richiesti"
- card business piu informative
- microcopy orientato alla scelta
- piu segnali di contesto locale

Priorita mobile:

- filtri semplici
- card leggibili in una sola colonna
- CTA della card sempre visibile

Risultato atteso:

- la pagina citta sembra gia utile anche con pochi business

### 4. Business page

Obiettivo:
farla sembrare una scheda che converte, non solo una presentazione.

Da fare:

- above the fold molto piu forte
- nome, servizio, contatti, orari, CTA subito visibili
- modulo principale piu centrale
- blocchi trust e info pratiche ordinati meglio
- policy, FAQ, tempi, disponibilita piu leggibili
- mobile con CTA dominante

Priorita mobile:

- CTA principale nelle prime schermate
- contatti e orari subito visibili
- niente densita eccessiva

Risultato atteso:

- l'utente sa cosa fare
- la pagina sembra seria anche a un business

### 5. Copy e contenuti

Obiettivo:
tagliare il tono da progetto e passare a tono da prodotto.

Da fare:

- eliminare parole come V2, platform core, surface, capability dalle pagine utente
- riscrivere microcopy dei blocchi pubblici
- usare linguaggio piu semplice e orientato all'azione
- far capire il beneficio piu che la struttura

Risultato atteso:

- il prodotto smette di sembrare interno o tecnico

## Fase 2 - Vendibile

Obiettivo:
fare in modo che il prodotto possa essere mostrato a clienti veri e sostenere
una prima proposta commerciale.

### 6. Local admin

Obiettivo:
trasformarlo in uno strumento da banco, non in una dashboard generica.

Da fare:

- priorita a ordini/richieste del giorno
- overview piu corta
- azioni principali piu grandi e piu vicine
- menu/settings piu semplici da modificare
- task-first design
- piu usabilita da telefono

Priorita mobile:

- azioni rapide sopra la piega
- meno tabelle, piu cards o liste
- aggiornamenti di stato molto veloci

Risultato atteso:

- un titolare pensa "ci lavoro davvero da qui"

### 7. Global admin

Obiettivo:
farlo sembrare uno strumento di governance chiaro e ordinato.

Da fare:

- ordinare meglio city registry, cities, businesses, access, audit
- usare naming meno tecnico
- evidenziare workflow veri e non solo dati
- preparare superfici piu chiare per creazione/modifica

Risultato atteso:

- la piattaforma si gestisce senza sembrare un pannello provvisorio

### 8. Onboarding business

Obiettivo:
portare un'attivita online senza farle capire il sistema interno.

Da costruire:

- wizard guidato
- scelta citta
- scelta categoria/template
- dati base
- modulo principale
- preview pubblica
- pubblicazione

Risultato atteso:

- da sistema tecnico a prodotto attivabile

### 9. Trust e credibilita

Obiettivo:
far sembrare il prodotto acquistabile e non solo interessante.

Da fare:

- footer completo
- privacy
- termini
- contatti
- pagina per partner/business
- pagina come funziona
- segnali di affidabilita e ownership

Risultato atteso:

- il prodotto sembra gestito da qualcuno di serio

### 10. Demo commerciale

Obiettivo:
poter mostrare sempre la stessa storia forte e semplice.

Da preparare:

- una citta demo credibile
- 2 o 3 business demo forti
- un flusso ordering reale
- un flusso local admin reale
- script demo breve e ripetibile

Da mostrare in demo:

1. ingresso da home o pagina citta
2. apertura scheda business
3. azione utente reale
4. ricezione lato business
5. gestione da admin locale

Da non mettere al centro della demo:

- access grants
- audit logs
- registry
- concetti architetturali

Risultato atteso:

- puoi farlo vedere senza doverlo spiegare troppo

### 11. Packaging commerciale

Obiettivo:
definire cosa vende il prodotto prima di implementare billing.

Da fare:

- decidere il primo wedge commerciale
- definire 3 livelli semplici
- chiarire cosa compra il cliente
- chiarire chi e il cliente iniziale

Suggerimento:

- Base
- Pro
- Premium

Risultato atteso:

- il prodotto smette di essere percepito come troppo generico

## Fase 3 - Scalabile

Obiettivo:
passare da primo prodotto vendibile a piattaforma piu solida e pronta a crescere.

### 12. Billing e monetizzazione

Da fare dopo che il prodotto e gia vendibile:

- checkout
- sottoscrizioni
- piani
- upgrade/downgrade
- documenti fiscali integrati nel modo giusto

Risultato atteso:

- il prodotto puo essere venduto senza flussi manuali

### 13. Assets

Obiettivo:
chiudere la gestione media e visual dei business.

Da fare:

- upload asset
- immagini business
- gestione cover/logo/gallery
- supporto a pagine pubbliche piu credibili

Risultato atteso:

- i business sembrano davvero online e curati

### 14. Workflow piu completi

Da fare:

- workflow admin piu profondi
- audit piu leggibile
- automazioni operative
- gestione moduli oltre ordering

Risultato atteso:

- il prodotto tiene meglio nel tempo e su piu use case

### 15. Osservabilita e stabilita commerciale

Da fare:

- monitoring
- smoke automatici
- analytics prodotto
- support tooling
- runbook di gestione

Risultato atteso:

- meno rischio operativo mentre crescono clienti e casi d'uso

## Ordine Operativo Raccomandato

Se devi procedere a blocchi, l'ordine corretto e questo:

1. fissare messaggio e posizionamento
2. rifare la home
3. rifinire la city page
4. rifinire la business page
5. rendere il local admin davvero task-first
6. migliorare il global admin
7. costruire onboarding business
8. aggiungere trust pages e contenuti seri
9. preparare demo commerciale
10. definire packaging
11. solo dopo introdurre billing

## Errori Da Evitare

- allargare troppo il messaggio troppo presto
- parlare da sviluppatore nelle superfici pubbliche
- spingere billing prima di onboarding e demo
- mettere il global admin al centro del racconto prodotto
- voler chiudere tutti i verticali prima di avere un use case forte
- usare una UI pulita ma ancora poco concreta

## Definizione Delle Tre Fasi

### Presentabile

Deve esserci davvero:

- home forte
- city page forte
- business page forte
- copy coerente
- look credibile
- local admin leggibile

### Vendibile

Deve esserci davvero:

- onboarding business
- demo seria
- trust pages
- local admin convincente
- packaging chiaro
- ambiente online stabile

### Scalabile

Deve esserci davvero:

- billing
- assets
- workflow admin piu completi
- osservabilita
- crescita multi-verticale ordinata

## Uso Pratico Di Questo Documento

Quando lavori ai prossimi step:

- prendi un solo blocco per volta
- non mischiare rifinitura pubblica con billing
- non mischiare demo commerciale con cleanup tecnico profondo
- privilegia cio che aumenta percezione di prodotto e usabilita reale

Il prossimo blocco corretto, oggi, e:

1. messaggio/posizionamento
2. home
3. city page
4. business page

Solo dopo ha senso entrare nell'onboarding e nella vendita vera.

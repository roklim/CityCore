# Runbook della demo di tesi

## Obiettivo

La demo presenta CityCore come MVP city-first verificato su Cagli. Non dimostra un rollout
nazionale già operativo: dimostra il modello `Platform -> City -> Business`, l'isolamento degli
accessi, l'agenda pubblica minima e il flusso completo dalla pubblicazione alla richiesta del
visitatore. L'elaborato richiesto è il libretto scritto; questo runbook non presuppone slide.

## Perimetro da dichiarare

Il percorso obbligatorio della tesi è:

```text
global admin
-> abilita City e Business
-> assegna owner
-> owner completa profilo, categorie, servizi e orari
-> pubblica
-> visitatore trova il Business
-> consulta gli eventi pubblicati della City
-> invia una richiesta
-> owner gestisce la richiesta in inbox
```

Il pickup ordering di Mucho Gusto è un'estensione dimostrativa. Gli eventi sono limitati a record
sintetici persistiti e consultazione pubblica read-only: CRUD admin, ricorrenze, ticketing e
prenotazioni restano evoluzioni successive, insieme a booking, hospitality verticale, listing,
billing, domini personalizzati e rollout nazionale.

## Piano operativo delle due giornate

Il timebox serve a chiudere la tesi, non ad ampliare il prodotto. Durante queste due giornate non
si introducono nuovi moduli o refactor laterali.

### Giorno 1 - Stabilizzazione e percorso completo

1. Partire da un clone o una working tree pulita e completare la preparazione locale descritta
   sotto.
2. Eseguire il quality gate completo, inclusi i test d'integrazione sul database isolato.
3. Creare soltanto dati sintetici e provare senza scorciatoie il percorso global admin, owner,
   pubblicazione, visitatore, agenda eventi, inquiry e inbox.
4. Verificare ruoli e isolamento aprendo un secondo owner che non deve vedere il business altrui.
5. Eseguire `npm run benchmark:search`, conservando nel libretto solo metodo, limiti e risultati
   della revisione congelata.
6. Correggere esclusivamente difetti bloccanti o incongruenze visibili nella sequenza di tesi.
7. Annotare commit, configurazione e credenziali demo in un supporto privato esterno al repository.

Uscita del giorno 1: percorso obbligatorio ripetibile due volte, test verdi e nessun difetto
bloccante aperto.

### Giorno 2 - Staging, prova generale e freeze

1. Eseguire l'audit legacy sul database staging e applicare le migrazioni soltanto tramite il
   wrapper documentato.
2. Distribuire il commit già validato; controllare health web/API, home, Cagli, Mucho Gusto,
   login, Privacy e Termini.
3. Ripetere la sequenza in viewport desktop e mobile, usando esclusivamente dati fittizi.
4. Registrare un video di riserva e acquisire screenshot delle tappe fondamentali.
5. Fare almeno due prove cronometrate della discussione senza slide, includendo indice di ricerca,
   limiti e roadmap nazionale.
6. Congelare il commit della tesi: dopo il freeze si accettano soltanto correzioni che impediscono
   la demo o la build.

Uscita del giorno 2: staging verificato, backup offline disponibile, revisione annotata nel registro
privato di consegna e decisione `go` per la tesi. Se uno di questi elementi manca, usare la demo
locale preparata invece di improvvisare modifiche all'ultimo momento.

## Preparazione pulita

Requisiti: Docker Desktop, Node.js compatibile con il runtime dichiarato dal repository e npm.

```bash
npm ci
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
npm run infra:up
npm run db:migrate:deploy
npm run db:generate
```

Usare esclusivamente una password locale temporanea per il dataset dimostrativo:

```bash
DEMO_SEED_PASSWORD="password-locale-di-almeno-12-caratteri" npm run db:seed
```

In PowerShell usare invece:

```powershell
$env:DEMO_SEED_PASSWORD = "password-locale-di-almeno-12-caratteri"
npm run db:seed
Remove-Item Env:DEMO_SEED_PASSWORD
```

Il seed prepara gli account seguenti con la password fornita dall'ambiente:

- `global-admin@citycore.demo`
- `owner-one@citycore.demo`
- `owner-two@citycore.demo`

Il seed crea inoltre tre eventi sintetici di Cagli con date fisse nel giugno 2030. Servono a mostrare
ordinamento, intervallo temporale, luogo e collegamento opzionale all'organizzatore; non sono eventi
reali né un feed aggiornato automaticamente.

Le credenziali non devono essere pubblicate nel repository, nel libretto o durante una
registrazione.

## Avvio

```bash
npm run dev
```

Superfici da verificare prima della discussione:

- `http://localhost:3000/`
- `http://localhost:3000/cagli`
- `http://localhost:3000/cagli/mucho-gusto`
- `http://localhost:3000/admin/login`
- `http://localhost:3000/api/health`
- `http://localhost:4000/health`

## Sequenza consigliata per la dimostrazione orale

1. Aprire la home e spiegare la navigazione city-first.
2. Entrare in Cagli e mostrare ricerca e filtri della directory; chiarire che l'indice a trigrammi
   opera in memoria sui Business già caricati, non nel database.
3. Mostrare l'agenda cronologica e dichiarare che è una vista pubblica read-only su dati demo.
4. Aprire Mucho Gusto, distinguendo chiaramente immagini e menu dimostrativi.
5. Inviare un'inquiry usando esclusivamente dati fittizi.
6. Accedere come owner e mostrare profilo, readiness, pubblicazione e inbox.
7. Accedere come global admin e mostrare City, Business e access grant.
8. Chiudere con test automatici, benchmark riproducibile, limiti noti e roadmap nazionale.

Non modificare migrazioni, ambiente o dati durante la presentazione. Preparare il database e
riscaldare web/API almeno dieci minuti prima.

## Quality gate prima della consegna

```bash
npm run db:validate
npm test
npm --workspace @platform/web run test
npm run test:integration
npm run lint
npm run format:check
npm run typecheck
npm run build
npm run benchmark:search
```

I test d'integrazione devono usare `DATABASE_URL_TEST`, separato da `DATABASE_URL` e contenente
la parola `test`. Il runner rifiuta il database di sviluppo.

## Checklist finale

- working tree noto e revisione annotata nel registro privato di consegna;
- health web e API verdi;
- demo provata sia in viewport desktop sia mobile;
- agenda di Cagli ordinata e chiaramente identificata come dataset sintetico;
- benchmark rieseguito sulla stessa revisione citata nel libretto;
- nessun dato personale reale inserito;
- pagine Privacy e Termini raggiungibili;
- account e password demo conservati fuori dal repository;
- screenshot o registrazione di riserva disponibili;
- limiti e funzionalità future dichiarati senza presentare il prototipo come produzione nazionale.

## Piano di riserva

Se lo staging esterno non è disponibile, usare l'ambiente locale preparato e una registrazione del
flusso completo. Se l'API è indisponibile, non usare i fallback editoriali come prova di un flusso
live: mostrare il problema, ripristinare l'API e ripetere la dimostrazione.

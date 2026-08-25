# Valutazione dell'efficienza della ricerca pubblica

## Obiettivo

Questa valutazione confronta due strategie che producono gli stessi risultati nella directory
pubblica di CityCore:

1. la scansione lineare originaria, che normalizza e controlla tutti i campi a ogni query;
2. un indice invertito in memoria, costruito una volta per dataset, con posting list di trigrammi e
   categorie.

Il confronto risponde alla componente algoritmica del prototipo. Non misura l'intera applicazione e
non dimostra che CityCore sia già dimensionato per una distribuzione nazionale.

## Strategie confrontate

### Scansione lineare

`filterPublicBusinessesBySection` attraversa l'elenco dei business, normalizza nome, descrizione,
località, categorie e termini dei servizi, verifica la presenza della query come sottostringa e
applica l'eventuale categoria. Indicando con `S` il numero complessivo di caratteri ricercabili, il
costo per query cresce linearmente con i dati attraversati, al netto del costo del confronto della
sottostringa.

### Indice invertito a trigrammi

`createPublicBusinessSearchIndex` normalizza i documenti una volta e costruisce:

- `Map<trigramma, posting list>` per ottenere i candidati di una query di almeno tre caratteri;
- `Map<categoria, posting list>` per il filtraggio categoriale;
- l'elenco dei valori normalizzati per la verifica finale dei candidati.

Le posting list vengono popolate nell'ordine dei business e restano ordinate. La ricerca interseca
prima le liste più corte e applica infine lo stesso controllo `includes` della baseline. Quest'ultimo
passaggio elimina i falsi positivi dei trigrammi e mantiene invariati semantica, ordine e risultati.
Le query di uno o due caratteri non hanno trigrammi e usano una scansione dei documenti già
normalizzati.

La costruzione richiede tempo e memoria proporzionali al testo indicizzato e al numero di
associazioni trigramma-documento. Una query selettiva visita invece le posting list coinvolte e i
candidati sopravvissuti. Nel caso peggiore, con termini presenti in quasi tutti i documenti, il costo
resta lineare; l'indice non cambia quindi il limite asintotico di ogni possibile query.

## Complessità asintotica

Siano `D` il numero di Business nel catalogo cittadino già caricato, `L` la lunghezza media in
caratteri dei campi indicizzati per documento e `Q` la lunghezza della query.

### Scansione lineare

Ogni query normalizza e confronta tutti i `D` documenti: costo per query `O(D·L)` nel caso peggiore,
senza interruzione anticipata. Non richiede fase di costruzione né memoria oltre al catalogo stesso:
spazio `O(1)` aggiuntivo.

### Indice invertito a trigrammi

**Costruzione**: per ciascun documento si estraggono `O(L)` trigrammi, popolando le posting list in
tempo complessivo `O(D·L)` e spazio `O(D·L)` nel caso peggiore, limitato in pratica dal numero di
trigrammi distinti effettivamente presenti nel vocabolario, come osservato nei risultati (la tabella
di costruzione mostra i trigrammi stabilizzarsi mentre le posting crescono).

**Query**: si estraggono `O(Q)` trigrammi dalla query, si recuperano le posting list corrispondenti e
si intersecano a partire dalla più corta, in tempo proporzionale alla somma delle loro lunghezze; la
verifica finale per sottostringa costa `O(c·L)`, dove `c` è il numero di candidati sopravvissuti
all'intersezione. Nel caso peggiore — una query i cui trigrammi compaiono in quasi tutti i documenti
— `c` tende a `D` e il costo torna `O(D·L)`: l'indice non abbassa la complessità del caso peggiore di
una singola query, sposta il lavoro medio dalla query alla costruzione, ammortizzandolo su tutte le
query successive sullo stesso catalogo. Le query di una o due lettere restano `O(D)` perché non
generano trigrammi e riusano soltanto i campi pre-normalizzati.

Questa analisi prevede esattamente il comportamento empirico della sezione Risultati: speed-up molto
elevati sugli scenari selettivi (`rara`, `assente`, dove `c` è piccolo o nullo) e speed-up modesti su
`solo categoria`, dove entrambe le strategie svolgono già un lavoro ridotto e il vantaggio si riduce
al solo costo evitato di attraversare l'intero catalogo.

## Strutture alternative considerate

Prima di adottare l'indice a trigrammi sono state valutate, e scartate per questo prototipo, tre
alternative:

- **Tabella hash su token esatti**: costo atteso `O(1)` per query di corrispondenza esatta su un
  intero campo, ma inadatta a sottostringhe parziali. La ricerca pubblica deve trovare "gust" dentro
  "Mucho Gusto", non solo l'intero token: una tabella hash da sola non risolve il problema posto.
- **Trie o albero dei suffissi sui campi indicizzati**: garantirebbe query di sottostringa in tempo
  proporzionale alla sola lunghezza del pattern più il numero di occorrenze trovate, asintoticamente
  migliore dell'intersezione di posting list nel caso peggiore. Scartato per la complessità
  implementativa e di manutenzione sproporzionata rispetto alla scala del prototipo, non perché
  inferiore in teoria: resta l'estensione naturale se il catalogo crescesse di ordini di grandezza.
- **Full-text search o `pg_trgm` lato PostgreSQL**: sposterebbe l'indicizzazione dal client al
  database, risolvendo anche il limite del fetch paginato discusso in "Limiti applicativi". Non è
  stato scelto per questo esperimento perché l'obiettivo dichiarato era isolare e misurare l'effetto
  della struttura dati lato applicazione, non sostituire l'architettura di recupero dati; resta la
  strada più realistica per un'evoluzione oltre il prototipo cittadino.

Il criterio di scelta finale è stato quindi il rapporto fra beneficio atteso e costo di
implementazione entro il perimetro della tesi, non l'assunto che i trigrammi siano la struttura
ottimale in assoluto. La stessa piattaforma usa del resto una struttura diversa dove il problema è
diverso: l'indice B-tree composito `(city_id, status, active, starts_at)` su `CityEvent` (vedi
`ARCHITECTURE.md`) risolve un ordinamento per intervallo su una tabella persistita, non
un'appartenenza per sottostringa su un catalogo già in memoria — due strutture per due problemi,
scelte con lo stesso criterio.

## Correttezza

La suite `apps/web/src/lib/public-search.test.ts` verifica la parità con la scansione lineare per:

- query vuote, corte, con accenti, rare e assenti;
- categorie reali, fallback di template e categorie mancanti;
- ricerca combinata per testo e categoria;
- corrispondenze su servizi;
- assenza di corrispondenze artificiali tra campi adiacenti.

Il benchmark interrompe inoltre l'esecuzione se le due strategie producono sequenze differenti.

## Protocollo

- Data locale: 25 agosto 2026.
- Revisione di base: `fc67693`, con l'indice nella working tree da congelare nel commit finale.
- Runtime: Node.js `v22.15.0`, Windows x64.
- CPU: Intel Core i5-12600K, 16 processori logici.
- Memoria di sistema: 15,7 GiB.
- Dataset sintetici deterministici: 100, 1.000, 5.000, 10.000 e 25.000 business.
- Ripetizioni di costruzione dell'indice: 3, con garbage collection tra le prove.
- Warm-up: 5 esecuzioni per strategia, scenario e dimensione.
- Ripetizioni misurate: 100 fino a 1.000 elementi, 60 a 5.000, 40 a 10.000 e 30 a
  25.000.
- Comando: `npm run benchmark:search`.

Gli scenari sono:

- `rara`: un solo risultato;
- `comune`: tutti i business;
- `assente`: nessun risultato e posting mancante;
- `corta`: query di due caratteri, quindi fallback sui documenti pre-normalizzati;
- `testo+categoria`: testo comune e categoria che conserva un quarto dei business;
- `solo categoria`: nessun testo e categoria che conserva un quarto dei business.

## Risultati

### Costruzione dell'indice

| Elementi | Build p50 (ms) | Build max (ms) | Trigrammi |   Posting |
| -------: | -------------: | -------------: | --------: | --------: |
|      100 |          4,856 |          5,875 |       232 |     8.424 |
|    1.000 |         34,950 |         44,009 |     1.132 |    85.239 |
|    5.000 |        293,811 |        304,719 |     1.132 |   426.627 |
|   10.000 |        568,708 |        606,053 |     1.132 |   853.362 |
|   25.000 |      1.607,353 |      1.651,196 |     1.134 | 2.133.529 |

Il numero di trigrammi distinti si stabilizza perché il dataset usa un vocabolario ripetuto, mentre
le posting crescono quasi linearmente. Le posting non rappresentano il consumo totale di memoria:
le strutture `Map`, gli array JavaScript, le stringhe e i documenti normalizzati aggiungono overhead
non misurato.

### Query su 100 elementi

| Scenario        | Risultati | Scan p50 | Scan p95 | Indice p50 | Indice p95 | Speed-up p95 |
| --------------- | --------: | -------: | -------: | ---------: | ---------: | -----------: |
| rara            |         1 |    0,722 |    0,988 |      0,006 |      0,029 |       33,60× |
| comune          |       100 |    0,672 |    0,829 |      0,019 |      0,038 |       22,05× |
| assente         |         0 |    0,679 |    1,192 |      0,005 |      0,007 |      183,34× |
| corta           |       100 |    0,684 |    0,995 |      0,012 |      0,017 |       59,56× |
| testo+categoria |        25 |    0,742 |    2,432 |      0,021 |      0,111 |       21,85× |
| solo categoria  |        25 |    0,003 |    0,004 |      0,003 |      0,004 |        1,11× |

### Query su 1.000 elementi

| Scenario        | Risultati | Scan p50 | Scan p95 | Indice p50 | Indice p95 | Speed-up p95 |
| --------------- | --------: | -------: | -------: | ---------: | ---------: | -----------: |
| rara            |         1 |    7,469 |   11,329 |      0,013 |      0,016 |      726,21× |
| comune          |     1.000 |    6,797 |    9,721 |      0,115 |      0,152 |       63,74× |
| assente         |         0 |    7,372 |   16,774 |      0,009 |      0,010 |    1.711,60× |
| corta           |     1.000 |   14,118 |   21,373 |      0,135 |      0,157 |      135,79× |
| testo+categoria |       250 |   15,176 |   19,465 |      0,176 |      0,665 |       29,27× |
| solo categoria  |       250 |    0,032 |    0,047 |      0,013 |      0,021 |        2,23× |

### Query su 5.000 elementi

| Scenario        | Risultati | Scan p50 | Scan p95 | Indice p50 | Indice p95 | Speed-up p95 |
| --------------- | --------: | -------: | -------: | ---------: | ---------: | -----------: |
| rara            |         1 |   75,344 |   87,836 |      0,079 |      0,306 |      287,52× |
| comune          |     5.000 |   73,421 |   91,588 |      0,970 |      1,367 |       67,00× |
| assente         |         0 |   76,824 |  109,968 |      0,009 |      0,010 |   11.575,62× |
| corta           |     5.000 |   72,853 |   87,737 |      0,699 |      0,986 |       89,02× |
| testo+categoria |     1.250 |   72,493 |   88,430 |      0,910 |      1,239 |       71,38× |
| solo categoria  |     1.250 |    0,165 |    0,195 |      0,050 |      0,061 |        3,19× |

### Query su 10.000 elementi

| Scenario        | Risultati | Scan p50 | Scan p95 | Indice p50 | Indice p95 | Speed-up p95 |
| --------------- | --------: | -------: | -------: | ---------: | ---------: | -----------: |
| rara            |         1 |  155,535 |  179,419 |      0,168 |      0,282 |      635,56× |
| comune          |    10.000 |  153,824 |  200,705 |      2,603 |      3,984 |       50,37× |
| assente         |         0 |  148,443 |  265,368 |      0,009 |      0,011 |   24.571,14× |
| corta           |    10.000 |  150,937 |  174,044 |      1,525 |      2,208 |       78,81× |
| testo+categoria |     2.500 |  147,740 |  162,598 |      1,775 |      2,420 |       67,19× |
| solo categoria  |     2.500 |    0,292 |    0,690 |      0,096 |      0,272 |        2,54× |

### Query su 25.000 elementi

| Scenario        | Risultati | Scan p50 |  Scan p95 | Indice p50 | Indice p95 | Speed-up p95 |
| --------------- | --------: | -------: | --------: | ---------: | ---------: | -----------: |
| rara            |         1 |  388,219 |   488,499 |      0,320 |      0,365 |    1.339,46× |
| comune          |    25.000 |  373,777 |   452,640 |      9,914 |     13,385 |       33,82× |
| assente         |         0 |  382,044 |   475,745 |      0,010 |      0,012 |   40.317,40× |
| corta           |    25.000 |  709,507 | 1.788,392 |      8,569 |     33,028 |       54,15× |
| testo+categoria |     6.250 |  813,555 | 1.382,077 |     16,623 |     58,726 |       23,53× |
| solo categoria  |     6.250 |    1,208 |     3,290 |      0,387 |      1,260 |        2,61× |

Tutti i tempi delle query sono espressi in millisecondi.

## Interpretazione

L'indice sposta il costo della normalizzazione e dell'organizzazione dei dati dalla singola query a
una fase iniziale. Su 25.000 elementi la costruzione ha un p50 di circa 1,61 secondi. Nello stesso
dataset, il p95 della query comune scende da circa 453 a 13 ms e quello della query rara da circa
488 a meno di 1 ms. Il vantaggio massimo delle query assenti deriva dalla possibilità di terminare
subito quando manca una posting list; questi rapporti molto elevati non vanno generalizzati a query
reali arbitrarie.

Anche le query corte migliorano perché riusano documenti già normalizzati, ma non sfruttano i
trigrammi. Il filtro di sola categoria mostra un vantaggio più contenuto, dato che entrambe le
strategie svolgono già un lavoro semplice; l'indice evita comunque la scansione completa e legge
direttamente la posting list della categoria.

I tempi assoluti e gli speed-up dipendono dal dataset sintetico, dal motore JavaScript, dalla garbage
collection e dall'hardware. La conclusione difendibile è quindi qualitativa e circoscritta: per
ricerche ripetute sul medesimo catalogo, la pre-normalizzazione e le posting list riducono il lavoro
ripetuto, pagando un costo iniziale e maggiore memoria. Non segue che la soluzione sia ottimale per
ogni distribuzione di dati o query.

## Limiti applicativi

Il runtime pubblico corrente recupera tutte le pagine della città prima del filtraggio, con pagine da
24 elementi e un limite difensivo di 100 pagine. Il benchmark isola l'algoritmo fino a 25.000 elementi
ma non rimuove questo limite applicativo di 2.400 elementi, né misura:

- query PostgreSQL e piani `EXPLAIN ANALYZE`;
- latenza di rete e dimensione dei payload;
- serializzazione, hydration e rendering React;
- concorrenza e throughput;
- memoria effettiva del browser;
- qualità del ranking mediante precision, recall o nDCG;
- distribuzioni realistiche di testi, categorie e frequenze delle query.

Le tre costruzioni dell'indice consentono di riportare mediana e massimo osservato, non una stima
robusta dei percentili di coda. Inoltre ogni scenario misura la scansione prima dell'indice nella
stessa esecuzione: warm-up e garbage collection riducono parte del rumore, ma l'ordine fisso e la
singola sessione possono comunque influenzare i tempi. I risultati vanno quindi letti come confronto
riproducibile sul sistema dichiarato, non come caratterizzazione statistica generale.

Per un'estensione nazionale sarebbero necessari ricerca e filtri server-side, paginazione a cursore,
indici compositi coerenti con l'ordinamento, valutazione di PostgreSQL Full Text Search o `pg_trgm`,
query plan verificati, test di carico end-to-end e un dataset geografico autorevole. L'indice in
memoria resta una scelta motivata per il prototipo cittadino e un esperimento sugli effetti delle
strutture dati, non l'architettura definitiva di produzione.

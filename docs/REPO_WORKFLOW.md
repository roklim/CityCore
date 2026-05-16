# Repository Workflow

## Scopo

Tenere il monorepo leggibile per sviluppo umano e lavoro automatizzato, evitando file fuori posto e ambiguita sui punti di modifica.

## Dove Va Cosa

- `apps/`: applicazioni deployabili
- `packages/`: codice condiviso tra piu app
- `docs/`: documentazione di prodotto, architettura, roadmap, runbook
- `tools/`: script operativi, seed, migrazioni assistite, smoke test
- `docs/assets/`: asset statici che devono restare versionati nella documentazione

## Cosa Non Deve Restare Versionato

- screenshot locali
- log di sviluppo
- output temporanei di browser automation
- file di appoggio creati per debugging rapido

Convenzione pratica:

- usa `.tmp/` per esperimenti locali multi-file
- usa `tmp-*` al root solo per output rapidi e usa e getta

## Regole Operative

- evita nuovi file liberi al root: se non e un manifest o una configurazione condivisa, mettilo altrove
- se aggiungi un nuovo package o una nuova app, aggiorna subito `README.md` e `AGENTS.md`
- se un file supera chiaramente la dimensione gestibile, preferisci estrarre moduli per dominio invece di aggiungere altra logica inline
- se un comando serve al team in modo ricorrente, esponilo in `package.json` invece di lasciarlo solo nella cronologia shell

## Checklist Quando Si Aggiunge Qualcosa

1. esiste gia una cartella coerente dove metterlo?
2. serve davvero versionarlo?
3. un altro sviluppatore capirebbe dove trovarlo senza spiegazioni extra?
4. la nuova convenzione e documentata nei file guida del repo?

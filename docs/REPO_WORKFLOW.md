# Repo Workflow

## Scopo

Mantenere il repo leggibile, buildabile e coerente con la direzione CityCore.

## Ordine Di Lavoro

1. controlla `git status --short`
2. identifica il workspace toccato
3. leggi solo i file necessari
4. aggiorna i documenti canonici se cambia il modello
5. valida prima il workspace toccato, poi i check globali

## Regole Di Struttura

- `apps/*` per applicazioni
- `packages/*` per moduli condivisi
- `docs/*` per documentazione durevole
- `tools/*` per script operativi

## Regole Di Prodotto

- il repo non deve tornare mono-verticale
- il core deve restare city-first e modulare
- i verticali futuri devono nascere come moduli ufficiali o scaffold separati
- copy, script e superfici non devono raccontare il prodotto come software specialistico per un solo settore

## Checklist Prima Di Chiudere

- la narrativa docs e coerente
- non esistono file morti o import pendenti
- il workspace toccato compila
- `npm run typecheck`
- `npm run lint`
- `npm run build`

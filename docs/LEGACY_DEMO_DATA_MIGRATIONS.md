# Legacy demo-data migrations

## Decisione

Quattro migrazioni dati della demo tesi sono gia condivise nella history Prisma:

- `20260817012500_polish_demo_business_content`
- `20260817085500_finalize_demo_business_content`
- `20260817090500_normalize_demo_city_province`
- `20260817155000_enable_mucho_gusto_demo_ordering`

Questi file restano immutati. Riscrivere una migrazione gia applicata renderebbe la history diversa tra
ambienti e non permetterebbe di sapere quale SQL sia stato realmente eseguito.

Le prime tre migrazioni normalizzano campi del record Cagli / Mucho Gusto. L'ultima puo creare settings
di pickup ordering e cinque servizi pubblicati identificabili tramite ID fissi. Nessuna delle quattro
modifica lo schema.

Da questa baseline in avanti:

- dati dimostrativi nuovi vivono esclusivamente nei tool di seed;
- i seed demo rifiutano `NODE_ENV=production` per default;
- `migrate deploy` esegue un preflight aggiuntivo negli ambienti production;
- la correzione di un database gia migrato richiede una decisione esplicita del proprietario dei dati.

## Guard di produzione

`tools/run-prisma.mjs` intercetta solamente il comando `migrate deploy` quando
`NODE_ENV=production`. Prima di Prisma Migrate esegue un blocco SQL di sola ispezione che controlla:

1. se tutte le quattro migrazioni condivise risultano concluse in `_prisma_migrations`;
2. se esiste gia una City con slug `cagli`;
3. se esiste gia il Business `cagli/mucho-gusto`.

Il comportamento e intenzionalmente conservativo:

| Stato database                                                                                | Comportamento                                                                                                         |
| --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Database vuoto, tabelle non ancora create                                                     | Il preflight passa. Le quattro migrazioni saranno eseguite, ma non trovano il target e quindi non scrivono dati demo. |
| Schema parziale/completo, migrazioni demo pending, nessun target Cagli/Mucho Gusto            | Il preflight passa; l'SQL storico resta un no-op.                                                                     |
| Almeno una migrazione demo pending e City `cagli` o Business `cagli/mucho-gusto` gia presenti | Il deploy si ferma prima che Prisma modifichi dati applicativi.                                                       |
| Tutte le quattro migrazioni concluse                                                          | Il preflight passa: non tenta di correggere o reinterpretare dati gia migrati.                                        |

Il guard dipende da `NODE_ENV=production`: il migration job di produzione deve sempre impostarlo in modo
esplicito e deve invocare `npm run db:migrate:deploy`. Un comando diretto `prisma migrate deploy`
aggirerebbe il runner CityCore e non e ammesso nel flusso production.

### Acknowledgement eccezionale

Un ambiente demo/staging che gira in production mode puo autorizzare intenzionalmente la vecchia data
migration per una singola esecuzione:

```text
CITYCORE_LEGACY_DEMO_MIGRATIONS_ACK=reviewed-cagli-mucho-gusto
```

Il valore deve essere esatto e il runner emette un warning. Non va salvato come variabile permanente e
non e il percorso raccomandato per un database con dati reali o di proprieta incerta.

## Nuovo database production

L'ordine sicuro e:

1. creare un database vuoto con credenziali dedicate;
2. impostare `NODE_ENV=production` e `DATABASE_URL` nel migration job;
3. eseguire `npm run db:migrate:deploy` senza acknowledgement;
4. eseguire `npm run db:generate` e `npm run db:audit:legacy-demo`;
5. inserire dati reali soltanto dopo la conclusione delle migrazioni.

In questo percorso non serve modificare o saltare la history: al momento in cui passa l'SQL storico non
esiste ancora alcun record Cagli/Mucho Gusto da aggiornare.

## Database con migrazioni pending e dati preesistenti

Se il guard blocca il deploy:

1. non cambiare `NODE_ENV` per aggirarlo;
2. acquisire snapshot/backup e registrare l'owner del database;
3. eseguire `npm run db:generate` e `npm run db:audit:legacy-demo`;
4. verificare con `npm run db:migrate:status` che le quattro data migration siano le sole migrazioni
   legacy coinvolte e che tutte le migrazioni schema precedenti siano applicate;
5. classificare il target come dato reale, demo nota oppure proprieta incerta.

Per dati reali o incerti, le quattro migrazioni sono solo data migration e possono essere marcate
manualmente come gia applicate, senza eseguirne l'SQL, dopo approvazione operativa:

```bash
node tools/run-prisma.mjs migrate resolve --applied 20260817012500_polish_demo_business_content
node tools/run-prisma.mjs migrate resolve --applied 20260817085500_finalize_demo_business_content
node tools/run-prisma.mjs migrate resolve --applied 20260817090500_normalize_demo_city_province
node tools/run-prisma.mjs migrate resolve --applied 20260817155000_enable_mucho_gusto_demo_ordering
```

`migrate resolve` scrive la decisione nella sola history Prisma; non modifica City, Business, ordering o
servizi. Va usato solo sul database verificato, con `DATABASE_URL` esplicito, dopo backup e dopo aver
confermato che non serva alcuna modifica dati contenuta nei quattro file.

Dopo il resolve:

1. rieseguire `npm run db:migrate:status`;
2. eseguire `NODE_ENV=production npm run db:migrate:deploy`;
3. rieseguire `npm run db:audit:legacy-demo` e conservare il report con le evidenze di rilascio.

## Database gia migrato

Usare il comando read-only:

```bash
npm run db:generate
npm run db:audit:legacy-demo
```

Il report mostra:

- stato delle quattro righe in `_prisma_migrations`;
- valori correnti del target Cagli / Mucho Gusto;
- eventuale ordering setting con ID `demo-mucho-gusto-ordering-20260817`;
- eventuali cinque servizi con ID `demo-mg-*-20260817`.

La presenza degli ID fissi dimostra l'origine dalla quarta migrazione. Le prime tre migrazioni non hanno
registrato provenance e non e quindi possibile ricostruire automaticamente i valori precedenti.

Questo contenimento non cancella, archivia o sovrascrive dati. Se gli artefatti sono presenti in un
database reale, l'eventuale disabilitazione, archiviazione o ripristino deve essere approvato dal data
owner e implementato come nuova forward migration idempotente basata su una decisione documentata.

## Seed demo

`npm run db:seed` e `npm run db:seed:global-demo` falliscono con `NODE_ENV=production`. Per un database
staging esplicitamente non reale ma avviato in production mode, il seed richiede per la singola
invocazione:

```text
CITYCORE_DEMO_SEED_ACK=non-production-demo-database
```

Questa variabile non deve essere configurata nell'ambiente production reale.

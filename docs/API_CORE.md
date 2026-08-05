# API core — Fase 2

Tutte le route admin richiedono JWT Bearer e rispettano l'access grant attivo.

| Metodo           | Route                                                                        | Permesso                        |
| ---------------- | ---------------------------------------------------------------------------- | ------------------------------- |
| GET/POST         | `/api/v2/platform-core/cities/:citySlug/categories`                          | cities.read/manage              |
| GET/PATCH/DELETE | `/api/v2/platform-core/cities/:citySlug/categories/:categoryId`              | cities.read/manage              |
| GET/PUT/DELETE   | `/api/v2/platform-core/cities/:citySlug/businesses/:businessSlug/categories` | businesses.read/manage          |
| GET/POST         | `.../businesses/:businessSlug/services`                                      | businesses.read/catalog.manage  |
| GET/PATCH/DELETE | `.../services/:serviceId`                                                    | businesses.read/catalog.manage  |
| GET/PUT          | `.../opening-hours`                                                          | businesses.read/settings.manage |
| GET/POST         | `.../publish-readiness`, `.../publish`, `.../unpublish`                      | businesses.read/manage          |
| GET/PATCH        | `.../inquiries`, `.../inquiries/:inquiryId`                                  | businesses.read/manage          |
| GET              | `/api/v2/public/cities/:citySlug/businesses/:businessSlug/services`          | pubblico                        |
| POST             | `/api/v2/public/cities/:citySlug/businesses/:businessSlug/inquiries`         | pubblico                        |

I body sono validati con Zod. Errori attesi: `400` input non valido, `404`
risorsa non accessibile, `409` slug/operazione in conflitto e `429` limite
locale inquiry. L'invio pubblico richiede privacy consent e usa honeypot più
limite in-memory (5 richieste/IP/10 minuti); la sostituzione con Redis resta
un lavoro futuro.

## Health e test

`GET /health` restituisce lo stato del servizio e delle dipendenze senza
segreti. Il dataset `npm run db:seed` include city attive/non attive, business
pubblicati/in bozza e inquiry nei tre stati; è adatto a smoke test locali.

### Integrazione locale

Il database di integrazione usa il solo container `citycore-postgres-test`, con
database e credenziali demo `citycore_test` sulla porta locale `5433`. I comandi
sono `npm run db:test:up`, `db:test:migrate`, `test:integration` e
`db:test:down`. I runner richiedono `NODE_ENV=test`, un `DATABASE_URL_TEST`
esplicito contenente `test` e diverso da `DATABASE_URL`.

Le inquiry rifiutano anche le transizioni di stato non consentite.

Per la verifica pulita Windows, una copia temporanea senza dipendenze e
artefatti viene installata con `npm ci`: Prisma generate e le build operano
quindi senza il lock del runtime locale. Il file `next-env.d.ts` eventualmente
rigenerato in quella copia non deve essere propagato automaticamente.

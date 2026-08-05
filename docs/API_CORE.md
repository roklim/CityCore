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

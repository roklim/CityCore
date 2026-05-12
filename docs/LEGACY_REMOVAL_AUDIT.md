# Legacy Removal Audit

Stato al `12 maggio 2026`.

## Obiettivo

Questa mappa serve a capire cosa si perderebbe cancellando `legacy/` oggi e
quali aree sono gia coperte, ancora da migrare o gia eliminabili.

## Stato Decisionale Corrente

- i tenant ordering legacy noti sono ormai classificati come:
  - `mucho-gusto` => `audit_only`
  - `sushi` => `ignored_demo`
- la migrazione utenti non e piu un blocker: gli utenti verranno ricreati in V2
- `ordering` legacy residuo non e piu il runtime da migrare per primo
- l'ETL ordering resta utile per audit e cleanup dati, ma non e piu il focus
  principale della rimozione V1
- il blocker applicativo reale si e spostato sul `Platform Core` incompleto,
  con `city registry` come prossimo slice corretto

## Rischi Ordinati Per Severita

### Critico

- script Mongo utili per ETL e audit:
  - `legacy/backend/scripts/check-db.js`
  - `legacy/backend/scripts/index-report.js`
  - `legacy/backend/scripts/import-city-registry.js`
  - `legacy/backend/scripts/smoke-test.js`
- `Platform Core` ancora incompleto su:
  - `assets`
  - audit consultabile

### Alto

- `city registry` V2 ancora da chiudere oltre la sola consultazione iniziale
- compatibilita URL legacy business-first:
  - `/:businessSlug`
  - `/:businessSlug/admin`
  - `/:ordine/:id` e varianti legacy nel router Vite
  - riferimento in `legacy/frontend/src/App.jsx`
- route admin/local admin legacy con comportamento food-specific ancora non replicate interamente:
  - `legacy/frontend/src/views/AdminView.jsx`
  - `legacy/frontend/src/hooks/useAdminController.js`
- asset statici locali ancora solo legacy:
  - `legacy/frontend/public/businesses/*`

### Medio

- knowledge operativa e fallback storici dentro documentazione legacy-oriented:
  - `docs/ARCHITECTURE.md`
  - `docs/AUTH_ROADMAP.md`
  - `docs/TROUBLESHOOTING.md`
- deploy V1 storici:
  - `legacy/vercel.v1.json`
  - `legacy/render.v1.yaml`

### Basso

- componenti visuali V1 non piu necessari una volta migrati i flussi:
  - gran parte di `legacy/frontend/src/components/ui/*`
  - `legacy/frontend/src/styles/*`

## Classificazione Per Area

### Public shell e routing principale

- `migrato`
  - `apps/web/src/app/page.tsx`
  - `apps/web/src/app/[citySlug]/page.tsx`
  - `apps/web/src/app/[citySlug]/[businessSlug]/page.tsx`
  - `apps/web/src/components/public-shell.tsx`
- `da migrare`
  - compatibilita URL business-first legacy

### Auth e admin shell

- `migrato`
  - `apps/api/src/auth.ts`
  - `apps/api/src/auth-routes.ts`
  - `apps/web/src/app/admin/*`
  - `apps/web/src/app/select-access/*`
  - `apps/web/src/components/admin-shell.tsx`
- `da migrare`
  - banchi operativi food-specific completi

### Platform Core

- `migrato`
  - `cities`
  - `businesses`
  - `access-grants`
  - `city registry` read surface iniziale
  - `audit logs` consultabili
  - surface pubblica read-only
- `da migrare`
  - `assets`
  - approfondimento admin delle superfici audit/assets

### Ordering

- `migrato`
  - data model V2 iniziale in `packages/database/prisma/schema.prisma`
  - slice API V2 iniziale in `apps/api/src/ordering.ts`
  - preview pubblico menu in `apps/web/src/app/[citySlug]/[businessSlug]/page.tsx`
  - creazione ordine pubblico V2 in `apps/web/src/app/[citySlug]/[businessSlug]/ordering-order-panel.tsx`
  - tracking ordine V2 in `apps/web/src/app/[citySlug]/[businessSlug]/ordine/[orderId]/page.tsx`
  - stats e lista ordini recenti V2 nel local admin in `apps/web/src/app/[citySlug]/[businessSlug]/admin/page.tsx`
  - cambio stato ordine V2 dal local admin in `apps/web/src/app/[citySlug]/[businessSlug]/admin/actions.ts`
  - customer lookup pubblico e admin in `apps/api/src/ordering.ts`
  - coupon V2 con persistenza Postgres in `packages/database/prisma/schema.prisma` e `apps/api/src/ordering.ts`
  - settings operative ordering V2 in `apps/api/src/ordering.ts`
  - superfici admin iniziali per clienti, coupon e settings in `apps/web/src/app/[citySlug]/[businessSlug]/admin/page.tsx`
  - disponibilita slot pickup pubblica in `apps/api/src/ordering.ts`
  - selezione slot pubblica con validazione server-side in `apps/web/src/app/[citySlug]/[businessSlug]/ordering-order-panel.tsx`
  - chiusure straordinarie e override data-specifici in `apps/api/src/ordering.ts`
  - gestione calendario operativo nel local admin V2 in `apps/web/src/app/[citySlug]/[businessSlug]/admin/page.tsx`
  - route V2 per update/toggle/delete menu item in `apps/api/src/ordering.ts`
  - menu manager local admin V2 in `apps/web/src/app/[citySlug]/[businessSlug]/admin/page.tsx`
  - smoke ordering V2 rinforzato in `tools/ordering-smoke.mjs`
  - seed tenant ordering V2 riusabile in `tools/seed-ordering-smoke.mjs`
  - smoke runtime ordering V2 end-to-end sul tenant seedato
  - tooling ETL ordering legacy/V2 in `tools/etl-ordering-legacy.mjs`
  - classificazione tenant legacy demo/seed/candidate ETL in `tools/etl-ordering-legacy.mjs`
  - filtro ETL ordering record-level e import pilota selettivo in `tools/etl-ordering-legacy.mjs`
- `da migrare`
  - gestione completa dashboard ordini lato web
  - edit avanzato coupon lato web
  - gestione categorie menu piu completa lato web
  - import Postgres vero dei soli tenant reali eleggibili
  - ETL e audit comparativo ordering legacy/V2 su tenant reali

### Mongo script e knowledge tecnica

- `archiviabile`
  - script e route legacy da consultare per ETL o parity check
- `eliminabile`
  - solo dopo ETL Postgres stabile e smoke V2 equivalenti

### Manifest deploy V1

- `archiviabile`
  - `legacy/vercel.v1.json`
  - `legacy/render.v1.yaml`
- `eliminabile`
  - quando nessun ambiente runtime dipende piu dalla V1

## Cosa Si Perderebbe Oggi

### Se cancelli `legacy/frontend`

Perderesti:

- flusso customer ordering completo
- parte residua del pannello local admin food non ancora completata
- compatibilita con route business-first legacy
- asset statici business-specific

### Se cancelli `legacy/backend`

Perderesti:

- menu CRUD legacy
- ordini legacy
- lookup clienti e fidelita legacy
- coupon legacy
- settings operative legacy
- smoke Mongo e script di audit indici/dati

### Se cancelli i manifest deploy V1

Perderesti:

- solo la memoria esatta di come veniva deployata la V1
- non il runtime V2 corrente

Sono quindi `archiviabili`, non ancora completamente `inutili`.

## Prossimo Taglio Corretto

Il rischio principale non e piu `ordering` runtime.

Ordine raccomandato:

1. trattare `ordering` legacy residuo come archivio/audit
2. chiudere `city registry` nel `Platform Core`
3. completare `assets` e rifinire le superfici admin residue
4. eseguire audit comparativo finale sui dati legacy realmente utili
5. solo dopo iniziare il cleanup finale di `legacy/frontend` e `legacy/backend`

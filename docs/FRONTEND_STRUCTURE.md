# Frontend Structure

Questa app usa React + Vite con un router minimale in `frontend/src/App.jsx`.
Non usa React Router: la view viene scelta leggendo `window.location.pathname`.

## Route principali

- `/` mostra la home piattaforma Cagli con directory business.
- `/admin` mostra login/console globale.
- `/:businessSlug` mostra il menu pubblico del business.
- `/:businessSlug/admin` mostra l'admin operativo del business.
- `/:businessSlug/ordine/:id` mostra il tracking ordine.
- `/:businessSlug?ordine=id` resta compatibile con tracking via query string.

## View principali

- `frontend/src/views/PlatformHome.jsx`
  - Home pubblica, login globale, directory attivita.
  - Usa componenti UI comuni per loading/empty state.

- `frontend/src/views/CustomerView.jsx`
  - Contenitore della pagina cliente.
  - Mantiene wiring e stato proveniente da `useCustomerController`.
  - Delega il markup a componenti in `components/customer`.

- `frontend/src/views/AdminView.jsx`
  - Contenitore del pannello admin.
  - Mantiene wiring e stato proveniente da `useAdminController`.
  - Delega le sezioni operative a componenti in `components/admin`.

- `frontend/src/views/TrackingView.jsx`
  - Tracking pubblico ordine.
  - Usa stati loading/error/empty condivisi.

## Componenti customer

- `BusinessPublicHeader.jsx`
  - Header del menu pubblico business con link a Cagli, nome locale, stato e admin.

- `CustomerHero.jsx`
  - Hero del business, orari di apertura e CTA principali.

- `RecoverOrderPanel.jsx`
  - Recupero ordini tramite telefono.

- `CustomerMenuArea.jsx`
  - Menu pubblico, ricerca, filtri, categorie, prodotti e pizza su misura.

- `CustomerCheckoutPanel.jsx`
  - Carrello, dati cliente, fedelta, date, slot e conferma ordine.

- `CustomerConfirmation.jsx`
  - Schermata di conferma dopo invio ordine.

- `MenuSkeleton.jsx` e `MenuStateCard.jsx`
  - Stati di caricamento, errore e menu vuoto.

## Componenti admin

- `AdminSidebar.jsx`
  - Navigazione laterale admin.

- `AdminHeader.jsx`
  - Header admin con contesto, refresh, data e logout.

- `AdminStatsGrid.jsx`
  - Metriche riutilizzabili.

- `AdminDashboardSection.jsx`
  - Vista "Oggi": ordini in arrivo, prodotti piu ordinati, fasce orarie.

- `AdminOrdersSection.jsx`
  - Gestione ordini con filtri, ricerca e cambio stato.

- `AdminMenuSection.jsx`
  - CRUD prodotti, anteprima live, lista prodotti e visibilita.

- `AdminAvailabilitySection.jsx`
  - Toggle rapido prodotti disponibili/esauriti.

- `AdminCustomersSection.jsx`
  - Ricerca e lista clienti.

- `AdminCouponsSection.jsx`
  - CRUD coupon.

- `AdminSettingsSection.jsx`
  - Orari, giorni apertura e impostazioni operative locale.

## Componenti UI comuni

- `EmptyState.jsx`
- `InlineNotice.jsx`
- `LoadingSkeleton.jsx`
- `SectionHeading.jsx`
- `StatusPill.jsx`

Questi componenti sono volutamente semplici. La regola e': usarli per
ridurre duplicazione e rendere chiari loading, empty, error e stati semantici,
senza creare un design system troppo astratto.

## Dove modificare cosa

- Vuoi cambiare il menu pubblico? Parti da `CustomerMenuArea.jsx`.
- Vuoi cambiare checkout/carrello? Parti da `CustomerCheckoutPanel.jsx`.
- Vuoi cambiare dashboard admin? Parti da `AdminDashboardSection.jsx`.
- Vuoi cambiare gestione menu admin? Parti da `AdminMenuSection.jsx`.
- Vuoi cambiare orari/impostazioni locale? Parti da `AdminSettingsSection.jsx`.
- Vuoi cambiare routing? Parti da `App.jsx`.
- Vuoi cambiare API/fetch? Parti da `frontend/src/lib/api.js`.

## Regole di manutenzione

- Non spostare logica API nei componenti presentazionali.
- Lascia gli hook (`useCustomerController`, `useAdminController`) come fonte
  principale dello stato operativo.
- Evita nuove librerie se il problema si risolve con componenti piccoli.
- Mantieni link principali nel formato `/:businessSlug` e
  `/:businessSlug/admin`.
- Dopo modifiche importanti esegui sempre:

```bash
npm --prefix frontend run build
```

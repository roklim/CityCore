# Frontend Structure

Questa app usa React + Vite con un router minimale in `frontend/src/App.jsx`.
Non usa React Router: la view viene scelta leggendo `window.location.pathname`.

## Route principali

- `/` mostra la home piattaforma con ricerca delle citta attive.
- `/admin` mostra login/dashboard piattaforma.
- `/admin/cities` mostra ricerca `CityRegistry`, attivazione citta e stati mercato.
- `/admin/businesses` mostra lista, creazione, modifica, owner e asset dei business.
- `/admin/users` mostra owner/admin/staff dei tenant.
- `/admin/settings` mostra configurazione e note operative piattaforma.
- `/:citySlug` mostra la home/directory della citta.
- `/:citySlug/:businessSlug` mostra il menu pubblico del business.
- `/:citySlug/:businessSlug/admin` mostra l'admin operativo del business.
- `/:citySlug/:businessSlug/ordine/:id` mostra il tracking ordine.
- `/:businessSlug` e `/:businessSlug/admin` restano compatibili come route legacy.

## Menu Admin Separati

Ci sono due esperienze admin distinte:

- Global Admin: `/admin/*`, con menu piattaforma per dashboard, citta, business, utenti e impostazioni.
- Gestore locale: `/:citySlug/:businessSlug/admin`, con menu operativo per oggi, ordini, menu, disponibilita, clienti e impostazioni.

Il menu piattaforma non deve comparire nel banco del gestore locale. Il banco locale non deve contenere controlli di piattaforma.

## View principali

- `frontend/src/views/PlatformHome.jsx`
  - Directory pubblica della citta per `/:citySlug`.
  - Usa componenti UI comuni per loading/empty state.

- `frontend/src/views/PlatformLanding.jsx`
  - Root pubblica `/`: ricerca solo citta attive.

- `frontend/src/views/CityHome.jsx`
  - Wrapper della directory pubblica per `/:citySlug`.

- `frontend/src/views/PlatformAdminView.jsx`
  - Wrapper della console piattaforma `/admin/*`.

- `frontend/src/views/PlatformConsoleView.jsx`
  - Dashboard piattaforma, citta, business, utenti e impostazioni.
  - Usa `usePlatformConsoleController` e non carica stato operativo del banco locale.

- `frontend/src/views/CustomerView.jsx`
  - Contenitore della pagina cliente.
  - Mantiene wiring e stato proveniente da `useCustomerController`.
  - Delega il markup a componenti in `components/customer`.

- `frontend/src/views/AdminView.jsx`
  - Contenitore del banco operativo locale.
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
- Vuoi cambiare attivazione citta? Parti da `usePlatformConsoleController.js` e `PlatformConsoleView.jsx`.

## Regole di manutenzione

- Non spostare logica API nei componenti presentazionali.
- Lascia gli hook (`useCustomerController`, `useAdminController`, `usePlatformConsoleController`) come fonte
  principale dello stato operativo.
- Evita nuove librerie se il problema si risolve con componenti piccoli.
- Mantieni i link principali nel formato `/:citySlug/:businessSlug` e
  `/:citySlug/:businessSlug/admin`; le route `/:businessSlug` sono legacy.
- Dopo modifiche importanti esegui sempre:

```bash
npm --prefix frontend run build
npm --prefix backend run smoke
```

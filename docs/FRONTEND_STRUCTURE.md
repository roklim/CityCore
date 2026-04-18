# Frontend Structure

Il frontend React e' diviso per responsabilita, cosi' le modifiche future non
devono passare da un unico file enorme.

## Entry Point

- `frontend/src/main.jsx`
  - monta React
  - importa `App`
  - importa il CSS globale

- `frontend/src/App.jsx`
  - router minimale senza librerie
  - decide tra:
    - pagina cliente
    - tracking ordine
    - area admin

## Views

- `frontend/src/views/CustomerView.jsx`
  - rendering esperienza cliente
  - menu, pizza su misura, carrello, checkout, recupero ordine
  - non contiene piu' la maggior parte della logica dati

- `frontend/src/views/AdminView.jsx`
  - rendering area admin
  - sidebar, dashboard, ordini, menu, disponibilita, clienti, coupon, settings,
    business
  - la logica admin e' in `useAdminController`

- `frontend/src/views/TrackingView.jsx`
  - tracking pubblico dell'ordine

## Hooks

- `frontend/src/hooks/useCustomerController.js`
  - stato cliente
  - caricamento menu
  - disponibilita slot
  - gestione carrello
  - pizza su misura
  - submit ordine
  - lookup cliente

- `frontend/src/hooks/useAdminController.js`
  - sessione admin
  - refresh ordini/dashboard
  - gestione menu
  - gestione business e utenti business
  - gestione coupon, settings, clienti
  - memo derivati per dashboard e filtri

## Shared

- `frontend/src/constants.js`
  - stati ordine
  - nav admin
  - categorie/menu
  - form vuoti
  - opzioni business
  - configuratore pizza su misura

- `frontend/src/utils/format.js`
  - date
  - valuta
  - slug
  - mapping categorie
  - trasformazioni form/payload

- `frontend/src/components/Toast.jsx`
  - feedback globale semplice

- `frontend/src/lib/api.js`
  - unico punto per chiamate API
  - aggiunge `X-Business-Slug`
  - gestisce errori fetch

## Regola pratica

- Nuova UI visibile: aggiungerla in `views` o `components`.
- Nuovo stato/flusso dati: aggiungerlo nel relativo hook.
- Nuova chiamata backend: aggiungerla in `lib/api.js`.
- Nuove opzioni condivise: aggiungerle in `constants.js`.
- Nuove conversioni/date/formattazioni: aggiungerle in `utils/format.js`.

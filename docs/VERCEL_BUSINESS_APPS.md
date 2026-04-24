# Vercel Business Apps

Il modello consigliato ora e' una sola app Vercel centrale:

```txt
https://cagli.vercel.app/
```

La root e' la ricerca delle citta attive. Ogni business vive sotto la propria
citta:

```txt
https://cagli.vercel.app/cagli/mucho-gusto
https://cagli.vercel.app/cagli/mucho-gusto/admin
https://cagli.vercel.app/cagli/sushi
https://cagli.vercel.app/cagli/sushi/admin
```

## Perche' Questo Modello

- Un solo deploy frontend.
- Una sola configurazione CORS stabile.
- Nessun URL preview Vercel diverso per ogni locale.
- Il backend continua a isolare i dati tramite `businessId` e JWT.
- Il global admin gestisce la piattaforma da `/admin` e dalle sezioni `/admin/cities`, `/admin/businesses`, `/admin/users`.

## Route Principali

```txt
/                         Ricerca citta attive
/:citySlug                Directory cittadina
/:citySlug/:businessSlug  Menu/app cliente del business
/:citySlug/:businessSlug/admin      Banco admin del business
/:citySlug/:businessSlug/ordine/:id Tracking ordine del business
/admin                    Dashboard piattaforma
/admin/cities             Registro citta e stati mercato
/admin/businesses         Business piattaforma
/admin/users              Owner/admin/staff dei tenant
/:businessSlug            Compatibilita legacy
/:businessSlug/admin      Compatibilita legacy
```

## Vercel Environment Variables

Nel progetto Vercel centrale `cagli` imposta:

```env
VITE_API_BASE_URL=https://mucho-gusto-mg5y.onrender.com/api
VITE_BUSINESS_SLUG=mucho-gusto
```

`VITE_BUSINESS_SLUG` resta il fallback per vecchi link senza slug. Le route
nuove prendono citta e business direttamente dal path.

## Permessi

- `global_admin`: vede tutte le attivita, puo aprire ogni `/:citySlug/:slug/admin` e puo
  gestire business/utenti dalla console.
- `owner`, `admin`, `staff`: possono vedere la directory pubblica, ma il banco
  admin e' disponibile solo per il proprio business.
- pubblico: puo aprire `/`, `/:citySlug` e tutti i menu `/:citySlug/:slug`, senza funzioni admin.

## Render CORS

Sul backend Render usa solo domini stabili:

```env
CORS_ORIGINS=https://cagli.vercel.app
```

Se usi anche preview deployment Vercel:

```env
CORS_ALLOW_VERCEL_APP=true
```

## Creare Un Nuovo Business

1. Apri `https://cagli.vercel.app/admin`.
2. Accedi come `global_admin`.
3. Vai in `/admin/cities`, cerca e attiva la citta dal registro.
4. Vai in `/admin/businesses` e crea il business con slug stabile, per esempio `sushi`.
5. Vai in `/admin/users` oppure usa `Utenti` nella card business per creare owner/admin/staff.
6. Apri `https://cagli.vercel.app/cagli/sushi` per il menu cliente.
7. Apri `https://cagli.vercel.app/cagli/sushi/admin` per il banco admin.

## Accesso Owner/Admin/Staff

Quando un owner entra da `/:citySlug/:businessSlug/admin`, il frontend invia
citta e slug al backend. Dopo il login, il JWT contiene il `businessId`; quindi
l'utente vede solo il proprio business anche se prova a cambiare URL manualmente.

## Quando Usare Un Progetto Vercel Separato

Usalo solo se un cliente richiede dominio, branding o deploy completamente
separati. Per la gestione quotidiana e per ridurre problemi CORS, il modello
centrale `cagli.vercel.app/:citySlug/:slug` e' preferibile.

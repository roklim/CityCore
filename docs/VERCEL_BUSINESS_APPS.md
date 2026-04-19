# Vercel Business Apps

Il modello consigliato ora e' una sola app Vercel centrale:

```txt
https://cagli.vercel.app/
```

La root e' la console piattaforma per il global admin. Ogni business vive sotto
il proprio slug:

```txt
https://cagli.vercel.app/mucho-gusto
https://cagli.vercel.app/mucho-gusto/admin
https://cagli.vercel.app/sushi
https://cagli.vercel.app/sushi/admin
```

## Perche' Questo Modello

- Un solo deploy frontend.
- Una sola configurazione CORS stabile.
- Nessun URL preview Vercel diverso per ogni locale.
- Il backend continua a isolare i dati tramite `businessId` e JWT.
- Il global admin vede tutte le app dalla home piattaforma.

## Route Principali

```txt
/                         Console piattaforma
/:businessSlug            Menu/app cliente del business
/:businessSlug/admin      Banco admin del business
/:businessSlug?ordine=id  Tracking ordine del business
/admin                    Login/console globale
/admin/businesses         Gestione business globale
/admin/:businessSlug      Compatibilita legacy
/p/:businessSlug          Compatibilita legacy
```

## Vercel Environment Variables

Nel progetto Vercel centrale `cagli` imposta:

```env
VITE_API_BASE_URL=https://mucho-gusto-mg5y.onrender.com/api
VITE_BUSINESS_SLUG=mucho-gusto
```

`VITE_BUSINESS_SLUG` resta il fallback per vecchi link senza slug. Le route
nuove prendono lo slug direttamente dal path.

## Permessi

- `global_admin`: vede tutte le attivita, puo aprire ogni `/:slug/admin` e puo
  gestire business/utenti dalla console.
- `owner`, `admin`, `staff`: possono vedere la directory pubblica, ma il banco
  admin e' disponibile solo per il proprio business.
- pubblico: puo aprire `/` e tutti i menu `/:slug`, senza funzioni admin.

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
3. Dalla console usa `Gestione business` oppure una card business.
4. Crea il business con slug stabile, per esempio `sushi`.
5. Crea o assegna l'owner con email e password temporanea.
6. Apri `https://cagli.vercel.app/sushi` per il menu cliente.
7. Apri `https://cagli.vercel.app/sushi/admin` per il banco admin.

## Accesso Owner/Admin/Staff

Quando un owner entra da `/:businessSlug/admin`, il frontend invia lo slug al
backend. Dopo il login, il JWT contiene il `businessId`; quindi l'utente vede
solo il proprio business anche se prova a cambiare URL manualmente.

## Quando Usare Un Progetto Vercel Separato

Usalo solo se un cliente richiede dominio, branding o deploy completamente
separati. Per la gestione quotidiana e per ridurre problemi CORS, il modello
centrale `cagli.vercel.app/:slug` e' preferibile.

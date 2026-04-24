# Roadmap Autenticazione Cagli Local

Questa roadmap descrive l'autenticazione ideale per Cagli Local: login unica,
ruoli scoped, account clienti, sicurezza backend e crescita futura senza dover
rifare l'architettura.

L'obiettivo non e solo "far entrare gli utenti", ma costruire un sistema dove
ogni persona vede solo l'area corretta e ogni API verifica i permessi lato
backend.


## 1. Visione Finale

L'app deve supportare questi tipi di accesso:

- `global_admin`: gestisce tutta la piattaforma.
- `city_admin`: gestisce una o piu citta assegnate.
- `local_admin`: gestisce uno o piu business/locali assegnati.
- `staff`: opera sul banco locale con permessi ridotti.
- `customer`: utente pubblico registrato, senza accesso admin.

La distinzione fondamentale e:

- `User` dice chi e la persona.
- `AccessGrant` dice cosa puo fare e dove.
- `CustomerProfile` dice chi e come cliente pubblico.

Non bisogna trattare il cliente come un admin role. Il cliente e un account
pubblico, separato dalle autorizzazioni amministrative.


## 2. Stato Attuale

Oggi il sistema funziona cosi:

- `User` contiene direttamente `role`.
- `User` contiene spesso `businessId`.
- I ruoli attuali sono `global_admin`, `owner`, `admin`, `staff`.
- `global_admin` ha ancora fallback da `.env`.
- `/admin` e la console piattaforma.
- `/:citySlug/:businessSlug/admin` e il banco locale.
- Lo staff e gia limitato in parte dal frontend e da alcune route backend.
- I clienti pubblici usano telefono e fedelta, ma non hanno ancora account
  cliente completo.

Questo va bene come base, ma non scala bene quando:

- una stessa email deve gestire piu locali
- un city admin deve gestire piu citta
- un utente e cliente e anche staff
- servono inviti, reset password, audit log e permessi granulari


## 3. Modello Target

### User

Identita unica della persona.

Campi consigliati:

```js
{
  email,
  passwordHash,
  name,
  phone,
  status: "active" | "invited" | "disabled",
  emailVerifiedAt,
  phoneVerifiedAt,
  lastLoginAt,
  authVersion
}
```

Note:

- `authVersion` serve per invalidare vecchi token dopo cambio password,
  disattivazione o reset sicurezza.
- `User` non dovrebbe contenere in modo permanente il ruolo amministrativo
  principale.
- Per compatibilita, `role` e `businessId` possono restare temporaneamente
  finche la migrazione non e completata.

### AccessGrant

Autorizzazione scoped.

```js
{
  userId,
  role: "global_admin" | "city_admin" | "local_admin" | "staff",
  scopeType: "platform" | "city" | "business",
  cityId,
  businessId,
  active,
  createdBy,
  lastUsedAt
}
```

Esempi:

- global admin: `role=global_admin`, `scopeType=platform`
- city admin Cagli: `role=city_admin`, `scopeType=city`, `cityId=Cagli`
- local admin Mucho Gusto: `role=local_admin`, `scopeType=business`,
  `businessId=MuchoGusto`
- staff Sushi: `role=staff`, `scopeType=business`, `businessId=Sushi`

### CustomerProfile

Profilo pubblico cliente.

```js
{
  userId,
  name,
  phone,
  defaultCitySlug,
  marketingConsent,
  preferences
}
```

Questo non sostituisce subito il modello `Customer` attuale, che e tenant-aware
e legato a fedelta/ordini per singolo business. `CustomerProfile` e il profilo
account globale; `Customer` resta lo storico/fedelta dentro un business.


## 4. Permission Map

Creare una mappa permessi centrale, ad esempio:

```txt
platform.read
platform.manage
cities.read
cities.manage
businesses.read
businesses.manage
business_users.manage
orders.read
orders.manage
menu.manage
availability.manage
customers.read
settings.manage
profile.manage
orders.own.read
```

Mappatura iniziale:

```txt
global_admin
- tutto

city_admin
- platform.read
- cities.read
- businesses.read
- businesses.manage
- business_users.manage

local_admin
- business.read
- orders.read
- orders.manage
- menu.manage
- availability.manage
- customers.read
- settings.manage

staff
- business.read
- orders.read
- orders.manage
- availability.manage

customer
- profile.manage
- orders.own.read
```

Regola chiave:

Il frontend puo nascondere pulsanti e menu, ma ogni API deve verificare i
permessi lato backend.


## 5. Redirect Finale Dopo Login

La login deve essere unica.

Redirect consigliato:

```txt
global_admin -> /admin
city_admin -> /admin
local_admin -> /:citySlug/:businessSlug/admin
staff -> /:citySlug/:businessSlug/admin?section=orders
customer -> /account
```

Se un utente ha piu accessi:

1. Se c'e un `next` nella URL, usare quello solo se permesso.
2. Se ha un solo accesso admin, redirect diretto.
3. Se ha piu accessi admin, mostrare una schermata "Scegli area".
4. Se e solo customer, andare ad `/account` o tornare alla pagina pubblica da
   cui era partito.


## 6. Milestone 0 - Decisione Tecnica

Obiettivo:
documentare il piano prima di modificare troppo codice.

File:

- `docs/AUTH_ROLES_PLAN.md`
- `docs/AUTH_ROADMAP.md`

Output:

- ruoli target
- modelli dati target
- redirect
- permessi
- strategia migrazione
- rischi

Acceptance criteria:

- il team capisce differenza tra `User`, `AccessGrant`, `CustomerProfile`
- e chiaro cosa resta compatibile e cosa cambia dopo


## 7. Milestone 1 - Fondamenta DB

Obiettivo:
aggiungere i modelli senza rompere nulla.

Implementare:

- `AccessGrant`
- `CustomerProfile`
- indici corretti
- export dei nuovi modelli
- lasciare temporaneamente `User.role` e `User.businessId`

File:

- `backend/db/index.js`

Acceptance criteria:

- backend parte
- nessun endpoint esistente si rompe
- non e richiesta migrazione immediata per avviare l'app


## 8. Milestone 2 - Script Migrazione Legacy

Obiettivo:
convertire gli utenti attuali in grant senza perdita dati.

File:

- `backend/scripts/migrate-users-to-access-grants.js`

Mapping:

```txt
global_admin -> global_admin / platform
owner -> local_admin / business
admin -> local_admin / business
staff -> staff / business
```

Requisiti:

- `--dry-run` obbligatorio
- `--apply` separato
- idempotente
- non duplica grant
- logga email duplicate e conflitti
- non cancella campi legacy

Acceptance criteria:

- dry run mostra utenti letti e grant da creare
- apply crea grant senza duplicati
- rilanciare lo script non crea doppioni


## 9. Milestone 3 - Permission Engine

Obiettivo:
creare il motore permessi centrale.

File:

- `backend/security/permissions.js`
- `backend/middleware/auth.js`

Implementare:

- `ROLE_PERMISSIONS`
- `roleHasPermission`
- `grantMatchesScope`
- `userCan`
- `requirePermission`
- wrapper compatibili:
  - `requireGlobalAdmin`
  - `requireBusinessRole`
  - `requireBusinessUser`

Acceptance criteria:

- le route vecchie continuano a funzionare
- i nuovi permessi sono testabili in funzioni pure
- il codice nuovo non introduce controlli sparsi tipo `role === ...` ovunque


## 10. Milestone 4 - Login API Evoluta

Obiettivo:
rendere il backend autorevole sul redirect e sugli accessi disponibili.

File:

- `backend/routes/auth.js`
- `frontend/src/lib/api.js`

La risposta di `/api/auth/login` deve diventare:

```js
{
  token,
  user,
  accesses,
  defaultAccess,
  redirectTo,
  expiresIn
}
```

`/api/auth/me` deve restituire:

```js
{
  user,
  accesses,
  defaultAccess,
  business,
  redirectTo
}
```

Compatibilita:

- login `.env` global admin deve continuare
- owner/admin legacy devono essere mappati a `local_admin`
- staff legacy deve funzionare

Acceptance criteria:

- login global admin funziona
- login owner/admin funziona
- login staff funziona
- risposta contiene `redirectTo`
- frontend puo usare `redirectTo` senza calcolare tutto da solo


## 11. Milestone 5 - Frontend Sessione e Redirect

Obiettivo:
spostare la logica redirect dal frontend al backend, mantenendo fallback.

File:

- `frontend/src/lib/api.js`
- `frontend/src/hooks/usePlatformConsoleController.js`
- `frontend/src/hooks/useAdminController.js`
- `frontend/src/views/PlatformLanding.jsx`
- `frontend/src/views/PlatformHome.jsx`

Implementare:

- salvare in sessione `user`, `accesses`, `defaultAccess`
- usare `data.redirectTo` dopo login
- se `redirectTo` manca, usare fallback attuale
- reidratare da `/auth/me`

Acceptance criteria:

- nessuna regressione login
- meno logica hardcoded nel frontend
- sessione coerente dopo refresh pagina


## 12. Milestone 6 - Banco Locale Perfetto

Obiettivo:
rendere `local_admin` e `staff` chiari e sicuri.

Regole:

```txt
local_admin vede:
- Oggi
- Ordini
- Menu
- Disponibilita
- Clienti
- Impostazioni

staff vede:
- Oggi
- Ordini
- Disponibilita
```

Staff puo:

- cambiare stato ordine
- cambiare disponibilita prodotto

Staff non puo:

- modificare menu completo
- modificare impostazioni
- gestire coupon
- gestire utenti
- entrare nella console piattaforma

File:

- `frontend/src/hooks/useAdminController.js`
- `frontend/src/views/AdminView.jsx`
- `frontend/src/constants.js`
- `backend/routes/menu.js`
- `backend/routes/orders.js`
- `backend/routes/settings.js`
- `backend/routes/coupons.js`
- `backend/routes/customers.js`

Acceptance criteria:

- staff non vede sezioni vietate
- staff riceve 403 se forza API vietate
- local admin puo gestire tutto il banco locale
- global admin resta autorizzato dove previsto


## 13. Milestone 7 - City Admin

Obiettivo:
abilitare il ruolo `city_admin` in `/admin`, ma con dati filtrati.

Regole:

- city admin vede solo citta assegnate
- city admin vede solo business delle sue citta
- city admin puo gestire utenti business solo dentro le sue citta
- city admin non vede impostazioni globali piattaforma
- city admin non puo cambiare dati di altre citta via API

File:

- `backend/routes/platform.js`
- `backend/middleware/auth.js`
- `backend/security/permissions.js`
- `frontend/src/hooks/usePlatformConsoleController.js`
- `frontend/src/views/PlatformConsoleView.jsx`

UX:

- per `global_admin` mostrare "Console piattaforma"
- per `city_admin` mostrare "Console citta"
- nav filtrata in base ai permessi

Acceptance criteria:

- city admin non vede altre citta
- city admin non vede altri business
- richieste fuori scope tornano 403
- global admin continua a vedere tutto


## 14. Milestone 8 - Multi Accesso

Obiettivo:
gestire utenti con piu accessi.

Esempi:

- stessa persona local_admin di due locali
- stessa persona city_admin di due citta
- stessa persona cliente e staff

Implementare:

- `activeAccessId`
- schermata "Scegli area"
- endpoint per cambiare accesso attivo
- aggiornamento `lastUsedAt`

Possibile route:

```txt
/select-access
```

Acceptance criteria:

- utente con un solo accesso viene rediretto direttamente
- utente con piu accessi sceglie area
- non puo scegliere grant inattivi o non suoi


## 15. Milestone 9 - Account Cliente

Obiettivo:
creare account cliente pubblico senza mischiarlo agli admin.

Route consigliate:

```txt
/account
/login
/register
```

Funzioni:

- registrazione cliente
- login cliente
- profilo
- storico ordini propri
- fedelta per business
- preferiti

Backend:

- `CustomerProfile`
- route account dedicate
- `orders.own.read`
- collegamento ordini per userId/phone verificato

Vincoli:

- checkout pubblico continua a funzionare senza account
- customer non entra mai in `/admin`
- customer non riceve grant admin

Acceptance criteria:

- cliente puo registrarsi
- cliente puo vedere profilo
- cliente puo vedere solo ordini propri
- cliente che prova `/admin` viene mandato fuori


## 16. Milestone 10 - Inviti e Reset Password

Obiettivo:
rendere onboarding e recupero credenziali reali.

Implementare:

- invito nuovo local_admin/staff
- invito nuovo city_admin
- token invito con scadenza
- reset password
- cambio password
- invalidazione sessioni vecchie con `authVersion`

File possibili:

- `backend/routes/auth.js`
- `backend/routes/invitations.js`
- `backend/services/emailService.js`

Acceptance criteria:

- non serve creare password manuale in chiaro nella console
- invito scade
- reset password scade
- vecchi token non restano validi dopo cambio password


## 17. Milestone 11 - Session Security

Obiettivo:
indurire sicurezza sessioni.

Da valutare:

- oggi si usa bearer token in localStorage
- target ideale: cookie `httpOnly`, `Secure`, `SameSite`
- refresh token rotabili
- access token breve
- revoca sessione
- logout da tutti i dispositivi
- rate limit login
- lock temporaneo dopo troppi tentativi

Acceptance criteria:

- login rate limited
- token revocabili
- password reset invalida sessioni precedenti
- nessun dato sensibile in localStorage oltre al minimo necessario per UX


## 18. Milestone 12 - Audit Log

Obiettivo:
tracciare azioni sensibili.

Azioni da loggare:

- login riuscito
- login fallito
- cambio password
- creazione access grant
- disattivazione utente
- cambio ruolo
- attivazione citta
- modifica business
- creazione owner/staff
- modifiche impostazioni critiche

Modello possibile:

```js
{
  actorUserId,
  action,
  targetType,
  targetId,
  scopeType,
  cityId,
  businessId,
  metadata,
  ip,
  userAgent,
  createdAt
}
```

Acceptance criteria:

- ogni azione amministrativa critica e tracciata
- il global admin puo consultare audit log
- city admin vede solo audit del suo scope


## 19. Milestone 13 - Test e Smoke

Obiettivo:
proteggere la parte piu delicata dell'app.

Test minimi:

- login global admin
- login local admin
- login staff
- login city admin
- customer non entra in admin
- staff non modifica settings
- city admin non legge altre citta
- local admin non cambia business via header
- token invalido torna 401
- permesso insufficiente torna 403

Comandi:

```bash
npm --prefix frontend run build
npm --prefix backend run smoke
node backend/scripts/migrate-users-to-access-grants.js --dry-run
```

Acceptance criteria:

- build passa
- smoke passa
- test manuale ruoli completato


## 20. Piano Rollout Consigliato

Ordine consigliato:

1. Documentazione e piano
2. Modelli `AccessGrant` e `CustomerProfile`
3. Permission map
4. Script migrazione dry-run
5. Login con `redirectTo`
6. Frontend usa `redirectTo`
7. Staff/local admin puliti
8. Middleware permessi nuovo, mantenendo wrapper vecchi
9. City admin filtrato
10. Multi-accesso
11. Account cliente
12. Inviti/reset password
13. Session security avanzata
14. Audit log
15. Test completi

Non fare tutto in un unico branch enorme. Meglio 3 macro-PR:

### PR 1 - Fondamenta compatibili

- documentazione
- AccessGrant
- permission map
- migrazione dry-run
- login `redirectTo`

### PR 2 - Permessi admin reali

- middleware permessi
- local admin/staff puliti
- city admin filtrato
- UI console filtrata

### PR 3 - Customer e sicurezza avanzata

- account cliente
- inviti/reset password
- session security
- audit log
- test completi


## 21. Regole Da Non Violare

- Non cancellare subito `User.role` e `User.businessId`.
- Non rompere il fallback `.env` del global admin finche non esiste almeno un
  global admin Mongo stabile.
- Non fidarsi mai solo del frontend per la sicurezza.
- Non permettere a local admin/staff di cambiare tenant con header o URL.
- Non mischiare customer con admin.
- Non creare city manuali fuori dal registro verificato.
- Non esporre `passwordHash`.
- Non dare messaggi login troppo specifici.


## 22. Definizione Di "Autenticazione Perfetta" Per Questa App

Il sistema e maturo quando:

- una persona ha un solo account
- una persona puo avere piu accessi scoped
- global admin, city admin, local admin, staff e customer sono separati
- ogni redirect e deciso dal backend
- ogni API verifica permessi e scope
- customer non puo mai entrare in admin
- city admin non puo uscire dalle sue citta
- local admin/staff non possono uscire dai loro business
- staff ha permessi ridotti reali
- inviti e reset password sono sicuri
- sessioni vecchie sono invalidabili
- audit log traccia le azioni sensibili
- build, smoke e test permessi passano prima del deploy


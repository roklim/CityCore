# Troubleshooting

## 404 On New API Routes

Symptom:

```txt
GET /api/platform/businesses 404
GET /api/business/current 404
```

Most likely cause: an old backend process is still running on port `3000`.

Fix:

```powershell
netstat -ano | Select-String ':3000'
Stop-Process -Id <PID> -Force
cd backend
npm start
```

Then verify:

```powershell
Invoke-RestMethod http://localhost:3000/health
```

## Platform Endpoint Says Token Missing

`/api/platform/*` requires a global admin token.

Login first from `/admin`, or test with:

```bash
cd backend
npm run smoke
```

## Wrong Database Is Used

If MongoDB Atlas shows data in `test`, your URI likely does not include a database name.

Correct shape:

```env
MONGODB_URI=mongodb+srv://USER:PASSWORD@HOST/localBusinessSaaS?retryWrites=true&w=majority&appName=localBusinessSaaS
```

Important part:

```txt
.mongodb.net/localBusinessSaaS?
```

## Check Database State

```bash
cd backend
npm run check:db
```

This prints database name, collections, document counts, and documents missing `businessId`.

## Check Indexes

```bash
cd backend
npm run check:indexes
```

If it reports legacy global unique indexes, review them manually after backup.

Common legacy indexes:

```txt
menuitems.name_1
customers.phone_1
coupons.code_1
```

These should eventually be replaced by tenant-scoped indexes.

## Platform Shows Wrong Business Or Admin

Current routing model:

```txt
/                  city search
/admin             platform dashboard
/admin/cities      platform city registry
/admin/businesses  platform business management
/admin/users       platform tenant users
/<citySlug>        city directory
/<citySlug>/<slug> public menu
/<citySlug>/<slug>/admin business admin
```

If `/admin` shows a public directory or "Operativita Mucho Gusto", the frontend deployment is old.
Redeploy Vercel after pushing the route refactor.

## Vercel Business App Shows Wrong Menu

Check the central Vercel project env:

```env
VITE_API_BASE_URL=https://mucho-gusto-mg5y.onrender.com/api
VITE_BUSINESS_SLUG=mucho-gusto
```

`VITE_BUSINESS_SLUG` is only a fallback. The normal business is read from the
path, for example `/cagli/sushi` or `/cagli/mucho-gusto/admin`.

For local testing, use:

```txt
/<citySlug>/<slug>
/<citySlug>/<slug>/admin
?business=<slug>
```

Legacy URLs still work:

```txt
/<slug>
/<slug>/admin
```

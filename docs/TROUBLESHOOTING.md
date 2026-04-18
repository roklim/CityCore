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

## Vercel Business App Shows Wrong Menu

Check the Vercel project env:

```env
VITE_API_BASE_URL=https://your-backend.example.com/api
VITE_BUSINESS_SLUG=<correct-business-slug>
```

Then redeploy the Vercel project.

For local testing, use:

```txt
/p/<slug>
/admin/<slug>
?business=<slug>
```

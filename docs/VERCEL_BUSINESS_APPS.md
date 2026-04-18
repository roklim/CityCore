# Vercel Apps Per Business

Use one frontend codebase and create one Vercel project for each business.

## Recommended Model

- Backend: one shared API
- Database: one shared MongoDB database
- Frontend code: one repository
- Vercel: one project per business
- Tenant selection: `VITE_BUSINESS_SLUG`

## Create A Business

1. Open `/admin`.
2. Login as global admin.
3. Open `Business`.
4. Create the activity.
5. Keep `Menu demo automatico` enabled if you want starter products.
6. Copy the generated env variable.

Example:

```env
VITE_BUSINESS_SLUG=sushi-centro
```

## Local Admin Without Env Changes

You can manage a tenant directly by URL:

```txt
/admin/mucho-gusto
/admin/sushi-centro
/admin/burger-lab
```

The customer preview is:

```txt
/p/mucho-gusto
/p/sushi-centro
/p/burger-lab
```

The frontend reads the slug from:

1. `?business=<slug>`
2. `/admin/<slug>`
3. `/p/<slug>`
4. `VITE_BUSINESS_SLUG`

For logged-in `owner`, `admin`, and `staff` users, the backend still enforces the tenant from the JWT. The slug is only a UX hint; it is not trusted for authorization.

## Giving Access To A Business Owner

1. Open `/admin` as `global_admin`.
2. Open `Business`.
3. Create or edit a business.
4. Fill owner name, owner email, and temporary password.
5. Send the owner their app URL and credentials.

Example:

```txt
Business: Mucho Gusto
Owner: mario@muchogusto.it
App: https://mucho-gusto.vercel.app/admin
```

When Mario logs in, his JWT contains Mucho Gusto's `businessId`; he cannot see other businesses.

## Vercel Environment Variables

For every Vercel project set:

```env
VITE_API_BASE_URL=https://your-backend.example.com/api
VITE_BUSINESS_SLUG=<business-slug>
```

Examples:

```env
VITE_API_BASE_URL=https://api.localbusiness.app/api
VITE_BUSINESS_SLUG=mucho-gusto
```

```env
VITE_API_BASE_URL=https://api.localbusiness.app/api
VITE_BUSINESS_SLUG=sushi-centro
```

## Custom Domains

After the Vercel project is deployed, attach the customer's custom domain in Vercel and save the final URL in the `Business` section.

## Operational Checklist

For each new business:

1. Create business from global admin.
2. Verify starter menu.
3. Create Vercel project from the same repo.
4. Set `VITE_API_BASE_URL`.
5. Set `VITE_BUSINESS_SLUG`.
6. Deploy.
7. Save public URL in the Business form.
8. Open `/admin/<slug>` and customize menu/settings.

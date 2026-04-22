# City Registry

## Decision

City search is not powered by a live third-party autocomplete.

The platform keeps a local registry of verified Italian municipalities and then activates only the markets that should appear publicly.

```txt
ISTAT/SITUAS or trusted provider
        -> CityRegistry
        -> global admin activation
        -> City
        -> public /:citySlug directory
```

## Models

`CityRegistry` stores the national source of truth:

- municipality name and slug
- ISTAT code
- cadastral code when available
- province code/name
- region code/name
- source and source version
- active/suppressed municipality flag

`City` stores an enabled platform market:

- `registryId`
- public slug
- status: `active`, `coming_soon`, `disabled`
- public hero copy
- active modules
- sort order

This keeps the public product independent from provider uptime, API quotas, and autocomplete limits.

## Admin Flow

1. Open `/admin/cities`.
2. Search the municipality in the "Registro nazionale" panel.
3. Click `Attiva` or set it as `coming_soon`.
4. The city appears in the business city selector.
5. Open `/admin/businesses` to create or move businesses into that city.

The root page `/` searches only public `City` records with `status: active`. The platform console can still list and re-enable `coming_soon` or `disabled` cities.

## Import Flow

The bootstrap seed contains a small set of cities for development. Import the full dataset before real rollout.

```bash
cd backend
npm run cities:import -- path/to/istat-comuni.csv
```

The importer accepts CSV or JSON and tries common ISTAT/OpenAPI-style column names:

- `denominazione_in_italiano`
- `denominazione_comune`
- `codice_comune_formato_alfanumerico`
- `codice_istat`
- `sigla_automobilistica`
- `denominazione_regione`
- `codice_catastale`

For XLSX files, export the worksheet as CSV first.

## Sources

- ISTAT classification page: https://www.istat.it/classificazione/codici-dei-comuni-delle-province-e-delle-regioni/
- SITUAS portal referenced by ISTAT: https://situas.istat.it
- OpenAPI comuni ISTAT product, useful as optional enrichment provider: https://openapi.it/prodotti/comuni-istat

## Future Notes

The backend now resolves tenant requests by both `X-City-Slug` and `X-Business-Slug` when available. That prepares the app for duplicate business slugs in different cities, such as:

```txt
/cagli/sushi
/roma/sushi
```

Before relying on duplicate slugs in production, check MongoDB indexes and drop any old global unique index on `businesses.slug`.

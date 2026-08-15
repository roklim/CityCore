# City Registry

## Decision

CityCore uses a local global city registry instead of a live third-party autocomplete.

```txt
GeoNames downloadable dataset
    -> CityRegistry
    -> global admin activation
    -> City
    -> public /:citySlug directory
```

`CityRegistry` is the geographic catalogue. `City` is a CityCore market that has actually been activated and configured.

This separation keeps public routing, business management and access control independent from provider uptime, request quotas and per-search costs. It also prevents CityCore from generating public pages for hundreds of thousands of empty locations.

## Primary Dataset

The initial worldwide source is GeoNames `cities500`.

The downloaded dump is imported into the CityCore PostgreSQL database. The running application never calls the GeoNames web service for normal city or business autocomplete.

Supporting GeoNames files improve labels without changing the source identity:

- `admin1CodesASCII.txt`
- `admin2Codes.txt`
- `countryInfo.txt`

The import layer remains provider-neutral so another source can be added later without changing the `City` domain model.

## Models

### `CityRegistry`

`CityRegistry` is the global geographic source catalogue.

Existing Italian fields remain supported for backward compatibility:

- municipality name and registry slug
- ISTAT code
- cadastral code
- province code and name
- region code and name

Global fields include:

- `source` plus provider `externalId` as the unique source identity
- canonical name and ASCII name
- useful alternate names
- ISO 3166-1 alpha-2 country code and country display name
- administrative division codes and names
- latitude and longitude
- IANA timezone
- population
- geographic feature class and feature code
- source version and source modification date
- normalized search text
- active/suppressed place state

`CityRegistry.slug` is a normalized search/display helper and is intentionally **not globally unique**. Same-name places are valid registry records. The stable imported identity is the composite `(source, externalId)` key.

### `City`

`City` is an enabled CityCore market:

- optional `registryId`
- globally unique public city slug
- public name
- province/administrative-area display value
- region/administrative-area display value
- country code
- status: `active`, `coming_soon`, `disabled`
- public hero and SEO content
- categories, businesses, access grants and other CityCore configuration

Only `City` records participate in public city routing and normal business/access scopes.

When a `City` is created from a registry record, a database trigger applies the registry country and missing administrative-area values. This prevents the legacy Italian default from leaking into non-Italian cities.

## Public Slug Policy

Registry slugs and public city slugs serve different purposes.

The activation flow first tries the readable normalized place slug. If a public City already owns that slug, activation must use a stable disambiguating suffix rather than overwrite or rename the existing City.

Published City slugs are never changed by a GeoNames refresh.

## Admin Flow

1. Open `/admin/cities`.
2. Search the global registry by city/place name.
3. Inspect country and administrative area to disambiguate same-name locations.
4. Activate the selected registry record as a CityCore `City`.
5. Configure at least one active category.
6. The resulting `City` becomes searchable in business creation.
7. Access grants are assigned only to activated `City` or `Business` records, never directly to raw registry entries.

## Business Creation

Business creation does not preload a fixed number of cities.

The page receives only a small initial suggestion set. The create form searches all activated, accessible and ready City records server-side with a debounced lookup. Therefore `20` is a result-page size, not a catalogue limit.

For registry-backed cities, the city lookup returns the GeoNames IANA timezone. The business create form submits that timezone and the API validates it with the existing IANA timezone schema. Existing business timezone behavior remains unchanged after creation.

## Access Management

Access management does not preload a fixed number of cities or businesses.

The page receives small initial suggestion sets. City and business selectors then search authenticated server-side lookup endpoints. Business search is scoped server-side to the selected City.

The selected values continue to reference normal CityCore `City` and `Business` records, so the existing permission model is unchanged.

## Import Flow

Apply the database migrations before importing the dataset:

```bash
npm run db:migrate:deploy
npm run db:generate
```

Download and unzip the GeoNames files into a temporary local directory, then verify a bounded sample without writing anything:

```bash
npm run db:import:geonames -- \
  --file .tmp/geonames/cities500.txt \
  --admin1 .tmp/geonames/admin1CodesASCII.txt \
  --admin2 .tmp/geonames/admin2Codes.txt \
  --country-info .tmp/geonames/countryInfo.txt \
  --source-version 2026-08-15 \
  --limit 1000 \
  --dry-run
```

Run the full idempotent import by removing `--limit` and `--dry-run`:

```bash
npm run db:import:geonames -- \
  --file .tmp/geonames/cities500.txt \
  --admin1 .tmp/geonames/admin1CodesASCII.txt \
  --admin2 .tmp/geonames/admin2Codes.txt \
  --country-info .tmp/geonames/countryInfo.txt \
  --source-version 2026-08-15
```

The importer:

- streams the tab-delimited UTF-8 file instead of loading it entirely in memory
- imports populated-place (`P`) records
- supports dry-run and bounded test imports
- upserts in configurable batches
- is idempotent through `(source, externalId)`
- preserves existing Italian registry-specific fields
- populates administrative and country labels when enrichment files are supplied
- stores IANA timezone, population and source modification date
- includes canonical, ASCII and useful alternate names in normalized `searchText`
- never creates public `City` records during bulk import

## Search Strategy

The registry can contain hundreds of thousands of rows, so UI selectors never download the full catalogue.

Authenticated lookup endpoints return at most 50 entries and normal UI requests use 20. Registry results prioritize exact and prefix matches, then population. PostgreSQL prefix indexes support the autocomplete path without requiring an optional database extension.

Lookup routes:

```txt
GET /api/v2/platform-core/lookups/city-registry?q=rome&limit=20
GET /api/v2/platform-core/lookups/cities?q=rome&ready=true&limit=20
GET /api/v2/platform-core/lookups/businesses?citySlug=rome&q=studio&limit=20
```

The existing paginated registry endpoint remains available for the administrative registry table and linked/unlinked filtering.

## Public Routing

The public product continues to read only activated public `City` records.

Examples:

```txt
/cagli
/rome
/new-york
```

Businesses remain city-first:

```txt
/cagli/bottega-civica
/rome/studio-centrale
/new-york/example-business
```

Importing a place into `CityRegistry` alone never creates a public route or sitemap entry.

## Verification

Canonical repository checks remain:

```bash
npm run db:validate
npm run db:migrate:deploy
npm run db:migrate:status
npm run db:generate
npm run lint
npm run format:check
npm run typecheck
npm run build:web
npm run build:api
```

Registry-specific unit tests cover accent normalization, exact/prefix ranking and population tie-breaking.

## Source and Attribution

Primary geographic source:

- GeoNames geographical database: https://www.geonames.org/
- GeoNames downloadable dump: https://download.geonames.org/export/dump/

GeoNames data is distributed under Creative Commons Attribution 4.0. CityCore must retain appropriate attribution wherever the dataset is distributed or used in a production product.

Italian official identifiers such as ISTAT and cadastral codes remain optional national enrichment fields and are not replaced by the global provider-neutral identifiers.

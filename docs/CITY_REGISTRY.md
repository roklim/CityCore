# City Registry

## Decision

CityCore uses a local global city registry instead of a live third-party autocomplete.

```txt
trusted geographic dataset
    -> CityRegistry
    -> global admin activation
    -> City
    -> public /:citySlug directory
```

`CityRegistry` is the geographic catalogue. `City` is a CityCore market that has actually been activated and configured.

This separation keeps public routing, business management and access control independent from provider uptime, request quotas and per-search costs. It also prevents CityCore from generating public pages for hundreds of thousands of empty locations.

## Primary Dataset

The initial worldwide source is GeoNames `cities500`.

It is large enough for global city discovery while remaining practical to import into the CityCore PostgreSQL database. The importer must use the downloaded dump locally: the application must not call the GeoNames web service for every autocomplete request.

The import layer must remain provider-neutral so another source can be added or used for enrichment later without changing the `City` domain model.

## Models

### `CityRegistry`

`CityRegistry` is the global geographic source catalogue.

Existing Italian fields remain supported for backward compatibility:

- municipality name and registry slug
- ISTAT code
- cadastral code
- province code and name
- region code and name

The global model additionally needs provider-neutral fields for:

- namespaced external identifier, for example `geonames:5128581`
- canonical name and ASCII name
- ISO 3166-1 alpha-2 country code
- country display name
- first administrative division code and name
- second administrative division code and name
- latitude and longitude
- IANA timezone
- population
- geographic feature class and feature code
- source and source version
- normalized search text including useful alternate names
- active/suppressed place state

`CityRegistry.slug` is an internal unique registry slug, not the public CityCore route. Imported records must therefore use a collision-safe deterministic value. For GeoNames, the importer should include the country and GeoNames id in the registry slug when needed.

### `City`

`City` is an enabled CityCore market:

- optional `registryId`
- public city slug
- public name
- province/administrative-area display value
- region/administrative-area display value
- country code
- status: `active`, `coming_soon`, `disabled`
- public hero and SEO content
- categories, businesses, access grants and other CityCore configuration

Only `City` records participate in public city routing and normal business/access scopes.

## Public Slug Policy

Registry slugs and public city slugs serve different purposes.

Registry slugs only need to be stable and globally unique. Public `City.slug` values should remain human-readable.

Recommended activation policy:

1. Try the normalized city name, for example `rome` or `new-york`.
2. If that slug is already used by another City, add the most useful administrative discriminator, for example `springfield-il`.
3. If ambiguity still remains, add the country code or another stable discriminator.
4. Never silently change an already published City slug during registry refreshes.

## Admin Flow

1. Open `/admin/cities`.
2. Search the global registry by city/place name.
3. Inspect country and administrative area to disambiguate same-name locations.
4. Activate the selected registry record as `coming_soon` or `active`.
5. Configure at least one active category.
6. The resulting `City` becomes selectable for business creation according to the existing readiness rules.
7. Access grants are assigned only to activated `City` or `Business` records, never directly to raw registry entries.

## Business Creation

Business creation must not preload a fixed number of cities.

The city selector must search activated and accessible `City` records server-side. A global registry record that has not yet become a `City` is first activated through the city flow so the existing CityCore prerequisites remain explicit.

When a registry-backed City has a known IANA timezone, new businesses should inherit that timezone by default unless an administrator explicitly chooses another valid timezone.

## Access Management

Access management must not preload a fixed number of cities or businesses.

City and business scopes must be found with authenticated server-side search. The selected values still reference normal CityCore `City` and `Business` records so the existing permission model remains unchanged.

## Import Flow

The development seed may contain only a small sample. Production-like environments import the worldwide registry with an operational tool under `tools/`.

The importer must:

- read GeoNames tab-delimited UTF-8 data
- support dry-run and bounded test imports
- use namespaced external ids so imports are idempotent
- upsert in batches rather than one row at a time
- preserve existing Italian registry-specific fields
- populate country/admin names from the GeoNames supporting files when available
- store IANA timezone and population
- include canonical, ASCII and useful alternate names in normalized `searchText`
- record source and source version
- avoid creating `City` rows automatically during bulk import

A future synchronization job may consume GeoNames modification/deletion files, but initial rollout uses a full deterministic import.

## Search Strategy

The registry can contain hundreds of thousands of records, so UI selectors must never download the whole catalogue.

Search is server-side and returns a small page, normally 10-20 results. Results should favor exact/prefix matches and useful populated places, while still allowing country and administrative-area disambiguation.

For PostgreSQL, a trigram/full-text style index can be added when the dataset is imported so substring search remains responsive at global scale.

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

Importing a place into `CityRegistry` alone must never create a public route or sitemap entry.

## Source and Attribution

Primary geographic source:

- GeoNames geographical database: https://www.geonames.org/
- GeoNames downloadable dump: https://download.geonames.org/export/dump/

GeoNames data is distributed under Creative Commons Attribution 4.0. CityCore must retain appropriate attribution wherever the dataset is distributed or used in a production product.

Italian official identifiers such as ISTAT and cadastral codes remain optional national enrichment fields and are not replaced by the global provider-neutral identifiers.

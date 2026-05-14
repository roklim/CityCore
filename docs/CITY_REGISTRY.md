# City Registry

## Decision

City search is powered by a local registry of verified Italian municipalities,
not by a live third-party autocomplete.

```txt
trusted source
    -> CityRegistry
    -> global admin activation
    -> City
    -> public /:citySlug directory
```

This keeps the public product independent from provider uptime, API quotas and
autocomplete limits.

## Models

`CityRegistry` is the national source of truth:

- municipality name and slug
- ISTAT code
- cadastral code when available
- province code and name
- region code and name
- source and source version
- active or suppressed municipality flag

`City` is the enabled market shown in CityCore:

- `registryId`
- public slug
- status: `active`, `coming_soon`, `disabled`
- public hero copy
- active modules
- sort order

## Admin Flow

1. Open `/admin`.
2. Search the municipality in the registry surface.
3. Activate it as `active` or `coming_soon`.
4. The city appears in business creation and public discovery.
5. Assign businesses to the city and publish them.

The root page `/` reads only public `City` records with `status: active`.

## Import Flow

The seed contains only a small development slice. Before a real rollout, import
the full dataset into `CityRegistry`.

Accepted source shapes:

- CSV
- JSON exported from a trusted registry source

Typical columns:

- `denominazione_in_italiano`
- `denominazione_comune`
- `codice_comune_formato_alfanumerico`
- `codice_istat`
- `sigla_automobilistica`
- `denominazione_regione`
- `codice_catastale`

For XLSX, export the worksheet as CSV first.

## Public Routing

The registry supports city-first routes such as:

```txt
/cagli
/rimini
/roma
```

Businesses then live under the selected city:

```txt
/cagli/forno-locale-demo
/roma/sushi-centrale
```

## Sources

- ISTAT classification page: https://www.istat.it/classificazione/codici-dei-comuni-delle-province-e-delle-regioni/
- SITUAS portal referenced by ISTAT: https://situas.istat.it
- OpenAPI comuni ISTAT product, useful as optional enrichment provider: https://openapi.it/prodotti/comuni-istat

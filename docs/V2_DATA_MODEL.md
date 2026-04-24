# Platform V2 - Data Model

## Principi

Il modello dati V2 deve supportare:

- multi-citta
- multi-business
- multi-modulo
- ruoli scoped
- pagine pubbliche template-driven
- onboarding AI
- auditing

Il database target raccomandato e `Postgres`.


## Convenzioni

- ogni tabella core usa `id`
- slug pubblici leggibili per citta e business
- `created_at` e `updated_at` ovunque
- scope esplicito per permessi e audit
- moduli verticali isolati ma collegati al core


## Entita Core

### `users`

Identita unica della persona.

Campi principali:

```txt
id
email
password_hash
name
phone
status                active | invited | disabled
email_verified_at
phone_verified_at
last_login_at
auth_version
created_at
updated_at
```

### `access_grants`

Permessi scoped.

```txt
id
user_id
role                  global_admin | city_admin | local_admin | staff
scope_type            platform | city | business
city_id
business_id
active
created_by_user_id
last_used_at
created_at
updated_at
```

Regole:

- `global_admin` usa `scope_type=platform`
- `city_admin` usa `scope_type=city`
- `local_admin` e `staff` usano `scope_type=business`

### `customer_profiles`

Profilo globale cliente.

```txt
id
user_id
display_name
phone
default_city_id
marketing_consent
preferences_json
created_at
updated_at
```


## Layer Citta

### `city_registry`

Fonte verificata dei comuni.

```txt
id
name
slug
province_code
province_name
region_code
region_name
country
istat_code
cadastral_code
source
source_version
lat
lng
active_municipality
search_text
created_at
updated_at
```

### `cities`

Mercati attivi della piattaforma.

```txt
id
registry_id
name
slug
province
region
country
status                active | coming_soon | disabled
active
hero_title
hero_description
sort_order
seo_title
seo_description
featured_image_asset_id
created_at
updated_at
```

### `service_areas`

Zone operative dentro una citta.

```txt
id
city_id
name
slug
type                  district | zone | polygon | radius
center_lat
center_lng
radius_meters
polygon_json
active
created_at
updated_at
```


## Layer Business

### `business_templates`

Definizione del template attivita.

```txt
id
code                  pizzeria | barber | bnb | ...
name
category              food | service | stays | mobility | rental | custom
primary_module
field_schema_json
section_schema_json
default_cta_label
active
created_at
updated_at
```

### `businesses`

Tenant principale.

```txt
id
city_id
template_id
name
slug
legal_name
category
status                draft | active | paused | disabled
plan                  free | pro | premium | enterprise
subscription_status   trialing | active | past_due | cancelled
public_email
public_phone
website
address_line_1
address_line_2
postal_code
lat
lng
timezone
currency
locale
owner_user_id
primary_color
accent_color
logo_asset_id
cover_asset_id
public_title
public_subtitle
public_description
seo_title
seo_description
booking_policy
cancellation_policy
notes_internal
created_at
updated_at
```

### `business_modules`

Moduli attivi del business.

```txt
id
business_id
module_code           ordering | appointments | stays | mobility_request | rentals
active
settings_json
created_at
updated_at
```

### `business_contacts`

Contatti pubblici e operativi.

```txt
id
business_id
type                  public | support | booking | delivery | owner
label
email
phone
whatsapp
active
created_at
updated_at
```

### `business_hours`

Orari strutturati.

```txt
id
business_id
weekday               0..6
opens_at
closes_at
closed
service_area_id
created_at
updated_at
```

### `business_staff_profiles`

Profilo operativo per membri business.

```txt
id
business_id
user_id
title
bio
photo_asset_id
visible_publicly
created_at
updated_at
```


## Public Page System

### `page_sections`

Blocchi pagina pubblica del business.

```txt
id
business_id
section_type          hero | gallery | faq | menu_preview | services | rooms | transport | custom
title
subtitle
content_json
sort_order
visible
generated_by_ai
created_at
updated_at
```

### `assets`

Media centralizzati.

```txt
id
business_id
city_id
type                  image | logo | cover | gallery | document
provider
storage_key
public_url
mime_type
width
height
alt_text
metadata_json
created_by_user_id
created_at
updated_at
```

### `ai_generations`

Traccia delle generazioni AI.

```txt
id
business_id
city_id
prompt_type
input_json
output_json
status                queued | completed | failed
model
created_by_user_id
created_at
updated_at
```


## Audit e Governance

### `audit_logs`

```txt
id
actor_user_id
action
target_type
target_id
scope_type
city_id
business_id
metadata_json
ip_address
user_agent
created_at
```

Azioni tipiche:

- login_success
- login_failed
- city_activated
- city_status_changed
- business_created
- business_updated
- access_grant_created
- access_grant_disabled
- password_reset_requested
- password_changed


## Verticale Ordering

### `menu_categories`

```txt
id
business_id
name
slug
sort_order
active
created_at
updated_at
```

### `menu_items`

```txt
id
business_id
category_id
name
slug
description
price
compare_at_price
available
featured
image_asset_id
tags_json
allergens_json
sort_order
created_at
updated_at
```

### `orders`

```txt
id
business_id
customer_profile_id
customer_name
customer_phone
customer_email
status                pending | confirmed | preparing | ready | completed | cancelled
fulfillment_type      pickup | delivery
pickup_at
delivery_address_json
notes
subtotal
discount_total
service_fee
delivery_fee
grand_total
payment_status
source                web | admin | phone
created_at
updated_at
```

### `order_items`

```txt
id
order_id
menu_item_id
name_snapshot
price_snapshot
qty
notes
line_total
created_at
updated_at
```


## Verticale Appointments

### `services`

```txt
id
business_id
name
slug
description
duration_minutes
price
active
sort_order
created_at
updated_at
```

### `availability_rules`

```txt
id
business_id
staff_user_id
weekday
starts_at
ends_at
slot_minutes
capacity
active
created_at
updated_at
```

### `appointments`

```txt
id
business_id
service_id
staff_user_id
customer_profile_id
customer_name
customer_phone
customer_email
status                requested | confirmed | completed | cancelled | no_show
starts_at
ends_at
notes
price_snapshot
created_at
updated_at
```


## Verticale Stays

### `room_types`

```txt
id
business_id
name
slug
description
base_price
capacity
active
created_at
updated_at
```

### `rooms`

```txt
id
business_id
room_type_id
name
code
active
created_at
updated_at
```

### `stay_availability`

```txt
id
business_id
room_id
date
available
price_override
min_nights
created_at
updated_at
```

### `stays`

```txt
id
business_id
room_id
customer_profile_id
guest_name
guest_phone
guest_email
status                requested | confirmed | checked_in | checked_out | cancelled
check_in_date
check_out_date
guest_count
total_price
notes
created_at
updated_at
```


## Verticale Mobility Request

### `mobility_requests`

```txt
id
business_id
customer_profile_id
customer_name
customer_phone
pickup_address_json
dropoff_address_json
pickup_time_requested
status                requested | accepted | assigned | completed | cancelled
service_area_id
notes
estimated_price
created_at
updated_at
```

Nota: il dispatch realtime completo non e parte del primo modello target.


## Verticale Rentals

### `rental_items`

```txt
id
business_id
name
slug
description
base_price
pricing_unit          hour | day
stock
active
created_at
updated_at
```

### `rentals`

```txt
id
business_id
rental_item_id
customer_profile_id
customer_name
customer_phone
starts_at
ends_at
status                requested | confirmed | active | returned | cancelled
total_price
deposit_amount
notes
created_at
updated_at
```


## Relazioni Principali

```txt
User 1--n AccessGrant
User 1--1 CustomerProfile
CityRegistry 1--n City
City 1--n Business
BusinessTemplate 1--n Business
Business 1--n BusinessModule
Business 1--n PageSection
Business 1--n Asset
Business 1--n AuditLog
Business 1--n MenuItem
Business 1--n Service
Business 1--n Room
Business 1--n MobilityRequest
Business 1--n RentalItem
```


## Scope e Ownership

### Scope platform

- users
- access_grants
- city_registry
- cities
- business_templates

### Scope city

- service_areas
- featured content cittadini
- ranking e visibilita

### Scope business

- business_modules
- page_sections
- assets
- menu
- orders
- services
- appointments
- rooms
- stays
- mobility_requests
- rentals


## Stato Minimo per Attivare un Business

Un business puo passare da `draft` a `active` quando ha:

- city assegnata
- template assegnato
- modulo principale attivo
- title e description pubblica
- almeno un asset base o fallback approvato
- almeno un access grant owner/local_admin


## Flusso Dati Onboarding AI

1. Creazione business in `draft`
2. Selezione template
3. Attivazione moduli
4. Generazione AI iniziale
5. Salvataggio `page_sections`
6. Caricamento asset
7. Revisione umana
8. Pubblicazione `active`


## Decisione Finale

Il modello V2 deve essere:

- relazionale nel core
- modulare nei verticali
- template-driven lato pagina
- scope-aware lato permessi
- tracciabile lato audit
- compatibile con AI onboarding senza rendere l'AI arbitro del dato vero

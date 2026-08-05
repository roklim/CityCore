# Data model — Fase 2

La Fase 2 riusa `CityCategory` e `BusinessCategoryAssignment`; aggiunge
`BusinessService`, `BusinessOpeningDay`, `BusinessOpeningInterval` e
`BusinessInquiry`. Gli orari usano una riga giornaliera e intervalli figli:
supportano chiusura e note senza serializzare JSON. Gli intervalli oltre la
mezzanotte sono esplicitamente vietati.

```mermaid
erDiagram
  CITY ||--o{ CITY_CATEGORY : owns
  BUSINESS ||--o{ BUSINESS_CATEGORY_ASSIGNMENT : assigned
  CITY_CATEGORY ||--o{ BUSINESS_CATEGORY_ASSIGNMENT : classifies
  BUSINESS ||--o{ BUSINESS_SERVICE : offers
  BUSINESS ||--o{ BUSINESS_OPENING_DAY : opens
  BUSINESS_OPENING_DAY ||--o{ BUSINESS_OPENING_INTERVAL : contains
  BUSINESS ||--o{ BUSINESS_INQUIRY : receives
```

Categorie: slug unico per city, parent nella stessa city e solo due livelli;
non sono eliminabili con figli o assegnazioni. Le assegnazioni richiedono
categorie attive della city del business.

La pubblicazione usa `Business.status = active` e `publishedAt`; richiede city
attiva, descrizione, categoria attiva e contatto pubblico. I servizi pubblici
usano `PublicationStatus.published`. Inquiry: `new -> read -> closed`.

Indici aggiunti: servizio `(businessId,status,sortOrder)`, giorno/interval
orari, inquiry `(businessId,status,createdAt)` e unicita servizio per slug.

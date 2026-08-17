-- Enable the thesis demo ordering flow only for the known Cagli / Mucho Gusto demo row.
-- Existing operator ordering settings or same-slug services are never overwritten.
INSERT INTO "business_ordering_settings" (
  "id",
  "business_id",
  "enabled",
  "pickup_lead_minutes",
  "slot_minutes",
  "slot_capacity",
  "minimum_order_cents",
  "created_at",
  "updated_at"
)
SELECT
  'demo-mucho-gusto-ordering-20260817',
  b."id",
  TRUE,
  30,
  15,
  4,
  0,
  NOW(),
  NOW()
FROM "businesses" AS b
JOIN "cities" AS c ON c."id" = b."city_id"
WHERE c."slug" = 'cagli'
  AND b."slug" = 'mucho-gusto'
  AND NOT EXISTS (
    SELECT 1
    FROM "business_ordering_settings" AS s
    WHERE s."business_id" = b."id"
  );

INSERT INTO "business_services" (
  "id",
  "business_id",
  "name",
  "slug",
  "short_description",
  "description",
  "price_label",
  "price_cents",
  "pickup_enabled",
  "status",
  "sort_order",
  "created_at",
  "updated_at"
)
SELECT
  item."id",
  b."id",
  item."name",
  item."slug",
  item."short_description",
  item."description",
  item."price_label",
  item."price_cents",
  TRUE,
  'published'::"PublicationStatus",
  item."sort_order",
  NOW(),
  NOW()
FROM "businesses" AS b
JOIN "cities" AS c ON c."id" = b."city_id"
CROSS JOIN (
  VALUES
    (
      'demo-mg-margherita-20260817',
      'Margherita',
      'pizza-margherita-demo',
      'Menu demo · Pomodoro, fiordilatte e basilico.',
      'Prodotto dimostrativo usato per verificare il flusso di ordine con ritiro.',
      '€ 7,50',
      750,
      10
    ),
    (
      'demo-mg-diavola-20260817',
      'Diavola',
      'pizza-diavola-demo',
      'Menu demo · Pomodoro, fiordilatte e salame piccante.',
      'Prodotto dimostrativo usato per verificare il flusso di ordine con ritiro.',
      '€ 9,00',
      900,
      20
    ),
    (
      'demo-mg-vegetariana-20260817',
      'Vegetariana',
      'pizza-vegetariana-demo',
      'Menu demo · Fiordilatte e verdure di stagione.',
      'Prodotto dimostrativo usato per verificare il flusso di ordine con ritiro.',
      '€ 9,00',
      900,
      30
    ),
    (
      'demo-mg-capricciosa-20260817',
      'Capricciosa',
      'pizza-capricciosa-demo',
      'Menu demo · Una proposta classica per la simulazione.',
      'Prodotto dimostrativo usato per verificare il flusso di ordine con ritiro.',
      '€ 10,00',
      1000,
      40
    ),
    (
      'demo-mg-speciale-20260817',
      'Speciale della casa',
      'pizza-speciale-demo',
      'Menu demo · Ricetta dimostrativa della casa.',
      'Prodotto dimostrativo usato per verificare il flusso di ordine con ritiro.',
      '€ 11,50',
      1150,
      50
    )
) AS item(
  "id",
  "name",
  "slug",
  "short_description",
  "description",
  "price_label",
  "price_cents",
  "sort_order"
)
WHERE c."slug" = 'cagli'
  AND b."slug" = 'mucho-gusto'
  AND NOT EXISTS (
    SELECT 1
    FROM "business_services" AS existing
    WHERE existing."business_id" = b."id"
      AND existing."slug" = item."slug"
  );

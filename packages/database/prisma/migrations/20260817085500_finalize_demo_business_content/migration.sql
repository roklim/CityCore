-- Final thesis-demo normalization for the known Cagli / Mucho Gusto record.
-- Every change is guarded by the exact placeholder value so real operator data is preserved.
UPDATE "businesses" AS b
SET
  "public_title" = CASE
    WHEN lower(btrim(COALESCE(b."public_title", ''))) = 'mucho gusto - pizzeria'
      THEN 'Mucho Gusto · Pizzeria'
    ELSE b."public_title"
  END,
  "public_email" = CASE
    WHEN lower(btrim(COALESCE(b."public_email", ''))) = 'test@gmail.com' THEN NULL
    ELSE b."public_email"
  END,
  "province" = CASE
    WHEN lower(btrim(COALESCE(b."province", ''))) = 'pu' THEN 'PU'
    ELSE b."province"
  END
FROM "cities" AS c
WHERE b."city_id" = c."id"
  AND b."slug" = 'mucho-gusto'
  AND c."slug" = 'cagli';

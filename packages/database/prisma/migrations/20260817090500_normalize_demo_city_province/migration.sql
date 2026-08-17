-- Normalize the visible province code for the known Cagli thesis-demo city.
-- Guarded by the exact city slug and case-insensitive legacy value.
UPDATE "cities"
SET "province" = 'PU'
WHERE "slug" = 'cagli'
  AND lower(btrim(COALESCE("province", ''))) = 'pu';

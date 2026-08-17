-- Normalize only the known placeholder content used by the thesis demo business.
-- The predicates make this migration safe for environments where the row is absent
-- or where an operator has already replaced the placeholder values.
UPDATE "businesses" AS b
SET
  "name" = CASE
    WHEN lower(btrim(b."name")) = 'mucho gusto - pizzeria' THEN 'Mucho Gusto'
    ELSE b."name"
  END,
  "public_title" = CASE
    WHEN b."public_title" IS NULL OR btrim(b."public_title") = '' THEN 'Mucho Gusto · Pizzeria'
    ELSE b."public_title"
  END,
  "public_subtitle" = CASE
    WHEN lower(btrim(COALESCE(b."public_subtitle", ''))) = 'pizzeria paura'
      THEN 'Pizzeria locale a Cagli, con informazioni, servizi e contatti sempre a portata di mano.'
    ELSE b."public_subtitle"
  END,
  "public_description" = CASE
    WHEN lower(btrim(COALESCE(b."public_description", ''))) = 'pizzeria paura'
      THEN 'Scopri Mucho Gusto a Cagli: consulta le informazioni dell''attività, i servizi disponibili e i contatti aggiornati direttamente dalla scheda CityCore.'
    ELSE b."public_description"
  END,
  "address_line_1" = CASE
    WHEN lower(btrim(COALESCE(b."address_line_1", ''))) = 'via gay' THEN NULL
    ELSE b."address_line_1"
  END,
  "locality" = CASE
    WHEN lower(btrim(COALESCE(b."locality", ''))) = 'cagli' THEN c."name"
    ELSE b."locality"
  END,
  "province" = CASE
    WHEN btrim(COALESCE(b."province", '')) = '' AND btrim(COALESCE(c."province", '')) <> ''
      THEN c."province"
    ELSE b."province"
  END
FROM "cities" AS c
WHERE b."city_id" = c."id"
  AND b."slug" = 'mucho-gusto'
  AND c."slug" = 'cagli';

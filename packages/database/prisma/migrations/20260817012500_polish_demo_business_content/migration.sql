-- Normalize only the known placeholder content used by the thesis demo business.
-- The predicates make this migration safe for environments where the row is absent
-- or where an operator has already replaced the placeholder values.
UPDATE "Business" AS b
SET
  "name" = CASE
    WHEN lower(btrim(b."name")) = 'mucho gusto - pizzeria' THEN 'Mucho Gusto'
    ELSE b."name"
  END,
  "publicTitle" = CASE
    WHEN b."publicTitle" IS NULL OR btrim(b."publicTitle") = '' THEN 'Mucho Gusto · Pizzeria'
    ELSE b."publicTitle"
  END,
  "publicSubtitle" = CASE
    WHEN lower(btrim(COALESCE(b."publicSubtitle", ''))) = 'pizzeria paura'
      THEN 'Pizzeria locale a Cagli, con informazioni, servizi e contatti sempre a portata di mano.'
    ELSE b."publicSubtitle"
  END,
  "publicDescription" = CASE
    WHEN lower(btrim(COALESCE(b."publicDescription", ''))) = 'pizzeria paura'
      THEN 'Scopri Mucho Gusto a Cagli: consulta le informazioni dell''attività, i servizi disponibili e i contatti aggiornati direttamente dalla scheda CityCore.'
    ELSE b."publicDescription"
  END,
  "addressLine1" = CASE
    WHEN lower(btrim(COALESCE(b."addressLine1", ''))) = 'via gay' THEN NULL
    ELSE b."addressLine1"
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
FROM "City" AS c
WHERE b."cityId" = c."id"
  AND b."slug" = 'mucho-gusto'
  AND c."slug" = 'cagli';

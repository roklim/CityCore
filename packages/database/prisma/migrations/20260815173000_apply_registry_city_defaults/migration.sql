-- Registry-backed City records inherit territorial identity from their source row.
-- This prevents the legacy City.country default ('IT') from leaking into global activations.
-- A registry row may only back one CityCore City. PostgreSQL unique indexes allow multiple NULLs.
CREATE UNIQUE INDEX "cities_registry_id_key"
ON "cities"("registry_id");

CREATE OR REPLACE FUNCTION "citycore_apply_registry_city_defaults"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  registry_row RECORD;
  candidate_slug TEXT;
  admin_slug TEXT;
  external_slug TEXT;
BEGIN
  IF NEW."registry_id" IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT
    "country",
    "admin1_code",
    "external_id",
    COALESCE("admin2_name", "province_name", "province_code") AS province_value,
    COALESCE("admin1_name", "region_name", "region_code") AS region_value
  INTO registry_row
  FROM "city_registry"
  WHERE "id" = NEW."registry_id";

  IF FOUND THEN
    NEW."country" := registry_row."country";
    NEW."province" := COALESCE(NEW."province", registry_row.province_value);
    NEW."region" := COALESCE(NEW."region", registry_row.region_value);

    IF TG_OP = 'INSERT' AND EXISTS (
      SELECT 1 FROM "cities" WHERE "slug" = NEW."slug"
    ) THEN
      admin_slug := NULLIF(
        trim(BOTH '-' FROM regexp_replace(lower(COALESCE(registry_row."admin1_code", '')), '[^a-z0-9]+', '-', 'g')),
        ''
      );
      candidate_slug := left(NEW."slug", 90) || '-' || lower(registry_row."country");
      IF admin_slug IS NOT NULL THEN
        candidate_slug := candidate_slug || '-' || admin_slug;
      END IF;

      IF EXISTS (SELECT 1 FROM "cities" WHERE "slug" = candidate_slug) THEN
        external_slug := NULLIF(
          trim(BOTH '-' FROM regexp_replace(lower(COALESCE(registry_row."external_id", NEW."registry_id")), '[^a-z0-9]+', '-', 'g')),
          ''
        );
        candidate_slug := left(candidate_slug, 100) || '-' || right(external_slug, 16);
      END IF;

      NEW."slug" := candidate_slug;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "cities_apply_registry_defaults" ON "cities";

CREATE TRIGGER "cities_apply_registry_defaults"
BEFORE INSERT OR UPDATE OF "registry_id" ON "cities"
FOR EACH ROW
EXECUTE FUNCTION "citycore_apply_registry_city_defaults"();

-- Registry-backed City records inherit territorial identity from their source row.
-- This prevents the legacy City.country default ('IT') from leaking into global activations.
CREATE OR REPLACE FUNCTION "citycore_apply_registry_city_defaults"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  registry_row RECORD;
BEGIN
  IF NEW."registry_id" IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT
    "country",
    COALESCE("admin2_name", "province_name", "province_code") AS province_value,
    COALESCE("admin1_name", "region_name", "region_code") AS region_value
  INTO registry_row
  FROM "city_registry"
  WHERE "id" = NEW."registry_id";

  IF FOUND THEN
    NEW."country" := registry_row."country";
    NEW."province" := COALESCE(NEW."province", registry_row.province_value);
    NEW."region" := COALESCE(NEW."region", registry_row.region_value);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "cities_apply_registry_defaults" ON "cities";

CREATE TRIGGER "cities_apply_registry_defaults"
BEFORE INSERT OR UPDATE OF "registry_id" ON "cities"
FOR EACH ROW
EXECUTE FUNCTION "citycore_apply_registry_city_defaults"();

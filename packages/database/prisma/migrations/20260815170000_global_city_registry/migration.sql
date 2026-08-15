-- Globalize CityRegistry while preserving the existing Italian registry fields.

-- The registry slug is a search/display helper, not a global identity. Different places may
-- legitimately share the same name/slug, so identity moves to (source, external_id).
DROP INDEX IF EXISTS "city_registry_slug_key";

ALTER TABLE "city_registry"
ADD COLUMN "ascii_name" TEXT,
ADD COLUMN "external_id" TEXT,
ADD COLUMN "alternate_names" TEXT,
ADD COLUMN "admin1_code" TEXT,
ADD COLUMN "admin1_name" TEXT,
ADD COLUMN "admin2_code" TEXT,
ADD COLUMN "admin2_name" TEXT,
ADD COLUMN "admin3_code" TEXT,
ADD COLUMN "admin4_code" TEXT,
ADD COLUMN "country_name" TEXT,
ADD COLUMN "feature_class" TEXT,
ADD COLUMN "feature_code" TEXT,
ADD COLUMN "population" INTEGER,
ADD COLUMN "timezone" TEXT,
ADD COLUMN "source_modified_at" DATE;

CREATE UNIQUE INDEX "city_registry_source_external_id_key"
ON "city_registry"("source", "external_id");

CREATE INDEX "city_registry_slug_idx" ON "city_registry"("slug");
CREATE INDEX "city_registry_country_idx" ON "city_registry"("country");
CREATE INDEX "city_registry_admin1_code_idx" ON "city_registry"("admin1_code");
CREATE INDEX "city_registry_admin2_code_idx" ON "city_registry"("admin2_code");
CREATE INDEX "city_registry_population_idx" ON "city_registry"("population");

-- Prefix indexes keep autocomplete fast without requiring a PostgreSQL extension.
CREATE INDEX "city_registry_search_text_prefix_idx"
ON "city_registry" ("search_text" text_pattern_ops);

CREATE INDEX "city_registry_ascii_name_prefix_idx"
ON "city_registry" (lower("ascii_name") text_pattern_ops);

CREATE INDEX "city_registry_name_prefix_idx"
ON "city_registry" (lower("name") text_pattern_ops);

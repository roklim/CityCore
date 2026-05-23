-- Normalize legacy vertical values into the CityCore core taxonomy before
-- recreating PostgreSQL enums without obsolete values.

INSERT INTO "business_templates" (
    "id",
    "code",
    "name",
    "category",
    "primary_module",
    "field_schema_json",
    "section_schema_json",
    "default_cta_label",
    "active",
    "created_at",
    "updated_at"
)
SELECT
    'citycore-local-business-template',
    'local_business',
    'Local Business',
    'commerce'::"TemplateCategory",
    'catalog'::"ModuleCode",
    '["name", "city", "hours", "contacts", "catalog"]'::jsonb,
    '["hero", "highlights", "gallery", "faq", "contact"]'::jsonb,
    'Esplora il business',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1
    FROM "business_templates"
    WHERE "code" = 'local_business'
);

UPDATE "businesses"
SET "template_id" = (
    SELECT "id"
    FROM "business_templates"
    WHERE "code" = 'local_business'
    LIMIT 1
)
WHERE "template_id" IN (
    SELECT "id"
    FROM "business_templates"
    WHERE
        "code" = 'pizzeria'
        OR "name" ILIKE 'pizzeria'
        OR "category"::text = 'food'
        OR "primary_module"::text = 'ordering'
);

DELETE FROM "business_templates"
WHERE
    "code" = 'pizzeria'
    OR "name" ILIKE 'pizzeria'
    OR "category"::text = 'food'
    OR "primary_module"::text = 'ordering';

UPDATE "businesses"
SET "category" = 'commerce'
WHERE "category"::text = 'food';

DELETE FROM "business_modules" AS legacy
USING "business_modules" AS canonical
WHERE
    legacy."business_id" = canonical."business_id"
    AND legacy."module_code"::text = 'ordering'
    AND canonical."module_code"::text = 'catalog';

UPDATE "business_modules"
SET "module_code" = 'catalog'
WHERE "module_code"::text = 'ordering';

ALTER TYPE "TemplateCategory" RENAME TO "TemplateCategory_old";

CREATE TYPE "TemplateCategory" AS ENUM (
    'commerce',
    'service',
    'hospitality',
    'editorial',
    'custom'
);

ALTER TABLE "business_templates"
ALTER COLUMN "category" TYPE "TemplateCategory"
USING "category"::text::"TemplateCategory";

ALTER TABLE "businesses"
ALTER COLUMN "category" TYPE "TemplateCategory"
USING "category"::text::"TemplateCategory";

DROP TYPE "TemplateCategory_old";

ALTER TYPE "ModuleCode" RENAME TO "ModuleCode_old";

CREATE TYPE "ModuleCode" AS ENUM (
    'content',
    'catalog',
    'forms_inbox',
    'booking',
    'hospitality',
    'listings',
    'directory',
    'events'
);

ALTER TABLE "business_templates"
ALTER COLUMN "primary_module" TYPE "ModuleCode"
USING "primary_module"::text::"ModuleCode";

ALTER TABLE "business_modules"
ALTER COLUMN "module_code" TYPE "ModuleCode"
USING "module_code"::text::"ModuleCode";

DROP TYPE "ModuleCode_old";

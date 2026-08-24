export const LEGACY_DEMO_MIGRATION_NAMES = Object.freeze([
  "20260817012500_polish_demo_business_content",
  "20260817085500_finalize_demo_business_content",
  "20260817090500_normalize_demo_city_province",
  "20260817155000_enable_mucho_gusto_demo_ordering",
]);

export const LEGACY_DEMO_MIGRATION_ACKNOWLEDGEMENT = "reviewed-cagli-mucho-gusto";
export const DEMO_SEED_ACKNOWLEDGEMENT = "non-production-demo-database";

function normalizedNodeEnvironment(environment) {
  return environment.NODE_ENV?.trim().toLowerCase() ?? "";
}

export function isProductionMigrationDeploy(args, environment = process.env) {
  return (
    normalizedNodeEnvironment(environment) === "production" &&
    args[0] === "migrate" &&
    args[1] === "deploy"
  );
}

export function legacyDemoMigrationGuardDecision(args, environment = process.env) {
  const productionDeploy = isProductionMigrationDeploy(args, environment);
  const acknowledged =
    productionDeploy &&
    environment.CITYCORE_LEGACY_DEMO_MIGRATIONS_ACK === LEGACY_DEMO_MIGRATION_ACKNOWLEDGEMENT;

  return {
    productionDeploy,
    acknowledged,
    shouldRun: productionDeploy && !acknowledged,
  };
}

export function assertDemoSeedAllowed(seedName, environment = process.env) {
  if (normalizedNodeEnvironment(environment) !== "production") {
    return;
  }

  if (environment.CITYCORE_DEMO_SEED_ACK === DEMO_SEED_ACKNOWLEDGEMENT) {
    return;
  }

  throw new Error(
    `${seedName} refuses to write demo data with NODE_ENV=production. ` +
      `For a production-mode staging database only, set CITYCORE_DEMO_SEED_ACK=${DEMO_SEED_ACKNOWLEDGEMENT} for the single seed invocation.`,
  );
}

const expectedMigrationRows = LEGACY_DEMO_MIGRATION_NAMES.map(
  (migrationName) => `        ('${migrationName}')`,
).join(",\n");

export const LEGACY_DEMO_MIGRATION_GUARD_SQL = `
DO $citycore_legacy_demo_guard$
DECLARE
  has_pending_legacy_demo_migration BOOLEAN := TRUE;
  has_cagli_city BOOLEAN := FALSE;
  has_mucho_gusto_business BOOLEAN := FALSE;
BEGIN
  IF to_regclass('"_prisma_migrations"') IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM (
        VALUES
${expectedMigrationRows}
      ) AS expected("migration_name")
      WHERE NOT EXISTS (
        SELECT 1
        FROM "_prisma_migrations" AS applied
        WHERE applied."migration_name" = expected."migration_name"
          AND applied."finished_at" IS NOT NULL
          AND applied."rolled_back_at" IS NULL
      )
    ) INTO has_pending_legacy_demo_migration;
  END IF;

  IF NOT has_pending_legacy_demo_migration THEN
    RETURN;
  END IF;

  IF to_regclass('"cities"') IS NOT NULL THEN
    EXECUTE 'SELECT EXISTS (SELECT 1 FROM "cities" WHERE "slug" = ''cagli'')'
      INTO has_cagli_city;
  END IF;

  IF to_regclass('"cities"') IS NOT NULL AND to_regclass('"businesses"') IS NOT NULL THEN
    EXECUTE '
      SELECT EXISTS (
        SELECT 1
        FROM "businesses" AS business
        JOIN "cities" AS city ON city."id" = business."city_id"
        WHERE city."slug" = ''cagli''
          AND business."slug" = ''mucho-gusto''
      )'
      INTO has_mucho_gusto_business;
  END IF;

  IF has_cagli_city OR has_mucho_gusto_business THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'CITYCORE_LEGACY_DEMO_MIGRATION_GUARD: pending shared demo-data migrations could mutate an existing cagli/mucho-gusto record';
  END IF;
END
$citycore_legacy_demo_guard$;
`;

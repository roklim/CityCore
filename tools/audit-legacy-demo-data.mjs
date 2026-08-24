import { config as loadEnv } from "dotenv";
import { Prisma, PrismaClient } from "@prisma/client";
import { LEGACY_DEMO_MIGRATION_NAMES } from "./legacy-demo-migration-guard.mjs";

loadEnv({ path: "apps/api/.env", quiet: true });

const prisma = new PrismaClient();
const knownOrderingSettingsId = "demo-mucho-gusto-ordering-20260817";
const knownServiceIds = [
  "demo-mg-margherita-20260817",
  "demo-mg-diavola-20260817",
  "demo-mg-vegetariana-20260817",
  "demo-mg-capricciosa-20260817",
  "demo-mg-speciale-20260817",
];

async function relationState() {
  const [relations] = await prisma.$queryRaw`
    SELECT
      current_database() AS "databaseName",
      current_schema() AS "schemaName",
      to_regclass('"_prisma_migrations"')::text AS "migrationsTable",
      to_regclass('"cities"')::text AS "citiesTable",
      to_regclass('"businesses"')::text AS "businessesTable",
      to_regclass('"business_ordering_settings"')::text AS "orderingSettingsTable",
      to_regclass('"business_services"')::text AS "servicesTable"
  `;

  return relations ?? {};
}

async function appliedMigrationRows(relations) {
  if (!relations.migrationsTable) return [];

  return prisma.$queryRaw(
    Prisma.sql`
      SELECT
        "migration_name" AS "migrationName",
        "started_at" AS "startedAt",
        "finished_at" AS "finishedAt",
        "rolled_back_at" AS "rolledBackAt"
      FROM "_prisma_migrations"
      WHERE "migration_name" IN (${Prisma.join(LEGACY_DEMO_MIGRATION_NAMES)})
      ORDER BY "migration_name" ASC
    `,
  );
}

async function targetState(relations) {
  if (!relations.citiesTable || !relations.businessesTable) {
    return { city: null, business: null };
  }

  const city = await prisma.city.findUnique({
    where: { slug: "cagli" },
    select: {
      id: true,
      name: true,
      slug: true,
      province: true,
      status: true,
      updatedAt: true,
    },
  });
  const business = await prisma.business.findFirst({
    where: { slug: "mucho-gusto", city: { slug: "cagli" } },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      publicTitle: true,
      publicSubtitle: true,
      publicDescription: true,
      publicEmail: true,
      addressLine1: true,
      locality: true,
      province: true,
      updatedAt: true,
    },
  });

  return { city, business };
}

async function knownArtifacts(relations) {
  const orderingSettings = relations.orderingSettingsTable
    ? await prisma.businessOrderingSettings.findUnique({
        where: { id: knownOrderingSettingsId },
        select: {
          id: true,
          businessId: true,
          enabled: true,
          createdAt: true,
          updatedAt: true,
        },
      })
    : null;
  const services = relations.servicesTable
    ? await prisma.businessService.findMany({
        where: { id: { in: knownServiceIds } },
        orderBy: { id: "asc" },
        select: {
          id: true,
          businessId: true,
          name: true,
          slug: true,
          status: true,
          pickupEnabled: true,
          createdAt: true,
          updatedAt: true,
        },
      })
    : [];

  return { orderingSettings, services };
}

function classifyReport({ migrations, target, artifacts }) {
  const appliedNames = new Set(
    migrations
      .filter((migration) => migration.finishedAt && !migration.rolledBackAt)
      .map((migration) => migration.migrationName),
  );
  const allSharedMigrationsApplied = LEGACY_DEMO_MIGRATION_NAMES.every((migrationName) =>
    appliedNames.has(migrationName),
  );
  const knownArtifactCount =
    Number(Boolean(artifacts.orderingSettings)) + artifacts.services.length;

  if (knownArtifactCount > 0) {
    return { status: "known_demo_artifacts_present", allSharedMigrationsApplied };
  }

  if (allSharedMigrationsApplied && (target.city || target.business)) {
    return { status: "manual_review_required", allSharedMigrationsApplied };
  }

  if (allSharedMigrationsApplied) {
    return { status: "no_known_demo_artifacts_detected", allSharedMigrationsApplied };
  }

  return { status: "legacy_migrations_not_fully_applied", allSharedMigrationsApplied };
}

async function main() {
  const relations = await relationState();
  const [migrations, target, artifacts] = await Promise.all([
    appliedMigrationRows(relations),
    targetState(relations),
    knownArtifacts(relations),
  ]);
  const classification = classifyReport({ migrations, target, artifacts });

  console.log(
    JSON.stringify(
      {
        audit: "citycore-legacy-demo-data",
        readOnly: true,
        generatedAt: new Date().toISOString(),
        database: {
          name: relations.databaseName ?? null,
          schema: relations.schemaName ?? null,
        },
        classification,
        sharedMigrations: LEGACY_DEMO_MIGRATION_NAMES.map((migrationName) => {
          const row = migrations.find((migration) => migration.migrationName === migrationName);
          return {
            migrationName,
            applied: Boolean(row?.finishedAt && !row?.rolledBackAt),
            startedAt: row?.startedAt ?? null,
            finishedAt: row?.finishedAt ?? null,
            rolledBackAt: row?.rolledBackAt ?? null,
          };
        }),
        target,
        knownArtifacts: artifacts,
        limitations: [
          "The first three shared data migrations did not persist provenance markers.",
          "This audit cannot infer or restore values that existed before those migrations.",
          "No application data was inserted, updated, archived, or deleted by this command.",
        ],
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

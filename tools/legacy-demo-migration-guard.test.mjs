import assert from "node:assert/strict";
import test from "node:test";
import {
  assertDemoSeedAllowed,
  DEMO_SEED_ACKNOWLEDGEMENT,
  LEGACY_DEMO_MIGRATION_ACKNOWLEDGEMENT,
  LEGACY_DEMO_MIGRATION_GUARD_SQL,
  LEGACY_DEMO_MIGRATION_NAMES,
  legacyDemoMigrationGuardDecision,
} from "./legacy-demo-migration-guard.mjs";

test("runs the guard only for an unacknowledged production migrate deploy", () => {
  assert.deepEqual(
    legacyDemoMigrationGuardDecision(["migrate", "deploy"], { NODE_ENV: "production" }),
    {
      productionDeploy: true,
      acknowledged: false,
      shouldRun: true,
    },
  );

  assert.equal(
    legacyDemoMigrationGuardDecision(["migrate", "status"], { NODE_ENV: "production" }).shouldRun,
    false,
  );
  assert.equal(
    legacyDemoMigrationGuardDecision(["migrate", "deploy"], { NODE_ENV: "development" }).shouldRun,
    false,
  );
});

test("requires the exact one-time acknowledgement value", () => {
  const acknowledged = legacyDemoMigrationGuardDecision(["migrate", "deploy"], {
    NODE_ENV: "production",
    CITYCORE_LEGACY_DEMO_MIGRATIONS_ACK: LEGACY_DEMO_MIGRATION_ACKNOWLEDGEMENT,
  });
  const wrongValue = legacyDemoMigrationGuardDecision(["migrate", "deploy"], {
    NODE_ENV: "production",
    CITYCORE_LEGACY_DEMO_MIGRATIONS_ACK: "yes",
  });

  assert.equal(acknowledged.acknowledged, true);
  assert.equal(acknowledged.shouldRun, false);
  assert.equal(wrongValue.acknowledged, false);
  assert.equal(wrongValue.shouldRun, true);
});

test("guard SQL checks every shared migration and both legacy demo slugs", () => {
  for (const migrationName of LEGACY_DEMO_MIGRATION_NAMES) {
    assert.match(LEGACY_DEMO_MIGRATION_GUARD_SQL, new RegExp(migrationName));
  }

  assert.match(LEGACY_DEMO_MIGRATION_GUARD_SQL, /_prisma_migrations/u);
  assert.match(LEGACY_DEMO_MIGRATION_GUARD_SQL, /cagli/u);
  assert.match(LEGACY_DEMO_MIGRATION_GUARD_SQL, /mucho-gusto/u);
  assert.match(LEGACY_DEMO_MIGRATION_GUARD_SQL, /RAISE EXCEPTION/u);
});

test("demo seeds fail closed in production and require an explicit staging acknowledgement", () => {
  assert.doesNotThrow(() => assertDemoSeedAllowed("db:seed", { NODE_ENV: "development" }));
  assert.throws(
    () => assertDemoSeedAllowed("db:seed", { NODE_ENV: "production" }),
    /refuses to write demo data/u,
  );
  assert.doesNotThrow(() =>
    assertDemoSeedAllowed("db:seed", {
      NODE_ENV: "production",
      CITYCORE_DEMO_SEED_ACK: DEMO_SEED_ACKNOWLEDGEMENT,
    }),
  );
});

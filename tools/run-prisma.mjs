import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import {
  LEGACY_DEMO_MIGRATION_ACKNOWLEDGEMENT,
  LEGACY_DEMO_MIGRATION_GUARD_SQL,
  legacyDemoMigrationGuardDecision,
} from "./legacy-demo-migration-guard.mjs";

const prismaSchema = "packages/database/prisma/schema.prisma";
const localDatabaseUrl = "postgresql://postgres:postgres@localhost:5432/citycore?schema=public";
const command = process.execPath;
const prismaCliEntry = resolve(process.cwd(), "node_modules/prisma/build/index.js");
const requestedArgs = process.argv.slice(2);
const prismaArgs = [prismaCliEntry, ...requestedArgs, "--schema", prismaSchema];
const commandEnvironment = {
  ...process.env,
  DATABASE_URL: process.env.DATABASE_URL || localDatabaseUrl,
};
const guardDecision = legacyDemoMigrationGuardDecision(requestedArgs, commandEnvironment);

if (guardDecision.shouldRun) {
  process.stdout.write(
    "[run-prisma] Running production preflight for shared legacy demo-data migrations.\n",
  );

  const guardResult = spawnSync(
    command,
    [prismaCliEntry, "db", "execute", "--stdin", "--schema", prismaSchema],
    {
      cwd: process.cwd(),
      env: commandEnvironment,
      input: LEGACY_DEMO_MIGRATION_GUARD_SQL,
      shell: false,
      stdio: "pipe",
      encoding: "utf8",
    },
  );

  if (guardResult.error) {
    process.stderr.write(
      `[run-prisma] Legacy demo-data migration preflight could not start: ${guardResult.error.message}\n`,
    );
    process.exit(1);
  }

  if (guardResult.status !== 0) {
    if (guardResult.stdout) process.stderr.write(guardResult.stdout);
    if (guardResult.stderr) process.stderr.write(guardResult.stderr);
    process.stderr.write(
      [
        "",
        "[run-prisma] Production migration stopped before Prisma changed application data.",
        "[run-prisma] Review docs/LEGACY_DEMO_DATA_MIGRATIONS.md and audit the target database.",
        "[run-prisma] Do not bypass the guard until the cagli/mucho-gusto ownership decision is recorded.",
        "",
      ].join("\n"),
    );
    process.exit(1);
  }

  process.stdout.write("[run-prisma] Legacy demo-data migration preflight passed.\n");
} else if (guardDecision.acknowledged) {
  process.stderr.write(
    `[run-prisma] WARNING: production legacy demo-data guard explicitly acknowledged with ${LEGACY_DEMO_MIGRATION_ACKNOWLEDGEMENT}.\n`,
  );
}

const result = spawnSync(command, prismaArgs, {
  cwd: process.cwd(),
  env: commandEnvironment,
  shell: false,
  stdio: "pipe",
  encoding: "utf8",
});

if (result.error) {
  const isPermissionSpawnIssue = result.error.code === "EPERM" || result.error.code === "EINVAL";

  process.stderr.write(
    [
      `[run-prisma] Failed to launch Prisma CLI: ${result.error.message}`,
      isPermissionSpawnIssue
        ? "[run-prisma] In questo ambiente il blocco e sullo spawn del processo, non sullo schema Prisma."
        : "[run-prisma] Il fallimento avviene prima dell'esecuzione del comando Prisma.",
      "",
    ].join("\n"),
  );
  process.exit(1);
}

if (result.stdout) {
  process.stdout.write(result.stdout);
}

if (result.stderr) {
  process.stderr.write(result.stderr);
}

const combinedOutput = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
const prismaBinaryFetchFailed =
  combinedOutput.includes("binaries.prisma.sh") &&
  (combinedOutput.includes("ECONNREFUSED") ||
    combinedOutput.includes("ENOTFOUND") ||
    combinedOutput.includes("ETIMEDOUT"));

if (prismaBinaryFetchFailed) {
  process.stderr.write(
    [
      "",
      "[run-prisma] Prisma non riesce a scaricare i binary engine richiesti.",
      "[run-prisma] In questo ambiente il problema e di rete, non dello schema CityCore.",
      "[run-prisma] Riprova con rete disponibile oppure con i binary Prisma gia in cache locale.",
      "",
    ].join("\n"),
  );
}

process.exit(result.status ?? 1);

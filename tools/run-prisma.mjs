import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const prismaSchema = "packages/database/prisma/schema.prisma";
const localDatabaseUrl = "postgresql://postgres:postgres@localhost:5432/citycore?schema=public";
const command = process.execPath;
const prismaCliEntry = resolve(process.cwd(), "node_modules/prisma/build/index.js");
const prismaArgs = [prismaCliEntry, ...process.argv.slice(2), "--schema", prismaSchema];

const result = spawnSync(command, prismaArgs, {
  cwd: process.cwd(),
  env: {
    ...process.env,
    DATABASE_URL: process.env.DATABASE_URL || localDatabaseUrl,
  },
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

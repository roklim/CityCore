import { spawnSync } from "node:child_process";

const prismaSchema = "packages/database/prisma/schema.prisma";
const localDatabaseUrl = "postgresql://postgres:postgres@localhost:5432/platform_v2?schema=public";
const command = process.platform === "win32" ? "npx.cmd" : "npx";
const prismaArgs = ["prisma", ...process.argv.slice(2), "--schema", prismaSchema];

const result = spawnSync(command, prismaArgs, {
  cwd: process.cwd(),
  env: {
    ...process.env,
    DATABASE_URL: process.env.DATABASE_URL || localDatabaseUrl,
  },
  shell: process.platform === "win32",
  stdio: "inherit",
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);

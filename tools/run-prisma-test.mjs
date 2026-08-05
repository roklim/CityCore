import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const testUrl = process.env.DATABASE_URL_TEST;
const developmentUrl = process.env.DATABASE_URL;

if (!testUrl || !/test/i.test(testUrl) || testUrl === developmentUrl) {
  throw new Error(
    "DATABASE_URL_TEST must be set, distinct from DATABASE_URL, and identify a test database.",
  );
}

const result = spawnSync(
  process.execPath,
  [
    resolve("node_modules/prisma/build/index.js"),
    ...process.argv.slice(2),
    "--schema",
    "packages/database/prisma/schema.prisma",
  ],
  {
    stdio: "inherit",
    env: { ...process.env, NODE_ENV: "test", DATABASE_URL: testUrl },
  },
);

process.exit(result.status ?? 1);

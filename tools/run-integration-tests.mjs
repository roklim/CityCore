import { spawnSync } from "node:child_process";

const testUrl = process.env.DATABASE_URL_TEST;
const developmentUrl = process.env.DATABASE_URL;

if (!testUrl || !/test/i.test(testUrl) || testUrl === developmentUrl) {
  throw new Error(
    "Refusing integration tests: DATABASE_URL_TEST must be explicit, distinct, and contain 'test'.",
  );
}

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const result = spawnSync(npmCommand, ["--workspace", "@platform/api", "run", "test:integration"], {
  stdio: "inherit",
  env: { ...process.env, NODE_ENV: "test", DATABASE_URL: testUrl },
  shell: process.platform === "win32",
});

process.exit(result.status ?? 1);

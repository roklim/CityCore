import { existsSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";

const root = process.cwd();
const prismaSchema = "packages/database/prisma/schema.prisma";
const localDatabaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/citycore?schema=public";
const runtimePorts = {
  api: 4100,
  web: 3102,
};

const checks = [];

function log(message) {
  console.log(`[verify-platform] ${message}`);
}

function record(name, ok, details = "") {
  checks.push({ name, ok, details });
  const marker = ok ? "OK" : "FAIL";
  console.log(`[${marker}] ${name}${details ? ` - ${details}` : ""}`);
}

function commandName(command) {
  if (process.platform === "win32" && command === "npm") {
    return "npm.cmd";
  }

  if (process.platform === "win32" && command === "npx") {
    return "npx.cmd";
  }

  return command;
}

function run(command, args, options = {}) {
  const result = spawnSync(commandName(command), args, {
    cwd: root,
    env: {
      ...process.env,
      ...options.env,
    },
    encoding: "utf8",
    shell: process.platform === "win32",
    stdio: options.capture ? "pipe" : "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    throw new Error(output || `${command} ${args.join(" ")} exited with ${result.status}`);
  }

  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

async function runCheck(name, task) {
  log(name);

  try {
    const details = await task();
    record(name, true, details);
  } catch (error) {
    record(name, false, error instanceof Error ? error.message : "Unknown error");
  }
}

function assertFiles(paths) {
  const missing = paths.filter((path) => !existsSync(path));

  if (missing.length > 0) {
    throw new Error(`Missing files: ${missing.join(", ")}`);
  }

  return `${paths.length} files present`;
}

function verifyDockerCompose() {
  const { stdout } = run("docker", ["compose", "ps"], { capture: true });
  const hasPostgres = stdout.includes("citycore-postgres");
  const hasRedis = stdout.includes("citycore-redis");
  const healthyServices = (stdout.match(/\(healthy\)/g) ?? []).length;

  if (!hasPostgres || !hasRedis) {
    throw new Error("Postgres/Redis containers are not running. Run `npm run infra:up` first.");
  }

  if (healthyServices < 2) {
    throw new Error("Postgres and Redis must both be healthy before platform verification.");
  }

  return "Postgres and Redis are running and healthy";
}

function stopProcessTree(child) {
  if (!child || child.killed || child.exitCode !== null) {
    return;
  }

  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
      stdio: "ignore",
    });
    return;
  }

  child.kill("SIGTERM");
}

function startProcess(command, args, options = {}) {
  return spawn(commandName(command), args, {
    cwd: root,
    env: {
      ...process.env,
      ...options.env,
    },
    shell: process.platform === "win32",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

async function waitForHttp(url, timeoutMs = 15_000) {
  const startedAt = Date.now();
  let lastError = "not ready";

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      const body = await response.json();

      if (response.ok && body.status === "ok") {
        return body;
      }

      lastError = `${response.status} ${JSON.stringify(body)}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : "request failed";
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Health endpoint ${url} did not become ready: ${lastError}`);
}

async function verifyApiRuntime() {
  const child = startProcess("npm", ["--workspace", "@platform/api", "run", "start"], {
    env: {
      NODE_ENV: "development",
      PORT: String(runtimePorts.api),
      DATABASE_URL: localDatabaseUrl,
      REDIS_URL: process.env.REDIS_URL ?? "redis://localhost:6379",
      AUTH_SECRET: process.env.AUTH_SECRET ?? "development-auth-secret-change-before-staging",
    },
  });

  try {
    const health = await waitForHttp(`http://127.0.0.1:${runtimePorts.api}/health`);
    return `API health ok with DB ${health.dependencies.database.status} and Redis ${health.dependencies.redis.status}`;
  } finally {
    stopProcessTree(child);
  }
}

async function verifyWebRuntime() {
  const child = startProcess(
    "npm",
    ["--workspace", "@platform/web", "run", "start", "--", "--port", String(runtimePorts.web)],
    {
      env: {
        NEXT_PUBLIC_API_BASE_URL:
          process.env.NEXT_PUBLIC_API_BASE_URL ?? `http://127.0.0.1:${runtimePorts.api}`,
      },
    },
  );

  try {
    const health = await waitForHttp(`http://127.0.0.1:${runtimePorts.web}/api/health`);
    return `web health ok for ${health.service}`;
  } finally {
    stopProcessTree(child);
  }
}

await runCheck("F1-01 workspace install", () => {
  run("npm", ["ls", "--workspaces", "--depth=0"], { capture: true });
  return "npm workspaces resolved";
});

await runCheck("F1-02 root scripts", () =>
  assertFiles(["package.json", "apps/web/package.json", "apps/api/package.json"]),
);

await runCheck("F1-03 database package", () =>
  assertFiles([
    "packages/database/package.json",
    "packages/database/src/client.ts",
    "packages/database/src/index.ts",
    prismaSchema,
  ]),
);

await runCheck("F1-04 Prisma schema", () => {
  run("npm", ["run", "db:validate"], {
    env: {
      DATABASE_URL: localDatabaseUrl,
    },
  });
  run("npm", ["run", "db:migrate:status"], {
    env: {
      DATABASE_URL: localDatabaseUrl,
    },
  });
  run("npm", ["run", "db:generate"], {
    env: {
      DATABASE_URL: localDatabaseUrl,
    },
  });
  return "schema valid, migrations up to date, Prisma Client generated";
});

await runCheck("F1-05 Docker Compose", verifyDockerCompose);

await runCheck("F1-06 env templates", () =>
  assertFiles(["apps/web/.env.example", "apps/api/.env.example"]),
);

await runCheck("UI shell files", () =>
  assertFiles([
    "apps/web/src/app/layout.tsx",
    "apps/web/src/app/globals.css",
    "apps/web/src/components/app-shell.tsx",
    "packages/ui/src/index.ts",
  ]),
);

await runCheck("F1-09 shared packages", () =>
  assertFiles([
    "packages/shared/src/index.ts",
    "packages/permissions/src/index.ts",
    "packages/templates/src/index.ts",
    "packages/config/src/index.ts",
  ]),
);

await runCheck("F1-10 lint", () => {
  run("npm", ["run", "lint"]);
  return "lint passed";
});

await runCheck("F1-10 format", () => {
  run("npm", ["run", "format:check"]);
  return "format check passed";
});

await runCheck("typecheck", () => {
  run("npm", ["run", "typecheck"]);
  return "typecheck passed";
});

await runCheck("build web", () => {
  run("npm", ["run", "build:web"]);
  return "web build passed";
});

await runCheck("build api", () => {
  run("npm", ["run", "build:api"]);
  return "api build passed";
});

await runCheck("F1-07 API runtime health", verifyApiRuntime);
await runCheck("F1-07 web runtime health", verifyWebRuntime);

await runCheck("CI workflow", () => assertFiles([".github/workflows/platform-quality.yml"]));
await runCheck("README bootstrap", () => assertFiles(["README.md"]));
await runCheck("staging shape", () =>
  assertFiles([
    "docs/STAGING_RUNBOOK.md",
    "render.staging.yaml",
    ".github/workflows/staging-deploy.yml",
  ]),
);

const failed = checks.filter((check) => !check.ok);

if (failed.length > 0) {
  console.error(`\nPlatform verification failed: ${failed.length} check(s) failed.`);
  process.exit(1);
}

console.log("\nPlatform verification passed.");

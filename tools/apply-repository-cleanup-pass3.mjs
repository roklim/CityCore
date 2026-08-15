import fs from "node:fs";

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

// Root operational tools import these packages directly. Declare them here instead
// of relying on npm workspace hoisting from @platform/api.
{
  const file = "package.json";
  const pkg = readJson(file);
  pkg.dependencies = {
    ...(pkg.dependencies ?? {}),
    "@prisma/client": "^6.15.0",
    dotenv: "^17.2.3",
  };
  writeJson(file, pkg);
}

// The web workspace owns and runs its Vitest suite. Keep that dependency local
// instead of accidentally borrowing the API workspace's hoisted binary.
{
  const file = "apps/web/package.json";
  const pkg = readJson(file);
  pkg.devDependencies = {
    ...(pkg.devDependencies ?? {}),
    vitest: "^4.1.10",
  };
  writeJson(file, pkg);
}

console.log("Repository manifest integrity pass applied.");

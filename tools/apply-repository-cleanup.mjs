import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const write = (file, content) => fs.writeFileSync(file, content);
const json = (file) => JSON.parse(read(file));
const writeJson = (file, value) => write(file, `${JSON.stringify(value, null, 2)}\n`);
const replaceRequired = (file, from, to) => {
  const before = read(file);
  if (!before.includes(from)) throw new Error(`Expected text not found in ${file}: ${from}`);
  write(file, before.replace(from, to));
};

// Dead workspace: permission logic is duplicated by apps/api/src/auth.ts and has no consumer.
fs.rmSync("packages/permissions", { recursive: true, force: true });

// Redundant re-export workspace: move its two real consumers directly to @platform/domain.
replaceRequired("apps/web/src/lib/public-runtime.ts", 'from "@platform/shared";', 'from "@platform/domain";');
replaceRequired("apps/web/src/lib/public-marketplace.ts", 'from "@platform/shared";', 'from "@platform/domain";');
fs.rmSync("packages/shared", { recursive: true, force: true });

// Web now declares the package it actually imports.
{
  const pkg = json("apps/web/package.json");
  pkg.dependencies = pkg.dependencies ?? {};
  pkg.dependencies["@platform/domain"] = "file:../../packages/domain";
  writeJson("apps/web/package.json", pkg);
}

// Templates already imports @platform/domain directly; remove the stale @platform/shared manifest edge.
{
  const pkg = json("packages/templates/package.json");
  pkg.dependencies = { "@platform/domain": "file:../domain" };
  writeJson("packages/templates/package.json", pkg);
}

// Next only needs transpilation for packages that still exist and are imported by the web app.
replaceRequired(
  "apps/web/next.config.ts",
  '    "@platform/shared",\n    "@platform/templates",',
  '    "@platform/domain",\n    "@platform/templates",',
);

// @platform/database is retained as the Prisma/schema tooling workspace, but its duplicate runtime client has no consumers.
fs.rmSync("packages/database/src", { recursive: true, force: true });
fs.rmSync("packages/database/tsconfig.json", { force: true });
{
  const pkg = json("packages/database/package.json");
  delete pkg.exports;
  if (pkg.scripts) delete pkg.scripts.typecheck;
  writeJson("packages/database/package.json", pkg);
}

// The domain role scaffold only supported the dead permissions package.
replaceRequired("packages/domain/src/index.ts", 'export * from "./roles";\n', "");
fs.rmSync("packages/domain/src/roles.ts", { force: true });

// Static asset has no reference from TS/TSX, CSS, metadata, manifests, docs, or seeds.
fs.rmSync("apps/web/public/citycore-city-skyline.svg", { force: true });

// Tighten public surfaces where symbols are only implementation details.
replaceRequired("packages/ui/src/index.ts", "export const platformTheme =", "const platformTheme =");
replaceRequired("apps/api/src/auth.ts", "export type SessionAccess =", "type SessionAccess =");
replaceRequired("apps/api/src/auth.ts", "export function getRolePermissions(", "function getRolePermissions(");
replaceRequired("apps/api/src/auth.ts", "export function scopeMatches(", "function scopeMatches(");
replaceRequired("apps/api/src/auth.ts", "export async function authenticateRequest(", "async function authenticateRequest(");
replaceRequired("apps/api/src/platform-core/mvp-schemas.ts", "export const inquiryStatusSchema =", "const inquiryStatusSchema =");
replaceRequired("apps/api/src/platform-core/pickup-ordering.ts", "export type PickupOpeningDay =", "type PickupOpeningDay =");
replaceRequired("apps/api/src/platform-core/pickup-ordering.ts", "export type PickupSlot =", "type PickupSlot =");

// This helper has no caller, including tests and route code.
{
  const file = "apps/api/src/platform-core/pickup-ordering.ts";
  const before = read(file);
  const block = 'export function usesPickupSlotCapacity(status: PickupOrderStatus) {\n  return status !== "cancelled" && status !== "completed";\n}\n\n';
  if (!before.includes(block)) throw new Error(`Expected dead helper not found in ${file}`);
  write(file, before.replace(block, ""));
}

// Config arrays remain required to derive types/schemas in this module, but are not external API.
for (const name of [
  "accessRoles",
  "scopeTypes",
  "businessStatuses",
  "businessPlans",
  "subscriptionStatuses",
  "templateCategories",
  "userStatuses",
  "templateCodes",
]) {
  replaceRequired(
    "apps/api/src/platform-core/config.ts",
    `export const ${name} =`,
    `const ${name} =`,
  );
}

console.log("High-confidence repository cleanup applied.");

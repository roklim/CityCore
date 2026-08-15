import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const write = (file, content) => fs.writeFileSync(file, content);
const replaceRequired = (file, from, to) => {
  const before = read(file);
  if (!before.includes(from)) throw new Error(`Expected text not found in ${file}: ${from}`);
  write(file, before.replace(from, to));
};
const privateType = (file, name) => replaceRequired(file, `export type ${name} =`, `type ${name} =`);
const privateConst = (file, name) => replaceRequired(file, `export const ${name} =`, `const ${name} =`);
const privateFunction = (file, name) => replaceRequired(file, `export function ${name}(`, `function ${name}(`);

// Schema/tooling workspace: @prisma/client is already a runtime dependency of the API;
// the schema-only workspace itself does not import it.
{
  const file = "packages/database/package.json";
  const pkg = JSON.parse(read(file));
  delete pkg.dependencies?.["@prisma/client"];
  if (pkg.dependencies && Object.keys(pkg.dependencies).length === 0) delete pkg.dependencies;
  write(file, `${JSON.stringify(pkg, null, 2)}\n`);
}

// Internal implementation types/functions: stop exposing them as public module API.
for (const name of ["ScopeType", "UserStatus", "AuthContext"]) privateType("apps/api/src/auth.ts", name);
privateConst("apps/api/src/platform-core/config.ts", "cityStatuses");
for (const name of ["OpeningIntervalInput", "OpeningDayInput", "PublishableBusiness"])
  privateType("apps/api/src/platform-core/mvp-domain.ts", name);
privateFunction("apps/api/src/platform-core/mvp-domain.ts", "timeToMinutes");

privateConst("apps/web/src/lib/business-admin-navigation.ts", "businessAdminSections");
privateType("apps/web/src/lib/business-admin-navigation.ts", "BusinessAdminSegment");
privateType("apps/web/src/lib/admin-server.ts", "AdminResponseState");
privateType("apps/web/src/lib/business-admin-logic.ts", "OpeningIntervalDraft");
privateType("apps/web/src/lib/business-admin-server.ts", "BusinessAdminResponseState");

// These platform API types are internal response-shape plumbing, not imported by consumers.
for (const name of [
  "PlatformCity",
  "PlatformCityRegistryEntry",
  "PlatformAccessGrant",
  "PlatformAuditLog",
  "PlatformPaginatedResponse",
  "PlatformCityCategoryTree",
  "PlatformOpeningInterval",
  "PublicCitiesResponse",
  "PublicBusinessesResponse",
  "PublicBusinessService",
  "PublicOpeningInterval",
  "PlatformPickupOrder",
]) privateType("apps/web/src/lib/platform-api.ts", name);
privateType("apps/web/src/lib/public-runtime.ts", "PublicBusinessDetail");
privateFunction("apps/web/src/lib/public-form-validation.ts", "containsHtmlTag");

// Internal formatting helper; its public wrapper remains exported and tested.
privateFunction("apps/web/src/lib/business-opening-hours.ts", "formatOpeningDay");

// Truly dead helper: no caller in production or tests.
{
  const file = "apps/web/src/lib/business-opening-hours.ts";
  const before = read(file);
  const block = "export function getCurrentMinutesInTimezone(date: Date, timezone: string) {\n  return zonedParts(date, timezone)?.minutes ?? null;\n}\n\n";
  if (!before.includes(block)) throw new Error(`Dead timezone helper not found in ${file}`);
  write(file, before.replace(block, ""));
}

// Duplicate public pickup menu client: the active server page uses the public-runtime implementation.
{
  const file = "apps/web/src/lib/platform-api.ts";
  const before = read(file);
  const block = "export function getPublicPickupOrderMenu(citySlug: string, businessSlug: string) {\n  return fetchPlatformApi<PublicPickupOrderMenuResponse>(\n    `/api/v2/public/cities/${encodeURIComponent(citySlug)}/businesses/${encodeURIComponent(businessSlug)}/orders/menu`,\n  );\n}\n\n";
  if (!before.includes(block)) throw new Error(`Duplicate pickup menu client not found in ${file}`);
  write(file, before.replace(block, ""));
}

console.log("Repository cleanup fixpoint pass applied.");

import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { GLOBAL_DEMO_CITIES, GLOBAL_DEMO_SOURCE } from "./global-demo-cities.mjs";

loadEnv({ path: "apps/api/.env" });

const prisma = new PrismaClient();

function createData(spec) {
  return {
    name: spec.name,
    asciiName: spec.asciiName,
    slug: spec.slug,
    externalId: spec.externalId,
    alternateNames: spec.alternateNames ?? null,
    provinceCode: spec.provinceCode ?? null,
    provinceName: spec.provinceName ?? null,
    regionName: spec.regionName ?? spec.admin1Name ?? null,
    admin1Name: spec.admin1Name ?? null,
    admin2Name: spec.admin2Name ?? null,
    country: spec.country,
    countryName: spec.countryName,
    featureClass: spec.featureClass,
    featureCode: spec.featureCode,
    population: spec.population,
    timezone: spec.timezone,
    source: GLOBAL_DEMO_SOURCE,
    sourceVersion: "demo-v1",
    lat: spec.lat,
    lng: spec.lng,
    activeMunicipality: spec.activeMunicipality,
    searchText: spec.searchText,
  };
}

function updateData(spec, existing) {
  return {
    name: spec.name,
    asciiName: spec.asciiName,
    alternateNames: spec.alternateNames ?? existing.alternateNames,
    admin1Name: spec.admin1Name ?? existing.admin1Name,
    admin2Name: spec.admin2Name ?? existing.admin2Name,
    country: spec.country,
    countryName: spec.countryName,
    featureClass: spec.featureClass,
    featureCode: spec.featureCode,
    population: spec.population,
    timezone: spec.timezone,
    lat: spec.lat,
    lng: spec.lng,
    activeMunicipality: true,
    searchText: spec.searchText,
    ...(existing.source == null ? { source: GLOBAL_DEMO_SOURCE } : {}),
    ...(existing.source == null && existing.externalId == null
      ? { externalId: spec.externalId, sourceVersion: "demo-v1" }
      : {}),
    ...(existing.provinceCode == null && spec.provinceCode
      ? { provinceCode: spec.provinceCode }
      : {}),
    ...(existing.provinceName == null && spec.provinceName
      ? { provinceName: spec.provinceName }
      : {}),
    ...(existing.regionName == null && (spec.regionName ?? spec.admin1Name)
      ? { regionName: spec.regionName ?? spec.admin1Name }
      : {}),
  };
}

async function findExisting(spec) {
  return prisma.cityRegistry.findFirst({
    where: {
      OR: [
        { source: GLOBAL_DEMO_SOURCE, externalId: spec.externalId },
        { country: spec.country, name: spec.name },
        ...(spec.asciiName && spec.asciiName !== spec.name
          ? [{ country: spec.country, asciiName: spec.asciiName }]
          : []),
      ],
    },
    orderBy: { createdAt: "asc" },
  });
}

async function ensureRegistryCity(spec) {
  const existing = await findExisting(spec);
  if (existing) {
    const updated = await prisma.cityRegistry.update({
      where: { id: existing.id },
      data: updateData(spec, existing),
    });
    return { item: updated, created: false };
  }

  const created = await prisma.cityRegistry.create({ data: createData(spec) });
  return { item: created, created: true };
}

async function main() {
  const cityCountBefore = await prisma.city.count();
  let created = 0;
  let updated = 0;

  for (const spec of GLOBAL_DEMO_CITIES) {
    const result = await ensureRegistryCity(spec);
    if (result.created) created += 1;
    else updated += 1;
  }

  const cityCountAfter = await prisma.city.count();
  if (cityCountAfter !== cityCountBefore) {
    throw new Error("Global demo registry seed must not create or remove City records.");
  }

  console.log(
    `[db:seed:global-demo] ${GLOBAL_DEMO_CITIES.length} registry places ready (${created} created, ${updated} updated); City rows unchanged at ${cityCountAfter}.`,
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

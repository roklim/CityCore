import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";
import {
  GLOBAL_DEMO_CITIES,
  GLOBAL_DEMO_SOURCE,
  normalizeGlobalDemoSearch,
} from "./global-demo-cities.mjs";

loadEnv({ path: "apps/api/.env" });

const prisma = new PrismaClient();

const expectedTimezones = new Map([
  ["Cagli", "Europe/Rome"],
  ["New York", "America/New_York"],
  ["Tokyo", "Asia/Tokyo"],
  ["Sydney", "Australia/Sydney"],
]);

const searchCases = [
  ["new", "New York"],
  ["tok", "Tokyo"],
  ["sao", "São Paulo"],
  ["são", "São Paulo"],
  ["lon", "London"],
  ["cagli", "Cagli"],
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertValidTimezone(timezone, name) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone }).format(new Date());
  } catch {
    throw new Error(`Invalid IANA timezone for ${name}: ${timezone}`);
  }
}

async function findSeededRecord(spec) {
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

async function verifySearch(query, expectedName) {
  const normalized = normalizeGlobalDemoSearch([query]);
  const results = await prisma.cityRegistry.findMany({
    where: {
      activeMunicipality: true,
      OR: [
        { searchText: { startsWith: normalized } },
        { name: { startsWith: query, mode: "insensitive" } },
        { asciiName: { startsWith: query, mode: "insensitive" } },
      ],
    },
    orderBy: [{ population: "desc" }, { name: "asc" }],
    take: 20,
  });

  assert(
    results.some((item) => item.name === expectedName),
    `Search '${query}' did not return ${expectedName}.`,
  );
}

async function main() {
  assert(GLOBAL_DEMO_CITIES.length >= 20 && GLOBAL_DEMO_CITIES.length <= 30, "Demo dataset must contain 20-30 places.");

  const ids = new Set();
  for (const spec of GLOBAL_DEMO_CITIES) {
    assertValidTimezone(spec.timezone, spec.name);
    const record = await findSeededRecord(spec);
    assert(record, `Missing seeded registry record for ${spec.name}.`);
    ids.add(record.id);
    assert(record.country === spec.country, `Country mismatch for ${spec.name}.`);
    assert(record.timezone === spec.timezone, `Timezone mismatch for ${spec.name}.`);
    assert(record.featureClass === "P", `Feature class mismatch for ${spec.name}.`);
    assert(record.activeMunicipality, `${spec.name} must be active in the registry.`);
  }

  assert(ids.size === GLOBAL_DEMO_CITIES.length, "Demo dataset resolved to duplicate registry rows.");

  for (const [name, timezone] of expectedTimezones) {
    const spec = GLOBAL_DEMO_CITIES.find((item) => item.name === name);
    assert(spec?.timezone === timezone, `${name} must expose ${timezone} for business inheritance.`);
  }

  for (const [query, expectedName] of searchCases) {
    await verifySearch(query, expectedName);
  }

  const geonamesCount = await prisma.cityRegistry.count({ where: { source: "geonames" } });
  if (process.env.EXPECT_NO_GEONAMES_IMPORT === "true") {
    assert(geonamesCount === 0, `Expected no GeoNames bulk import, found ${geonamesCount} GeoNames rows.`);
  }

  console.log(
    `[verify:global-demo] ${GLOBAL_DEMO_CITIES.length} demo places verified; search, accents and IANA timezones valid; GeoNames rows=${geonamesCount}.`,
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

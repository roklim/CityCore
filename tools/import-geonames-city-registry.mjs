import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { basename, resolve } from "node:path";
import { createInterface } from "node:readline";
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";

loadEnv({ path: "apps/api/.env" });

const SOURCE = "geonames";
const DEFAULT_BATCH_SIZE = 500;
const MAX_BATCH_SIZE = 1_000;

function usage() {
  console.log(`
Import GeoNames cities into CityCore CityRegistry.

Usage:
  npm run db:import:geonames -- --file <cities500.txt> [options]

Required:
  --file <path>             Unzipped GeoNames cities file (for example cities500.txt)

Recommended enrichment files from the same GeoNames dump:
  --admin1 <path>           admin1CodesASCII.txt
  --admin2 <path>           admin2Codes.txt
  --country-info <path>     countryInfo.txt

Options:
  --source-version <value>  Source version/date stored on imported rows
  --batch-size <n>          Rows per SQL upsert batch (default ${DEFAULT_BATCH_SIZE}, max ${MAX_BATCH_SIZE})
  --limit <n>               Stop after n data rows (useful for local verification)
  --dry-run                 Parse and validate without writing to PostgreSQL
  --help                    Show this help

Example:
  npm run db:import:geonames -- \\
    --file .tmp/geonames/cities500.txt \\
    --admin1 .tmp/geonames/admin1CodesASCII.txt \\
    --admin2 .tmp/geonames/admin2Codes.txt \\
    --country-info .tmp/geonames/countryInfo.txt \\
    --source-version 2026-08-15

The importer is idempotent: rows are upserted by (source, external_id).
`);
}

function parseArgs(argv) {
  const options = {
    file: "",
    admin1: "",
    admin2: "",
    countryInfo: "",
    sourceVersion: "",
    batchSize: DEFAULT_BATCH_SIZE,
    limit: Number.POSITIVE_INFINITY,
    dryRun: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help") {
      usage();
      process.exit(0);
    }
    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${arg}`);
    }
    index += 1;

    if (arg === "--file") options.file = value;
    else if (arg === "--admin1") options.admin1 = value;
    else if (arg === "--admin2") options.admin2 = value;
    else if (arg === "--country-info") options.countryInfo = value;
    else if (arg === "--source-version") options.sourceVersion = value;
    else if (arg === "--batch-size") options.batchSize = Number(value);
    else if (arg === "--limit") options.limit = Number(value);
    else throw new Error(`Unknown option: ${arg}`);
  }

  if (!options.file) throw new Error("--file is required");
  if (!Number.isInteger(options.batchSize) || options.batchSize < 1 || options.batchSize > MAX_BATCH_SIZE) {
    throw new Error(`--batch-size must be an integer between 1 and ${MAX_BATCH_SIZE}`);
  }
  if (options.limit !== Number.POSITIVE_INFINITY && (!Number.isInteger(options.limit) || options.limit < 1)) {
    throw new Error("--limit must be a positive integer");
  }

  return options;
}

function stripDiacritics(value) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
}

function slugify(value) {
  return stripDiacritics(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function normalizeSearch(values) {
  return stripDiacritics(values.filter(Boolean).join(" "))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 8_000);
}

function compactAlternateNames(value) {
  if (!value) return null;
  const names = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 100);
  return names.length ? names.join(",") : null;
}

async function loadTabMap(path, mapper) {
  const map = new Map();
  if (!path) return map;

  const input = createInterface({ input: createReadStream(resolve(path), { encoding: "utf8" }), crlfDelay: Infinity });
  for await (const rawLine of input) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const mapped = mapper(line.split("\t"));
    if (mapped) map.set(mapped.key, mapped.value);
  }
  return map;
}

async function loadAdmin1(path) {
  return loadTabMap(path, (columns) => {
    const [code, name, asciiName] = columns;
    if (!code || !name) return null;
    return { key: code, value: { name, asciiName: asciiName || name } };
  });
}

async function loadAdmin2(path) {
  return loadTabMap(path, (columns) => {
    const [code, name, asciiName] = columns;
    if (!code || !name) return null;
    return { key: code, value: { name, asciiName: asciiName || name } };
  });
}

async function loadCountries(path) {
  return loadTabMap(path, (columns) => {
    const [iso, , , , name] = columns;
    if (!iso || !name) return null;
    return { key: iso, value: name };
  });
}

function parseGeoNamesRow(line, enrichments, sourceVersion) {
  const columns = line.split("\t");
  if (columns.length < 19) return null;

  const [
    geonameId,
    name,
    asciiName,
    alternateNamesRaw,
    latitude,
    longitude,
    featureClass,
    featureCode,
    country,
    ,
    admin1Code,
    admin2Code,
    admin3Code,
    admin4Code,
    populationRaw,
    ,
    ,
    timezone,
    modificationDate,
  ] = columns;

  if (!geonameId || !name || !country || featureClass !== "P") return null;

  const region = enrichments.admin1.get(`${country}.${admin1Code}`) ?? null;
  const provinceKey = [country, admin1Code, admin2Code].filter(Boolean).join(".");
  const province = enrichments.admin2.get(provinceKey) ?? null;
  const alternateNames = compactAlternateNames(alternateNamesRaw);
  const populationNumber = Number(populationRaw);
  const population = Number.isSafeInteger(populationNumber) && populationNumber >= 0 ? populationNumber : null;
  const lat = Number(latitude);
  const lng = Number(longitude);
  const countryName = enrichments.countries.get(country) ?? null;
  const sourceModifiedAt = /^\d{4}-\d{2}-\d{2}$/.test(modificationDate)
    ? new Date(`${modificationDate}T00:00:00.000Z`)
    : null;

  return {
    id: randomUUID(),
    name,
    asciiName: asciiName || null,
    slug: slugify(asciiName || name) || `place-${geonameId}`,
    externalId: geonameId,
    alternateNames,
    provinceCode: admin2Code || null,
    provinceName: province?.name ?? null,
    regionCode: admin1Code || null,
    regionName: region?.name ?? null,
    admin1Code: admin1Code || null,
    admin1Name: region?.name ?? null,
    admin2Code: admin2Code || null,
    admin2Name: province?.name ?? null,
    admin3Code: admin3Code || null,
    admin4Code: admin4Code || null,
    country,
    countryName,
    featureClass,
    featureCode: featureCode || null,
    population,
    timezone: timezone || null,
    source: SOURCE,
    sourceVersion: sourceVersion || null,
    sourceModifiedAt,
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
    searchText: normalizeSearch([
      name,
      asciiName,
      alternateNames?.replaceAll(",", " "),
      province?.name,
      region?.name,
      countryName,
      country,
    ]),
  };
}

const columns = [
  "id",
  "name",
  "ascii_name",
  "slug",
  "external_id",
  "alternate_names",
  "province_code",
  "province_name",
  "region_code",
  "region_name",
  "admin1_code",
  "admin1_name",
  "admin2_code",
  "admin2_name",
  "admin3_code",
  "admin4_code",
  "country",
  "country_name",
  "feature_class",
  "feature_code",
  "population",
  "timezone",
  "source",
  "source_version",
  "source_modified_at",
  "lat",
  "lng",
  "active_municipality",
  "search_text",
];

function rowValues(row) {
  return [
    row.id,
    row.name,
    row.asciiName,
    row.slug,
    row.externalId,
    row.alternateNames,
    row.provinceCode,
    row.provinceName,
    row.regionCode,
    row.regionName,
    row.admin1Code,
    row.admin1Name,
    row.admin2Code,
    row.admin2Name,
    row.admin3Code,
    row.admin4Code,
    row.country,
    row.countryName,
    row.featureClass,
    row.featureCode,
    row.population,
    row.timezone,
    row.source,
    row.sourceVersion,
    row.sourceModifiedAt,
    row.lat,
    row.lng,
    true,
    row.searchText,
  ];
}

async function upsertBatch(prisma, rows) {
  if (!rows.length) return;

  const values = [];
  const tuples = rows.map((row) => {
    const rowData = rowValues(row);
    const placeholders = rowData.map((value) => {
      values.push(value);
      return `$${values.length}`;
    });
    return `(${placeholders.join(", ")}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`;
  });

  const insertColumns = [...columns, "created_at", "updated_at"];
  const updates = columns
    .filter((column) => !["id", "source", "external_id"].includes(column))
    .map((column) => `"${column}" = EXCLUDED."${column}"`)
    .concat('"updated_at" = CURRENT_TIMESTAMP')
    .join(",\n    ");

  const sql = `
    INSERT INTO "city_registry" (${insertColumns.map((column) => `"${column}"`).join(", ")})
    VALUES ${tuples.join(",\n")}
    ON CONFLICT ("source", "external_id") DO UPDATE SET
    ${updates}
  `;

  await prisma.$executeRawUnsafe(sql, ...values);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const resolvedFile = resolve(options.file);
  const sourceVersion = options.sourceVersion || basename(options.file).replace(/\.[^.]+$/, "");

  console.log(`GeoNames source: ${resolvedFile}`);
  console.log(`Source version: ${sourceVersion}`);
  console.log(`Mode: ${options.dryRun ? "dry-run" : "database upsert"}`);

  const [admin1, admin2, countries] = await Promise.all([
    loadAdmin1(options.admin1),
    loadAdmin2(options.admin2),
    loadCountries(options.countryInfo),
  ]);
  const enrichments = { admin1, admin2, countries };
  console.log(`Loaded enrichment maps: admin1=${admin1.size}, admin2=${admin2.size}, countries=${countries.size}`);

  const prisma = options.dryRun ? null : new PrismaClient();
  let parsed = 0;
  let skipped = 0;
  let written = 0;
  let batch = [];
  const startedAt = Date.now();

  try {
    const input = createInterface({
      input: createReadStream(resolvedFile, { encoding: "utf8" }),
      crlfDelay: Infinity,
    });

    for await (const rawLine of input) {
      if (parsed + skipped >= options.limit) break;
      if (!rawLine.trim()) continue;

      const row = parseGeoNamesRow(rawLine, enrichments, sourceVersion);
      if (!row) {
        skipped += 1;
        continue;
      }

      parsed += 1;
      batch.push(row);

      if (batch.length >= options.batchSize) {
        if (prisma) await upsertBatch(prisma, batch);
        written += batch.length;
        batch = [];
        if (written % 10_000 === 0) console.log(`Processed ${written.toLocaleString("en-US")} places...`);
      }
    }

    if (batch.length) {
      if (prisma) await upsertBatch(prisma, batch);
      written += batch.length;
    }
  } finally {
    if (prisma) await prisma.$disconnect();
  }

  const seconds = ((Date.now() - startedAt) / 1_000).toFixed(1);
  console.log(`Completed in ${seconds}s: parsed=${parsed}, written=${written}, skipped=${skipped}`);
  if (options.dryRun) console.log("Dry-run completed: no database rows were changed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

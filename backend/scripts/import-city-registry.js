"use strict";

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const { CityRegistry, connect, ensureRegistrySeed } = require("../db");

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function pick(row, keys) {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim();
    }
  }
  return "";
}

function registrySearchText(city) {
  return [
    city.name,
    city.slug,
    city.provinceCode,
    city.provinceName,
    city.regionName,
    city.istatCode,
    city.cadastralCode,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function splitCsvLine(line, separator) {
  const cells = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === separator && !quoted) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function parseCsv(content) {
  const lines = content
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim());
  if (lines.length < 2) return [];

  const separator = lines[0].includes(";") ? ";" : ",";
  const headers = splitCsvLine(lines[0], separator).map((header) =>
    slugify(header).replace(/-/g, "_"),
  );

  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line, separator);
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] || ""]));
  });
}

function normalizeRow(row, source) {
  const name = pick(row, [
    "denominazione_in_italiano",
    "denominazione_comune",
    "denominazione",
    "comune",
    "nome",
    "name",
  ]);
  const provinceCode = pick(row, [
    "sigla_automobilistica",
    "sigla_provincia",
    "provincia_sigla",
    "provincia",
    "province_code",
  ]).toUpperCase();
  const provinceName = pick(row, [
    "denominazione_uts",
    "denominazione_provincia",
    "provincia_nome",
    "province_name",
  ]);
  const regionName = pick(row, [
    "denominazione_regione",
    "regione",
    "region_name",
  ]);
  const regionCode = pick(row, [
    "codice_regione",
    "codice_regione_numerico",
    "region_code",
  ]);
  const istatCode = pick(row, [
    "codice_comune_formato_alfanumerico",
    "codice_comune_alfanumerico",
    "codice_istat",
    "istat",
    "istat_code",
  ]);
  const cadastralCode = pick(row, [
    "codice_catastale_del_comune",
    "codice_catastale",
    "catastale",
    "cadastral_code",
  ]).toUpperCase();
  const slug = slugify(pick(row, ["slug"]) || name);

  if (!name || !slug) return null;

  const city = {
    name,
    slug,
    provinceCode,
    provinceName,
    regionCode,
    regionName,
    country: pick(row, ["country", "stato"]) || "IT",
    istatCode,
    cadastralCode,
    activeMunicipality: !/soppresso|cessato|false|0/i.test(
      pick(row, ["soppresso", "cessato", "active_municipality"]),
    ),
    source,
    sourceVersion: process.env.CITY_REGISTRY_SOURCE_VERSION || "",
    lat: Number(pick(row, ["lat", "latitude"])) || undefined,
    lng: Number(pick(row, ["lng", "lon", "longitude"])) || undefined,
    lastSyncedAt: new Date(),
  };

  city.searchText = registrySearchText(city);
  return city;
}

async function upsertCities(cities) {
  let insertedOrUpdated = 0;
  for (const city of cities) {
    const filter = city.istatCode
      ? { istatCode: city.istatCode }
      : { slug: city.slug, provinceCode: city.provinceCode };
    await CityRegistry.findOneAndUpdate(
      filter,
      { $set: city },
      { upsert: true, setDefaultsOnInsert: true },
    );
    insertedOrUpdated += 1;
  }
  return insertedOrUpdated;
}

async function main() {
  const inputPath = process.argv[2] || process.env.CITY_REGISTRY_FILE || "";
  await connect();
  await ensureRegistrySeed();

  if (!inputPath) {
    console.log("[city-registry] Seed base verificato. Nessun file importato.");
    return;
  }

  const absolutePath = path.resolve(inputPath);
  const content = fs.readFileSync(absolutePath, "utf8");
  const extension = path.extname(absolutePath).toLowerCase();
  const source = extension === ".json" ? "json_import" : "csv_import";
  const rows = extension === ".json" ? JSON.parse(content) : parseCsv(content);
  const normalized = rows.map((row) => normalizeRow(row, source)).filter(Boolean);
  const total = await upsertCities(normalized);
  console.log(`[city-registry] Import completato: ${total} comuni aggiornati.`);
}

main()
  .catch((error) => {
    console.error("[city-registry] Errore:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
  });

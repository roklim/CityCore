import { execFileSync } from "node:child_process";
import os from "node:os";
import { performance } from "node:perf_hooks";
import {
  createPublicBusinessSearchIndex,
  filterPublicBusinessesBySection,
  searchPublicBusinesses,
} from "../apps/web/src/lib/public-search.ts";

const sizes = [100, 1_000, 5_000, 10_000, 25_000];
const categorySpecs = [
  { code: "commerce", slug: "attivita", name: "Attività locali" },
  { code: "service", slug: "servizi", name: "Servizi" },
  { code: "hospitality", slug: "ospitalita", name: "Ospitalità" },
  { code: "editorial", slug: "eventi", name: "Eventi e annunci" },
];
let resultSink = 0;

function buildDataset(size) {
  return Array.from({ length: size }, (_, index) => {
    const paddedIndex = String(index).padStart(6, "0");
    const category = categorySpecs[index % categorySpecs.length];

    return {
      name: `Attività ${paddedIndex}`,
      summary: `Servizio locale dimostrativo numero ${paddedIndex}`,
      category: category.code,
      categoryLabel: category.name,
      categories: [{ id: `category-${category.slug}`, name: category.name, slug: category.slug }],
      area: `Zona ${index % 20}`,
      searchTerms: [
        "Servizio locale",
        `Speciale ${paddedIndex}`,
        index % 5 === 0 ? "Margherita artigianale" : "Consulenza su appuntamento",
      ],
    };
  });
}

function scenariosFor(size) {
  return [
    {
      name: "rara",
      query: `speciale ${String(size - 1).padStart(6, "0")}`,
      sectionId: "all",
    },
    { name: "comune", query: "servizio locale", sectionId: "all" },
    { name: "assente", query: "termine totalmente inesistente", sectionId: "all" },
    { name: "corta", query: "se", sectionId: "all" },
    { name: "testo+categoria", query: "servizio locale", sectionId: "servizi" },
    { name: "solo categoria", query: "", sectionId: "servizi" },
  ];
}

function iterationCount(size) {
  if (size <= 1_000) return 100;
  if (size <= 5_000) return 60;
  if (size <= 10_000) return 40;
  return 30;
}

function percentile(sortedSamples, percentileValue) {
  const sampleIndex = Math.max(
    0,
    Math.min(sortedSamples.length - 1, Math.ceil(sortedSamples.length * percentileValue) - 1),
  );
  return sortedSamples[sampleIndex] ?? 0;
}

function summarize(samples) {
  const sortedSamples = [...samples].sort((left, right) => left - right);
  return {
    mean: samples.reduce((total, sample) => total + sample, 0) / samples.length,
    p50: percentile(sortedSamples, 0.5),
    p95: percentile(sortedSamples, 0.95),
    max: sortedSamples.at(-1) ?? 0,
  };
}

function measure(action, iterations, warmups = 5) {
  for (let iteration = 0; iteration < warmups; iteration += 1) {
    const result = action();
    resultSink ^= result.length;
  }

  const samples = [];
  let resultCount = 0;
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const startedAt = performance.now();
    const result = action();
    samples.push(performance.now() - startedAt);
    resultCount = result.length;
    resultSink ^= resultCount + (result[0]?.name.length ?? 0);
  }

  return { ...summarize(samples), resultCount };
}

function sameResults(left, right) {
  return (
    left.length === right.length &&
    left.every((business, index) => business.name === right[index]?.name)
  );
}

function formatNumber(value, fractionDigits = 3) {
  return value.toFixed(fractionDigits);
}

function currentRevision() {
  try {
    const commit = execFileSync("git", ["rev-parse", "--short", "HEAD"], {
      encoding: "utf8",
    }).trim();
    const dirty = execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim();
    return dirty ? `${commit} + working tree modificata` : commit;
  } catch {
    return "non disponibile";
  }
}

const cpu = os.cpus()[0];
console.log("# Benchmark comparativo della ricerca pubblica");
console.log("");
console.log(`- Data UTC: ${new Date().toISOString()}`);
console.log(`- Revisione: \`${currentRevision()}\``);
console.log(`- Runtime: Node.js \`${process.version}\`, ${process.platform} ${process.arch}`);
console.log(`- CPU: ${cpu?.model ?? "non disponibile"}, ${os.cpus().length} processori logici`);
console.log(`- Memoria: ${(os.totalmem() / 1024 ** 3).toFixed(1)} GiB`);
console.log("- Warm-up per scenario: 5 esecuzioni");
console.log("- Build dell'indice: 3 ripetizioni con garbage collection tra le prove");
console.log("");

for (const size of sizes) {
  const businesses = buildDataset(size);
  const buildSamples = [];
  let searchIndex;

  for (let repetition = 0; repetition < 3; repetition += 1) {
    searchIndex = undefined;
    globalThis.gc?.();
    const startedAt = performance.now();
    searchIndex = createPublicBusinessSearchIndex(businesses);
    buildSamples.push(performance.now() - startedAt);
  }

  if (!searchIndex) throw new Error("Indice di ricerca non costruito");

  const build = summarize(buildSamples);
  const iterations = iterationCount(size);
  console.log(`## ${size.toLocaleString("it-IT")} elementi`);
  console.log("");
  console.log(
    `Build indice: p50 ${formatNumber(build.p50)} ms; max ${formatNumber(build.max)} ms; ` +
      `${searchIndex.stats.trigramCount.toLocaleString("it-IT")} trigrammi; ` +
      `${searchIndex.stats.postingCount.toLocaleString("it-IT")} posting.`,
  );
  console.log("");
  console.log(
    "| Scenario | Risultati | Scan p50 (ms) | Scan p95 (ms) | Indice p50 (ms) | Indice p95 (ms) | Speed-up p95 |",
  );
  console.log("| --- | ---: | ---: | ---: | ---: | ---: | ---: |");

  for (const scenario of scenariosFor(size)) {
    const baselineAction = () =>
      filterPublicBusinessesBySection(businesses, scenario.query, scenario.sectionId);
    const indexedAction = () =>
      searchPublicBusinesses(searchIndex, scenario.query, scenario.sectionId);
    const baselineReference = baselineAction();
    const indexedReference = indexedAction();

    if (!sameResults(baselineReference, indexedReference)) {
      throw new Error(`Risultati diversi nello scenario ${scenario.name} con ${size} elementi`);
    }

    const baseline = measure(baselineAction, iterations);
    const indexed = measure(indexedAction, iterations);
    const speedup = indexed.p95 > 0 ? baseline.p95 / indexed.p95 : Number.POSITIVE_INFINITY;

    console.log(
      `| ${scenario.name} | ${baseline.resultCount.toLocaleString("it-IT")} | ` +
        `${formatNumber(baseline.p50)} | ${formatNumber(baseline.p95)} | ` +
        `${formatNumber(indexed.p50)} | ${formatNumber(indexed.p95)} | ` +
        `${Number.isFinite(speedup) ? `${formatNumber(speedup, 2)}×` : "∞"} |`,
    );
  }

  console.log("");
  globalThis.gc?.();
}

if (resultSink === Number.MIN_SAFE_INTEGER) console.log(resultSink);

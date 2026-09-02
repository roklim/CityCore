import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import {
  createPublicBusinessNormalizedCorpus,
  createPublicBusinessSearchIndexFromCorpus,
  filterPublicBusinessesBySection,
  searchPreNormalizedPublicBusinesses,
  searchPublicBusinesses,
} from "../apps/web/src/lib/public-search.ts";

const defaultSizes = [100, 1_000, 2_400, 5_000, 10_000, 25_000];
const sizes = readSizes("BENCHMARK_SIZES", defaultSizes);
const campaignCount = readPositiveInteger("BENCHMARK_CAMPAIGNS", 7);
const buildRepetitions = readPositiveInteger("BENCHMARK_BUILD_REPETITIONS", 3);
const skipBreakEven = process.env.BENCHMARK_SKIP_BREAK_EVEN === "1";
const jsonOutputPath = process.env.BENCHMARK_JSON_PATH;
const markdownOutputPath = process.env.BENCHMARK_MARKDOWN_PATH;
const categorySpecs = [
  { code: "commerce", slug: "attivita", name: "Attività locali" },
  { code: "service", slug: "servizi", name: "Servizi" },
  { code: "hospitality", slug: "ospitalita", name: "Ospitalità" },
  { code: "editorial", slug: "eventi", name: "Eventi e annunci" },
];
const memoryFields = ["rss", "heapTotal", "heapUsed", "external", "arrayBuffers"];
const strategyOrders = [
  ["a", "b", "c"],
  ["b", "c", "a"],
  ["c", "a", "b"],
  ["c", "b", "a"],
  ["b", "a", "c"],
  ["a", "c", "b"],
];
const breakEvenQueryCounts = [1, 2, 5, 10, 20, 50];
const breakEvenScenarioNames = new Set(["rara", "comune", "solo categoria"]);
let resultSink = 0;

function readPositiveInteger(name, fallback) {
  const parsed = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function readSizes(name, fallback) {
  const configured = (process.env[name] ?? "")
    .split(",")
    .map((value) => Number.parseInt(value.trim(), 10))
    .filter((value) => Number.isInteger(value) && value > 0);
  return configured.length > 0 ? [...new Set(configured)] : fallback;
}

function deterministicLexeme(index) {
  let state = (Math.imul(index + 1, 2_654_435_761) ^ 0x9e3779b9) >>> 0;
  let token = "";

  for (let position = 0; position < 8; position += 1) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    token += String.fromCharCode(97 + ((state >>> 0) % 26));
  }

  return token;
}

function buildDataset(size, profile = "repetitive") {
  return Array.from({ length: size }, (_, index) => {
    const paddedIndex = String(index).padStart(6, "0");
    const category = categorySpecs[index % categorySpecs.length];
    const variedTerms = profile === "varied" ? [`Collezione ${deterministicLexeme(index)}`] : [];

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
        ...variedTerms,
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

function summarizeCampaigns(samples) {
  const sortedSamples = [...samples].sort((left, right) => left - right);
  return {
    median: percentile(sortedSamples, 0.5),
    q1: percentile(sortedSamples, 0.25),
    q3: percentile(sortedSamples, 0.75),
    min: sortedSamples[0] ?? 0,
    max: sortedSamples.at(-1) ?? 0,
  };
}

function measure(action, iterations, warmups = 5) {
  for (let iteration = 0; iteration < warmups; iteration += 1) {
    consumeResult(action());
  }

  const samples = [];
  let resultCount = 0;
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const startedAt = performance.now();
    const result = action();
    samples.push(performance.now() - startedAt);
    resultCount = result.length;
    consumeResult(result);
  }

  return { ...summarize(samples), resultCount };
}

function consumeResult(result) {
  resultSink ^= result.length + (result[0]?.name.length ?? 0);
}

function sameResults(left, right) {
  return (
    left.length === right.length &&
    left.every((business, index) => business.name === right[index]?.name)
  );
}

function verifySameResults(results, scenario, size, profile) {
  if (!sameResults(results.a, results.b) || !sameResults(results.a, results.c)) {
    throw new Error(
      `Risultati A/B/C diversi: ${profile}, scenario ${scenario.name}, ${size} elementi`,
    );
  }
}

function snapshotMemory() {
  const snapshot = process.memoryUsage();
  return Object.fromEntries(memoryFields.map((field) => [field, snapshot[field]]));
}

function memoryDelta(before, after) {
  return Object.fromEntries(memoryFields.map((field) => [field, after[field] - before[field]]));
}

function buildStructuresWithMeasurements(businesses) {
  const normalizedBuildSamples = [];
  const indexIncrementalBuildSamples = [];
  const indexFullBuildSamples = [];
  let corpus;
  let searchIndex;

  for (let repetition = 0; repetition < buildRepetitions; repetition += 1) {
    globalThis.gc();

    const normalizedStartedAt = performance.now();
    const iterationCorpus = createPublicBusinessNormalizedCorpus(businesses);
    const normalizedElapsed = performance.now() - normalizedStartedAt;

    const indexStartedAt = performance.now();
    const iterationSearchIndex = createPublicBusinessSearchIndexFromCorpus(iterationCorpus);
    const indexElapsed = performance.now() - indexStartedAt;

    normalizedBuildSamples.push(normalizedElapsed);
    indexIncrementalBuildSamples.push(indexElapsed);
    indexFullBuildSamples.push(normalizedElapsed + indexElapsed);

    if (repetition === buildRepetitions - 1) {
      corpus = iterationCorpus;
      searchIndex = iterationSearchIndex;
    }
  }

  if (!corpus || !searchIndex) throw new Error("Strutture di ricerca assenti dopo il build");

  return {
    corpus,
    searchIndex,
    build: {
      normalized: summarize(normalizedBuildSamples),
      indexIncremental: summarize(indexIncrementalBuildSamples),
      indexFull: summarize(indexFullBuildSamples),
    },
  };
}

function runMemoryWorker(profile, size) {
  const warmupDataset = buildDataset(20, profile);
  const warmupCorpus = createPublicBusinessNormalizedCorpus(warmupDataset);
  createPublicBusinessSearchIndexFromCorpus(warmupCorpus);
  globalThis.gc();

  const businesses = buildDataset(size, profile);
  globalThis.gc();
  const datasetOnly = snapshotMemory();

  const corpus = createPublicBusinessNormalizedCorpus(businesses);
  globalThis.gc();
  const withNormalizedCorpus = snapshotMemory();

  const searchIndex = createPublicBusinessSearchIndexFromCorpus(corpus);
  globalThis.gc();
  const withFullIndex = snapshotMemory();
  resultSink ^= searchIndex.stats.postingCount;

  return {
    datasetOnly,
    withNormalizedCorpus,
    withFullIndex,
    deltaNormalized: memoryDelta(datasetOnly, withNormalizedCorpus),
    deltaFullIndex: memoryDelta(datasetOnly, withFullIndex),
    deltaIndexIncremental: memoryDelta(withNormalizedCorpus, withFullIndex),
  };
}

function measureMemoryInFreshProcess(profile, size) {
  const output = execFileSync(
    process.execPath,
    [
      "--expose-gc",
      "--import",
      "tsx",
      fileURLToPath(import.meta.url),
      "--memory-worker",
      profile,
      String(size),
    ],
    { encoding: "utf8", maxBuffer: 1024 * 1024 },
  );
  return JSON.parse(output);
}

function strategyActions(businesses, corpus, searchIndex, scenario) {
  return {
    a: () => filterPublicBusinessesBySection(businesses, scenario.query, scenario.sectionId),
    b: () => searchPreNormalizedPublicBusinesses(corpus, scenario.query, scenario.sectionId),
    c: () => searchPublicBusinesses(searchIndex, scenario.query, scenario.sectionId),
  };
}

function measureQueries(businesses, corpus, searchIndex, size, campaignIndex, profile) {
  const iterations = iterationCount(size);
  const order = strategyOrders[campaignIndex % strategyOrders.length];

  return scenariosFor(size).map((scenario) => {
    const actions = strategyActions(businesses, corpus, searchIndex, scenario);
    const references = {
      a: actions.a(),
      b: actions.b(),
      c: actions.c(),
    };
    verifySameResults(references, scenario, size, profile);

    const measured = {};
    for (const strategy of order) measured[strategy] = measure(actions[strategy], iterations);

    return {
      name: scenario.name,
      resultCount: measured.a.resultCount,
      order,
      a: measured.a,
      b: measured.b,
      c: measured.c,
      speedupAtoB: measured.b.p50 > 0 ? measured.a.p50 / measured.b.p50 : Infinity,
      speedupBtoC: measured.c.p50 > 0 ? measured.b.p50 / measured.c.p50 : Infinity,
      speedupAtoC: measured.c.p50 > 0 ? measured.a.p50 / measured.c.p50 : Infinity,
    };
  });
}

function verifyVariedDataset(businesses, corpus, searchIndex, size) {
  for (const scenario of scenariosFor(size)) {
    const actions = strategyActions(businesses, corpus, searchIndex, scenario);
    verifySameResults({ a: actions.a(), b: actions.b(), c: actions.c() }, scenario, size, "varied");
  }
}

function measureSequence(strategy, businesses, scenario, queryCount) {
  globalThis.gc();
  const startedAt = performance.now();
  let result = [];

  if (strategy === "a") {
    for (let queryIndex = 0; queryIndex < queryCount; queryIndex += 1) {
      result = filterPublicBusinessesBySection(businesses, scenario.query, scenario.sectionId);
    }
  } else {
    const corpus = createPublicBusinessNormalizedCorpus(businesses);
    if (strategy === "b") {
      for (let queryIndex = 0; queryIndex < queryCount; queryIndex += 1) {
        result = searchPreNormalizedPublicBusinesses(corpus, scenario.query, scenario.sectionId);
      }
    } else {
      const searchIndex = createPublicBusinessSearchIndexFromCorpus(corpus);
      for (let queryIndex = 0; queryIndex < queryCount; queryIndex += 1) {
        result = searchPublicBusinesses(searchIndex, scenario.query, scenario.sectionId);
      }
    }
  }

  const elapsedMs = performance.now() - startedAt;
  consumeResult(result);
  return elapsedMs;
}

function measureBreakEven(businesses, size, campaignIndex) {
  if (skipBreakEven || size !== Math.max(...sizes)) return [];
  const order = strategyOrders[campaignIndex % strategyOrders.length];

  return scenariosFor(size)
    .filter((scenario) => breakEvenScenarioNames.has(scenario.name))
    .map((scenario) => ({
      name: scenario.name,
      totals: breakEvenQueryCounts.map((queryCount) => {
        const times = {};
        for (const strategy of order) {
          times[strategy] = measureSequence(strategy, businesses, scenario, queryCount);
        }
        return { queryCount, ...times };
      }),
    }));
}

function runDatasetCampaign(profile, campaignIndex, size) {
  const businesses = buildDataset(size, profile);
  const { corpus, searchIndex, build } = buildStructuresWithMeasurements(businesses);
  const memory = measureMemoryInFreshProcess(profile, size);
  const stats = { ...searchIndex.stats };
  let queries = [];
  let breakEven = [];

  if (profile === "repetitive") {
    queries = measureQueries(businesses, corpus, searchIndex, size, campaignIndex, profile);
    breakEven = measureBreakEven(businesses, size, campaignIndex);
  } else {
    verifyVariedDataset(businesses, corpus, searchIndex, size);
  }

  resultSink ^= stats.postingCount + stats.trigramCount;
  return { build, memory, stats, queries, breakEven };
}

function aggregateQueries(runs, size) {
  return scenariosFor(size).map((scenario, scenarioIndex) => {
    const queryRuns = runs.map((run) => run.queries[scenarioIndex]);
    return {
      name: scenario.name,
      resultCount: queryRuns[0]?.resultCount ?? 0,
      aP50Ms: summarizeCampaigns(queryRuns.map((run) => run.a.p50)),
      bP50Ms: summarizeCampaigns(queryRuns.map((run) => run.b.p50)),
      cP50Ms: summarizeCampaigns(queryRuns.map((run) => run.c.p50)),
      aP95Ms: summarizeCampaigns(queryRuns.map((run) => run.a.p95)),
      bP95Ms: summarizeCampaigns(queryRuns.map((run) => run.b.p95)),
      cP95Ms: summarizeCampaigns(queryRuns.map((run) => run.c.p95)),
      speedupAtoB: summarizeCampaigns(queryRuns.map((run) => run.speedupAtoB)),
      speedupBtoC: summarizeCampaigns(queryRuns.map((run) => run.speedupBtoC)),
      speedupAtoC: summarizeCampaigns(queryRuns.map((run) => run.speedupAtoC)),
    };
  });
}

function aggregateBreakEven(runs) {
  const availableRuns = runs.filter((run) => run.breakEven.length > 0);
  if (availableRuns.length === 0) return [];

  return availableRuns[0].breakEven.map((scenario, scenarioIndex) => ({
    name: scenario.name,
    totals: scenario.totals.map((total, totalIndex) => ({
      queryCount: total.queryCount,
      aMs: summarizeCampaigns(
        availableRuns.map((run) => run.breakEven[scenarioIndex].totals[totalIndex].a),
      ),
      bMs: summarizeCampaigns(
        availableRuns.map((run) => run.breakEven[scenarioIndex].totals[totalIndex].b),
      ),
      cMs: summarizeCampaigns(
        availableRuns.map((run) => run.breakEven[scenarioIndex].totals[totalIndex].c),
      ),
    })),
  }));
}

function aggregateDataset(campaigns, profile) {
  return sizes.map((size) => {
    const runs = campaigns.map((campaign) => campaign.sizes[String(size)]);
    const referenceStats = runs[0]?.stats;
    if (!referenceStats) throw new Error(`Statistiche mancanti per ${profile}, ${size}`);

    const aggregate = {
      normalizedBuildP50Ms: summarizeCampaigns(runs.map((run) => run.build.normalized.p50)),
      indexIncrementalBuildP50Ms: summarizeCampaigns(
        runs.map((run) => run.build.indexIncremental.p50),
      ),
      indexFullBuildP50Ms: summarizeCampaigns(runs.map((run) => run.build.indexFull.p50)),
      normalizedHeapBytes: summarizeCampaigns(
        runs.map((run) => run.memory.deltaNormalized.heapUsed),
      ),
      fullIndexHeapBytes: summarizeCampaigns(runs.map((run) => run.memory.deltaFullIndex.heapUsed)),
      incrementalIndexHeapBytes: summarizeCampaigns(
        runs.map((run) => run.memory.deltaIndexIncremental.heapUsed),
      ),
    };

    if (profile === "repetitive") {
      aggregate.queries = aggregateQueries(runs, size);
      aggregate.breakEven = aggregateBreakEven(runs);
    }

    return { size, stats: referenceStats, aggregate };
  });
}

function formatNumber(value, fractionDigits = 3) {
  return value.toLocaleString("it-IT", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

function formatInteger(value) {
  return value.toLocaleString("it-IT", { maximumFractionDigits: 0 });
}

function formatInterval(summary, fractionDigits = 3) {
  return `${formatNumber(summary.median, fractionDigits)} [${formatNumber(
    summary.q1,
    fractionDigits,
  )}–${formatNumber(summary.q3, fractionDigits)}]`;
}

function formatMebibytes(summary) {
  return `${formatNumber(summary.median / 1024 ** 2, 2)} [${formatNumber(
    summary.q1 / 1024 ** 2,
    2,
  )}–${formatNumber(summary.q3 / 1024 ** 2, 2)}]`;
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

function writeOutputFile(targetPath, contents) {
  const resolvedPath = path.resolve(targetPath);
  mkdirSync(path.dirname(resolvedPath), { recursive: true });
  writeFileSync(resolvedPath, contents, "utf8");
}

function renderQueryTable(lines, result) {
  lines.push(`## Query su ${formatInteger(result.size)} elementi`);
  lines.push("");
  lines.push("| Scenario | Risultati | A p50 (ms) | B p50 (ms) | C p50 (ms) | A/B | B/C | A/C |");
  lines.push("| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |");
  for (const query of result.aggregate.queries) {
    lines.push(
      `| ${query.name} | ${formatInteger(query.resultCount)} | ${formatInterval(
        query.aP50Ms,
      )} | ${formatInterval(query.bP50Ms)} | ${formatInterval(query.cP50Ms)} | ` +
        `${formatInterval(query.speedupAtoB, 2)}× | ${formatInterval(
          query.speedupBtoC,
          2,
        )}× | ${formatInterval(query.speedupAtoC, 2)}× |`,
    );
  }
  lines.push("");
}

function renderMarkdown(benchmark) {
  const lines = [];
  const repetitive = benchmark.aggregates.repetitive;
  const varied = benchmark.aggregates.varied;

  lines.push("# Benchmark A/B/C della ricerca pubblica", "");
  lines.push(`- Data UTC: ${benchmark.metadata.generatedAt}`);
  lines.push(`- Revisione: \`${benchmark.metadata.revision}\``);
  lines.push(
    `- Runtime: Node.js \`${benchmark.metadata.runtime.node}\`, ${benchmark.metadata.runtime.platform} ${benchmark.metadata.runtime.arch}`,
  );
  lines.push(
    `- CPU: ${benchmark.metadata.hardware.cpu}, ${benchmark.metadata.hardware.logicalProcessors} processori logici`,
  );
  lines.push(`- Memoria di sistema: ${benchmark.metadata.hardware.totalMemoryGiB} GiB`);
  lines.push(`- Campagne indipendenti: ${campaignCount}`);
  lines.push(`- Build per dimensione e campagna: ${buildRepetitions}`);
  lines.push("- A: scansione con normalizzazione a ogni query");
  lines.push("- B: scansione lineare dei campi pre-normalizzati");
  lines.push("- C: pre-normalizzazione, posting list a trigrammi e verifica finale");
  lines.push("- Sintesi: mediana [Q1–Q3] fra campagne; percentili nearest-rank", "");

  lines.push("## Costruzione e memoria — dataset ripetitivo", "");
  lines.push(
    "| Business | Build B (ms) | Build C completo (ms) | Heap B (MiB) | Heap C completo (MiB) | Trigrammi | Posting |",
  );
  lines.push("| ---: | ---: | ---: | ---: | ---: | ---: | ---: |");
  for (const result of repetitive) {
    lines.push(
      `| ${formatInteger(result.size)} | ${formatInterval(
        result.aggregate.normalizedBuildP50Ms,
      )} | ${formatInterval(result.aggregate.indexFullBuildP50Ms)} | ` +
        `${formatMebibytes(result.aggregate.normalizedHeapBytes)} | ${formatMebibytes(
          result.aggregate.fullIndexHeapBytes,
        )} | ${formatInteger(result.stats.trigramCount)} | ${formatInteger(
          result.stats.postingCount,
        )} |`,
    );
  }
  lines.push("");

  lines.push("## Controllo del vocabolario — dataset variato", "");
  lines.push(
    "| Business | Trigrammi ripetitivi | Trigrammi variati | Posting variati | Heap B variato (MiB) | Heap C variato (MiB) |",
  );
  lines.push("| ---: | ---: | ---: | ---: | ---: | ---: |");
  for (const variedResult of varied) {
    const repetitiveResult = repetitive.find((candidate) => candidate.size === variedResult.size);
    lines.push(
      `| ${formatInteger(variedResult.size)} | ${formatInteger(
        repetitiveResult.stats.trigramCount,
      )} | ${formatInteger(variedResult.stats.trigramCount)} | ${formatInteger(
        variedResult.stats.postingCount,
      )} | ${formatMebibytes(variedResult.aggregate.normalizedHeapBytes)} | ${formatMebibytes(
        variedResult.aggregate.fullIndexHeapBytes,
      )} |`,
    );
  }
  lines.push("");

  const referenceSizes = new Set([2_400, Math.max(...sizes)]);
  for (const result of repetitive.filter((candidate) => referenceSizes.has(candidate.size))) {
    renderQueryTable(lines, result);
  }

  const maximumResult = repetitive.find((candidate) => candidate.size === Math.max(...sizes));
  if (maximumResult?.aggregate.breakEven?.length) {
    lines.push(`## Break-even empirico su ${formatInteger(maximumResult.size)} elementi`, "");
    for (const scenario of maximumResult.aggregate.breakEven) {
      lines.push(`### ${scenario.name}`, "");
      lines.push("| Query | A totale (ms) | B build+query (ms) | C build+query (ms) |");
      lines.push("| ---: | ---: | ---: | ---: |");
      for (const total of scenario.totals) {
        lines.push(
          `| ${total.queryCount} | ${formatInterval(total.aMs)} | ${formatInterval(
            total.bMs,
          )} | ${formatInterval(total.cMs)} |`,
        );
      }
      lines.push("");
    }
  }

  lines.push(
    "I delta heap includono campi normalizzati, Map, array, posting e overhead del runtime. Il JSON conserva snapshot assoluti, build incrementale di C, p95, ordine delle strategie e tutte le campagne.",
  );
  return `${lines.join("\n")}\n`;
}

if (typeof globalThis.gc !== "function") {
  throw new Error("Avviare il benchmark con --expose-gc per misurare la memoria in modo coerente");
}

const memoryWorkerArgumentIndex = process.argv.indexOf("--memory-worker");
if (memoryWorkerArgumentIndex !== -1) {
  const profile = process.argv[memoryWorkerArgumentIndex + 1];
  const size = Number.parseInt(process.argv[memoryWorkerArgumentIndex + 2] ?? "", 10);
  if (!profile || !Number.isInteger(size) || size <= 0) {
    throw new Error("Argomenti del worker memoria non validi");
  }
  process.stdout.write(JSON.stringify(runMemoryWorker(profile, size)));
  process.exit(0);
}

const metadata = {
  generatedAt: new Date().toISOString(),
  revision: currentRevision(),
  runtime: { node: process.version, platform: process.platform, arch: process.arch },
  hardware: {
    cpu: os.cpus()[0]?.model ?? "non disponibile",
    logicalProcessors: os.cpus().length,
    totalMemoryGiB: Number((os.totalmem() / 1024 ** 3).toFixed(1)),
  },
  campaignCount,
  buildRepetitions,
  sizes,
  queryIterations: Object.fromEntries(sizes.map((size) => [size, iterationCount(size)])),
  warmups: 5,
  percentileMethod: "nearest-rank",
  queryOrder: "rotazione deterministica di sei ordini A/B/C fra campagne",
  breakEvenQueryCounts: skipBreakEven ? [] : breakEvenQueryCounts,
  breakEvenScenarios: skipBreakEven ? [] : [...breakEvenScenarioNames],
  memoryMethod:
    "processo Node isolato; dataset già allocato; GC e process.memoryUsage() prima del corpus B, dopo B e dopo l'indice C mantenuto vivo",
};

const warmupDataset = buildDataset(20);
const warmupCorpus = createPublicBusinessNormalizedCorpus(warmupDataset);
createPublicBusinessSearchIndexFromCorpus(warmupCorpus);
globalThis.gc();

const datasets = { repetitive: [], varied: [] };
for (const profile of Object.keys(datasets)) {
  for (let campaignIndex = 0; campaignIndex < campaignCount; campaignIndex += 1) {
    const campaign = { campaign: campaignIndex + 1, sizes: {} };
    for (const size of sizes) {
      campaign.sizes[String(size)] = runDatasetCampaign(profile, campaignIndex, size);
      process.stderr.write(
        `[benchmark] ${profile}, campagna ${campaignIndex + 1}/${campaignCount}, ${size} elementi completati\n`,
      );
      globalThis.gc();
    }
    datasets[profile].push(campaign);
  }
}

const benchmark = {
  metadata,
  datasets,
  aggregates: {
    repetitive: aggregateDataset(datasets.repetitive, "repetitive"),
    varied: aggregateDataset(datasets.varied, "varied"),
  },
};
const markdown = renderMarkdown(benchmark);

if (jsonOutputPath) writeOutputFile(jsonOutputPath, `${JSON.stringify(benchmark, null, 2)}\n`);
if (markdownOutputPath) writeOutputFile(markdownOutputPath, markdown);
process.stdout.write(markdown);

if (resultSink === Number.MIN_SAFE_INTEGER) process.stdout.write(`${resultSink}\n`);

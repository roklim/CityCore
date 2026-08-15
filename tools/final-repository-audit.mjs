import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const outDir = path.join(root, "audit-artifacts");
fs.mkdirSync(outDir, { recursive: true });

const ignoredDirs = new Set([".git", "node_modules", ".next", "dist", "coverage", "audit-artifacts", "audit-tools"]);
const productionSourceExts = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

function walk(dir, predicate = () => true) {
  const result = [];
  if (!fs.existsSync(dir)) return result;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...walk(full, predicate));
    else if (predicate(full)) result.push(full);
  }
  return result;
}

function rel(file) {
  return path.relative(root, file).split(path.sep).join("/");
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

const allTextFiles = walk(root, (file) => {
  const ext = path.extname(file);
  return productionSourceExts.has(ext) || [".json", ".yml", ".yaml", ".css", ".md", ".env", ""].includes(ext);
});

const productionWebFiles = walk(path.join(root, "apps/web/src"), (file) => {
  const ext = path.extname(file);
  return productionSourceExts.has(ext) && !/\.test\.[^.]+$/.test(file) && !/\.spec\.[^.]+$/.test(file);
});
const productionWebText = productionWebFiles.map(read).join("\n");

// CSS class reachability and custom-property usage.
const cssFile = path.join(root, "apps/web/src/app/globals.css");
const cssText = fs.existsSync(cssFile) ? read(cssFile) : "";
const cssClasses = [...new Set([...cssText.matchAll(/\.(-?[_a-zA-Z]+[\w-]*)/g)].map((m) => m[1]))].sort();
const cssClassCandidates = cssClasses.filter((name) => !productionWebText.includes(name));

const customPropDefs = [...new Set([...cssText.matchAll(/--([A-Za-z0-9_-]+)\s*:/g)].map((m) => m[1]))].sort();
const customPropUses = new Set([
  ...[...cssText.matchAll(/var\(\s*--([A-Za-z0-9_-]+)/g)].map((m) => m[1]),
  ...[...productionWebText.matchAll(/--([A-Za-z0-9_-]+)/g)].map((m) => m[1]),
]);
const unusedCustomProps = customPropDefs.filter((name) => !customPropUses.has(name));

// Public assets with no literal repository reference outside their own path.
const publicDir = path.join(root, "apps/web/public");
const publicAssets = walk(publicDir, () => true);
const repoTextWithoutPublic = allTextFiles
  .filter((file) => !file.startsWith(publicDir + path.sep))
  .map(read)
  .join("\n");
const unreferencedPublicAssets = publicAssets
  .map((file) => ({ file: rel(file), basename: path.basename(file) }))
  .filter(({ basename }) => !repoTextWithoutPublic.includes(basename));

// Environment/config coverage.
const sourceFiles = walk(root, (file) => productionSourceExts.has(path.extname(file)));
const envRefs = new Map();
for (const file of sourceFiles) {
  const text = read(file);
  const keys = new Set([
    ...[...text.matchAll(/process\.env\.([A-Z][A-Z0-9_]*)/g)].map((m) => m[1]),
    ...[...text.matchAll(/process\.env\[["']([A-Z][A-Z0-9_]*)["']\]/g)].map((m) => m[1]),
  ]);
  for (const key of keys) {
    if (!envRefs.has(key)) envRefs.set(key, []);
    envRefs.get(key).push(rel(file));
  }
}

const apiConfig = path.join(root, "apps/api/src/config.ts");
const apiConfigText = fs.existsSync(apiConfig) ? read(apiConfig) : "";
const schemaKeys = [...new Set([...apiConfigText.matchAll(/^\s{2}([A-Z][A-Z0-9_]+):/gm)].map((m) => m[1]))].sort();

const declaredEnvKeys = new Set(schemaKeys);
for (const file of allTextFiles.filter((f) => /(^|\/)(\.env[^/]*|render[^/]*\.ya?ml|.*workflow.*\.ya?ml)$/.test(rel(f)) || rel(f).includes("/.github/"))) {
  const text = read(file);
  for (const match of text.matchAll(/^\s*([A-Z][A-Z0-9_]*)\s*=/gm)) declaredEnvKeys.add(match[1]);
  for (const match of text.matchAll(/\bkey:\s*([A-Z][A-Z0-9_]*)/g)) declaredEnvKeys.add(match[1]);
  for (const match of text.matchAll(/^\s{6,}([A-Z][A-Z0-9_]*):/gm)) declaredEnvKeys.add(match[1]);
}
const referencedEnvKeys = [...envRefs.keys()].sort();
const undocumentedEnvRefs = referencedEnvKeys.filter((key) => !declaredEnvKeys.has(key));
const schemaKeysWithoutDirectProcessRef = schemaKeys.filter((key) => !envRefs.has(key));

// API config values accessed through the parsed env object.
const envObjectRefs = new Set();
for (const file of sourceFiles) {
  const text = read(file);
  for (const match of text.matchAll(/\benv\.([A-Z][A-Z0-9_]*)/g)) envObjectRefs.add(match[1]);
}
const unusedApiConfigKeys = schemaKeys.filter((key) => !envObjectRefs.has(key) && key !== "NODE_ENV" && key !== "PORT");

// TODO-like markers, for explicit review rather than deletion.
const markers = [];
for (const file of sourceFiles) {
  const lines = read(file).split(/\r?\n/);
  lines.forEach((line, index) => {
    if (/\b(TODO|FIXME|HACK|XXX|DEPRECATED)\b/i.test(line)) {
      markers.push({ file: rel(file), line: index + 1, text: line.trim().slice(0, 240) });
    }
  });
}

const report = {
  generatedAt: new Date().toISOString(),
  counts: {
    productionWebFiles: productionWebFiles.length,
    cssClasses: cssClasses.length,
    cssClassCandidates: cssClassCandidates.length,
    customProperties: customPropDefs.length,
    unusedCustomProperties: unusedCustomProps.length,
    publicAssets: publicAssets.length,
    unreferencedPublicAssets: unreferencedPublicAssets.length,
    referencedEnvKeys: referencedEnvKeys.length,
    undocumentedEnvRefs: undocumentedEnvRefs.length,
    apiSchemaKeys: schemaKeys.length,
    unusedApiConfigKeys: unusedApiConfigKeys.length,
    markers: markers.length,
  },
  cssClassCandidates,
  unusedCustomProps,
  unreferencedPublicAssets,
  env: {
    referenced: Object.fromEntries([...envRefs.entries()].sort(([a], [b]) => a.localeCompare(b))),
    schemaKeys,
    declaredKeys: [...declaredEnvKeys].sort(),
    undocumentedEnvRefs,
    schemaKeysWithoutDirectProcessRef,
    envObjectRefs: [...envObjectRefs].sort(),
    unusedApiConfigKeys,
  },
  markers,
};

fs.writeFileSync(path.join(outDir, "final-audit.json"), `${JSON.stringify(report, null, 2)}\n`);

const summary = [
  `production web files: ${report.counts.productionWebFiles}`,
  `css classes: ${report.counts.cssClasses}`,
  `css class literal-miss candidates: ${report.counts.cssClassCandidates}`,
  `unused CSS custom properties: ${report.counts.unusedCustomProperties}`,
  `unreferenced public assets: ${report.counts.unreferencedPublicAssets}`,
  `referenced env keys: ${report.counts.referencedEnvKeys}`,
  `undocumented env refs: ${report.counts.undocumentedEnvRefs}`,
  `API schema keys: ${report.counts.apiSchemaKeys}`,
  `unused API config keys: ${report.counts.unusedApiConfigKeys}`,
  `TODO/FIXME/HACK/XXX/DEPRECATED markers: ${report.counts.markers}`,
  "",
  `CSS candidates: ${cssClassCandidates.join(", ") || "none"}`,
  `Unused custom props: ${unusedCustomProps.join(", ") || "none"}`,
  `Unreferenced assets: ${unreferencedPublicAssets.map((x) => x.file).join(", ") || "none"}`,
  `Undocumented env refs: ${undocumentedEnvRefs.join(", ") || "none"}`,
  `Unused API config keys: ${unusedApiConfigKeys.join(", ") || "none"}`,
];
fs.writeFileSync(path.join(outDir, "final-audit.txt"), `${summary.join("\n")}\n`);
console.log(summary.join("\n"));

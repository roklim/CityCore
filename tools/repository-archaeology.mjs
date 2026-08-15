import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'audit-artifacts');
fs.mkdirSync(OUT, { recursive: true });

const text = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(ROOT, p));
const write = (name, lines) => fs.writeFileSync(path.join(OUT, name), Array.isArray(lines) ? lines.join('\n') + '\n' : lines);

function walk(dir, predicate = () => true) {
  const out = [];
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return out;
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    if (['node_modules', '.next', 'dist', 'coverage', '.git'].includes(entry.name)) continue;
    const rel = path.posix.join(dir.replaceAll('\\', '/'), entry.name);
    if (entry.isDirectory()) out.push(...walk(rel, predicate));
    else if (predicate(rel)) out.push(rel);
  }
  return out;
}

const sourceFiles = [...walk('apps', (f) => /\.(ts|tsx|js|mjs|css)$/.test(f)), ...walk('packages', (f) => /\.(ts|tsx|js|mjs|css)$/.test(f)), ...walk('tools', (f) => /\.(js|mjs|ts)$/.test(f))].sort();
const codeFiles = sourceFiles.filter((f) => /\.(ts|tsx|js|mjs)$/.test(f));
const codeSet = new Set(codeFiles);
const extCandidates = ['.ts', '.tsx', '.js', '.mjs'];

function resolveRelative(from, spec) {
  if (!spec.startsWith('.')) return null;
  const base = path.posix.normalize(path.posix.join(path.posix.dirname(from), spec));
  const tries = [base, ...extCandidates.map((e) => base + e), ...extCandidates.map((e) => path.posix.join(base, `index${e}`))];
  return tries.find((x) => codeSet.has(x)) ?? null;
}

function conventionEntrypoint(f) {
  return /(^|\/)(page|layout|loading|error|not-found|sitemap|robots|route)\.(ts|tsx)$/.test(f) ||
    /^apps\/api\/src\/(index|app)\.ts$/.test(f) ||
    /^tools\//.test(f) ||
    /(^|\/)test\//.test(f) || /\.test\.(ts|tsx|js)$/.test(f);
}

const incoming = new Map(codeFiles.map((f) => [f, new Set()]));
const outgoing = new Map(codeFiles.map((f) => [f, new Set()]));
const bareImports = new Map();
const importRe = /(?:from\s*|import\s*\(|require\s*\()\s*['"]([^'"]+)['"]/g;
for (const f of codeFiles) {
  const s = text(f);
  for (const m of s.matchAll(importRe)) {
    const spec = m[1];
    const resolved = resolveRelative(f, spec);
    if (resolved) {
      incoming.get(resolved).add(f);
      outgoing.get(f).add(resolved);
    } else if (!spec.startsWith('.')) {
      const pkg = spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0];
      if (!bareImports.has(pkg)) bareImports.set(pkg, new Set());
      bareImports.get(pkg).add(f);
    }
  }
}

const packageFiles = ['package.json'];
for (const root of ['apps', 'packages']) {
  if (!exists(root)) continue;
  for (const name of fs.readdirSync(path.join(ROOT, root))) {
    const f = `${root}/${name}/package.json`;
    if (exists(f)) packageFiles.push(f);
  }
}

const packages = packageFiles.map((f) => ({ file: f, json: JSON.parse(text(f)) }));
const workspaceNames = new Map(packages.filter((x) => x.file !== 'package.json' && x.json.name).map((x) => [x.json.name, x.file]));

const allTextFiles = [...walk('apps', (f) => !/\.(png|jpg|jpeg|gif|webp|ico|woff2?|ttf|pdf|zip)$/.test(f)), ...walk('packages', (f) => !/\.(png|jpg|jpeg|gif|webp|ico|woff2?|ttf|pdf|zip)$/.test(f)), ...walk('tools', () => true), ...walk('.github', () => true), ...walk('docs', () => true), 'package.json', 'compose.yml', 'compose.test.yml', 'render.yaml', 'render.staging.yaml'].filter((f, i, a) => exists(f) && a.indexOf(f) === i);
const corpus = allTextFiles.map((f) => ({ f, s: text(f) }));

function textualRefs(token, exclude = null) {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(escaped);
  return corpus.filter(({ f, s }) => f !== exclude && re.test(s)).map(({ f }) => f);
}

const report = [];
report.push('=== REPOSITORY SNAPSHOT ===');
for (const cmd of [['git', ['status', '--short']], ['git', ['branch', '--show-current']], ['git', ['rev-parse', 'HEAD']], ['git', ['log', '-10', '--oneline']]]) {
  try { report.push(`$ ${cmd[0]} ${cmd[1].join(' ')}`); report.push(execFileSync(cmd[0], cmd[1], { encoding: 'utf8' }).trimEnd()); } catch (e) { report.push(String(e)); }
}
report.push('');
report.push(`TRACKED_FILES=${execFileSync('git', ['ls-files'], { encoding: 'utf8' }).trim().split('\n').filter(Boolean).length}`);
report.push(`SOURCE_FILES=${sourceFiles.length}`);
report.push(`CODE_FILES=${codeFiles.length}`);
write('snapshot.txt', report);

const reach = [];
reach.push('=== ZERO STATIC INCOMING (NON-CONVENTION ENTRYPOINTS) ===');
const zeroIncoming = codeFiles.filter((f) => incoming.get(f).size === 0 && !conventionEntrypoint(f));
zeroIncoming.forEach((f) => reach.push(f));
reach.push(`COUNT=${zeroIncoming.length}`);
reach.push('');
reach.push('=== IMPORT GRAPH ===');
for (const f of codeFiles) reach.push(`${f} <- ${[...incoming.get(f)].join(', ')}`);
write('reachability.txt', reach);

const exportsOut = [];
const exportRe = /\bexport\s+(?:async\s+)?(?:function|const|class|type|interface|enum)\s+([A-Za-z_$][\w$]*)/g;
const noRefs = [];
for (const f of codeFiles.filter((x) => /\.(ts|tsx)$/.test(x))) {
  const s = text(f);
  for (const m of s.matchAll(exportRe)) {
    const refs = textualRefs(m[1], f);
    if (refs.length === 0) noRefs.push({ file: f, symbol: m[1] });
  }
}
exportsOut.push('=== EXPORTED SYMBOLS WITH NO OTHER TEXTUAL REFERENCE ===');
noRefs.forEach((x) => exportsOut.push(`${x.file}:${x.symbol}`));
exportsOut.push(`COUNT=${noRefs.length}`);
write('exports.txt', exportsOut);

const depsOut = [];
depsOut.push('=== DECLARED DEPENDENCIES VS BARE IMPORTS / SCRIPT REFERENCES ===');
for (const { file, json } of packages) {
  depsOut.push(`\n## ${file}`);
  for (const kind of ['dependencies', 'devDependencies']) {
    for (const [dep] of Object.entries(json[kind] ?? {})) {
      const importFiles = [...(bareImports.get(dep) ?? [])];
      const refs = textualRefs(dep, file);
      const workspace = workspaceNames.has(dep);
      depsOut.push(`${kind}\t${dep}\timports=${importFiles.length}\ttextRefs=${refs.length}\tworkspace=${workspace}\t${refs.join(',')}`);
    }
  }
  depsOut.push(`scripts=${JSON.stringify(json.scripts ?? {})}`);
}
write('dependencies.txt', depsOut);

const envOut = [];
const envReads = new Map();
for (const { f, s } of corpus) {
  for (const m of s.matchAll(/process\.env\.([A-Z0-9_]+)/g)) {
    if (!envReads.has(m[1])) envReads.set(m[1], new Set()); envReads.get(m[1]).add(f);
  }
  for (const m of s.matchAll(/process\.env\[['"]([A-Z0-9_]+)['"]\]/g)) {
    if (!envReads.has(m[1])) envReads.set(m[1], new Set()); envReads.get(m[1]).add(f);
  }
}
const envDeclared = new Map();
for (const f of allTextFiles.filter((x) => /(^|\/)(\.env[^/]*|render[^/]*\.ya?ml|compose[^/]*\.ya?ml|.*workflow.*\.ya?ml)$/.test(x) || x.startsWith('.github/workflows/'))) {
  const s = text(f);
  for (const m of s.matchAll(/\b([A-Z][A-Z0-9_]{2,})\b/g)) {
    if (!envDeclared.has(m[1])) envDeclared.set(m[1], new Set()); envDeclared.get(m[1]).add(f);
  }
}
envOut.push('=== ENV READS ===');
for (const [k, files] of [...envReads].sort()) envOut.push(`${k}\t${[...files].join(',')}`);
envOut.push('\n=== DECLARED-LIKE ENV TOKENS NOT READ IN CODE (HEURISTIC) ===');
for (const [k, files] of [...envDeclared].sort()) if (!envReads.has(k)) envOut.push(`${k}\t${[...files].join(',')}`);
write('env.txt', envOut);

const cssOut = [];
const cssFiles = sourceFiles.filter((f) => f.endsWith('.css'));
const selectors = new Map();
for (const f of cssFiles) {
  const s = text(f);
  for (const m of s.matchAll(/\.([A-Za-z_-][A-Za-z0-9_-]*)/g)) {
    if (!selectors.has(m[1])) selectors.set(m[1], new Set()); selectors.get(m[1]).add(f);
  }
}
cssOut.push('=== CSS CLASS TOKENS WITH NO NON-CSS TEXTUAL REFERENCE ===');
for (const [name, files] of [...selectors].sort()) {
  const refs = corpus.filter(({ f, s }) => !f.endsWith('.css') && s.includes(name)).map(({ f }) => f);
  if (refs.length === 0) cssOut.push(`${name}\t${[...files].join(',')}`);
}
write('css.txt', cssOut);

const assetsOut = [];
const assetFiles = [...walk('apps/web/public', () => true), ...walk('public', () => true)];
assetsOut.push('=== STATIC ASSETS WITH NO BASENAME/PATH REFERENCE OUTSIDE SELF ===');
for (const f of assetFiles) {
  const base = path.posix.basename(f);
  const refs = corpus.filter(({ f: other, s }) => other !== f && (s.includes('/' + base) || s.includes(base) || s.includes(f.replace(/^apps\/web\/public/, '')))).map(({ f: other }) => other);
  if (refs.length === 0) assetsOut.push(f);
}
write('assets.txt', assetsOut);

const apiOut = [];
apiOut.push('=== API ROUTE STRING LITERALS ===');
for (const f of codeFiles.filter((x) => x.startsWith('apps/api/'))) {
  const s = text(f);
  const lines = s.split('\n');
  lines.forEach((line, i) => { if (/['"]\/api\//.test(line) || /app\.(get|post|patch|put|delete)\(/.test(line)) apiOut.push(`${f}:${i+1}:${line.trim()}`); });
}
apiOut.push('\n=== WEB API STRING REFERENCES ===');
for (const f of codeFiles.filter((x) => x.startsWith('apps/web/'))) {
  const s = text(f);
  s.split('\n').forEach((line, i) => { if (/\/api\//.test(line) || /fetch\(/.test(line) || /apiRequest\(/.test(line)) apiOut.push(`${f}:${i+1}:${line.trim()}`); });
}
write('routes.txt', apiOut);

const todoOut = [];
for (const { f, s } of corpus) s.split('\n').forEach((line, i) => { if (/test\.skip|describe\.skip|it\.skip|TODO|FIXME|legacy|obsolete|deprecated|stub|backup|\bold\b/i.test(line)) todoOut.push(`${f}:${i+1}:${line.trim()}`); });
write('suspicious-text.txt', todoOut);

console.log(JSON.stringify({ sourceFiles: sourceFiles.length, codeFiles: codeFiles.length, zeroIncoming: zeroIncoming.length, exportedNoRefs: noRefs.length, cssFiles: cssFiles.length, assets: assetFiles.length, envReads: envReads.size }, null, 2));

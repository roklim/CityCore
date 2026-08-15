import fs from "node:fs";
import path from "node:path";

const cssFile = "apps/web/src/app/globals.css";
const deadClasses = new Set([
  "admin-inquiry-contacts",
  "admin-inquiry-copy",
  "admin-inquiry-form",
  "admin-inquiry-heading",
  "admin-inquiry-list",
  "admin-inquiry-row",
  "admin-order-list",
  "admin-order-row",
  "admin-order-status-form",
  "business-menu-list",
  "business-menu-row-footer",
  "business-module-fieldset",
  "business-module-option",
  "card-topline",
  "data-grid",
  "detail-list",
  "empty-copy",
  "inline-stack",
  "public-aside-label",
  "public-card",
  "public-hero-aside",
  "public-list-grid",
  "public-mobile-nav",
  "public-mobile-nav-item",
  "route-pill",
  "spotlight-card",
  "spotlight-primary",
]);
const deadCustomProperties = [
  "cc-canvas-deep",
  "cc-canvas-top",
  "cc-duration-slow",
  "cc-surface-1",
  "cc-surface-2",
  "cc-surface-3",
  "cc-surface-raised",
];

function walk(dir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (/\.(?:ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name) && !/\.(?:test|spec)\./.test(entry.name)) files.push(full);
  }
  return files;
}

const sourceText = [
  ...walk("apps/web/src"),
  ...walk("packages/ui/src"),
  ...walk("packages/domain/src"),
  ...walk("packages/templates/src"),
].map((file) => fs.readFileSync(file, "utf8")).join("\n");

// Every selector removed here must be absent as a literal production class.
for (const className of deadClasses) {
  if (sourceText.includes(className)) {
    throw new Error(`Refusing CSS cleanup: production source still contains ${className}`);
  }
}

// Protect template-generated class families. Only class-like fragments containing a hyphen
// are meaningful here: generic path/text fragments such as "admin" must not block unrelated
// selectors, while real dynamic prefixes such as "is-" remain protected.
const dynamicFragments = new Set();
for (const match of sourceText.matchAll(/`([^`]*\$\{[^`]+)`/g)) {
  const template = match[1];
  const literalPieces = template.split(/\$\{[^}]*\}/g);
  for (const piece of literalPieces) {
    for (const token of piece.split(/\s+/).filter(Boolean)) {
      const cleaned = token.replace(/^[^A-Za-z0-9_-]+|[^A-Za-z0-9_-]+$/g, "");
      if (cleaned.length >= 3 && cleaned.includes("-")) dynamicFragments.add(cleaned);
    }
  }
}
for (const className of deadClasses) {
  for (const fragment of dynamicFragments) {
    if ((className.startsWith(fragment) || className.endsWith(fragment)) && fragment !== className) {
      throw new Error(
        `Refusing CSS cleanup: ${className} overlaps dynamic class fragment ${fragment}`,
      );
    }
  }
}

function findMatchingBrace(text, openIndex) {
  let depth = 0;
  let quote = null;
  let comment = false;
  for (let i = openIndex; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];
    if (comment) {
      if (ch === "*" && next === "/") {
        comment = false;
        i += 1;
      }
      continue;
    }
    if (!quote && ch === "/" && next === "*") {
      comment = true;
      i += 1;
      continue;
    }
    if (quote) {
      if (ch === "\\") i += 1;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  throw new Error("Unbalanced CSS braces");
}

function splitSelectors(header) {
  const selectors = [];
  let start = 0;
  let paren = 0;
  let bracket = 0;
  let quote = null;
  for (let i = 0; i < header.length; i += 1) {
    const ch = header[i];
    if (quote) {
      if (ch === "\\") i += 1;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") quote = ch;
    else if (ch === "(") paren += 1;
    else if (ch === ")") paren -= 1;
    else if (ch === "[") bracket += 1;
    else if (ch === "]") bracket -= 1;
    else if (ch === "," && paren === 0 && bracket === 0) {
      selectors.push(header.slice(start, i).trim());
      start = i + 1;
    }
  }
  selectors.push(header.slice(start).trim());
  return selectors.filter(Boolean);
}

const deadClassPatterns = [...deadClasses].map((name) => ({
  name,
  regex: new RegExp(`\\.${name.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}(?![A-Za-z0-9_-])`),
}));

function selectorUsesDeadClass(selector) {
  return deadClassPatterns.some(({ regex }) => regex.test(selector));
}

function transformCssBlock(text) {
  let output = "";
  let cursor = 0;
  while (cursor < text.length) {
    const open = text.indexOf("{", cursor);
    if (open === -1) {
      output += text.slice(cursor);
      break;
    }
    const close = findMatchingBrace(text, open);
    const rawHeader = text.slice(cursor, open);
    const header = rawHeader.trim();
    const body = text.slice(open + 1, close);

    if (header.startsWith("@media") || header.startsWith("@supports") || header.startsWith("@container") || header.startsWith("@layer")) {
      const transformedBody = transformCssBlock(body);
      if (transformedBody.trim()) output += `${rawHeader}{${transformedBody}}`;
    } else if (header.startsWith("@")) {
      output += `${rawHeader}{${body}}`;
    } else {
      const selectors = splitSelectors(header);
      const kept = selectors.filter((selector) => !selectorUsesDeadClass(selector));
      if (kept.length) {
        const leading = rawHeader.match(/^\s*/)?.[0] ?? "";
        output += `${leading}${kept.join(",\n")}{${body}}`;
      }
    }
    cursor = close + 1;
  }
  return output;
}

let css = fs.readFileSync(cssFile, "utf8");
for (const property of deadCustomProperties) {
  const definition = new RegExp(`^\\s*--${property}:\\s*[^;]+;\\s*\\n`, "m");
  if (!definition.test(css)) throw new Error(`Expected CSS custom property not found: --${property}`);
  css = css.replace(definition, "");
}
css = transformCssBlock(css);

for (const className of deadClasses) {
  const remains = new RegExp(`\\.${className}(?![A-Za-z0-9_-])`).test(css);
  if (remains) throw new Error(`CSS selector cleanup incomplete for ${className}`);
}
for (const property of deadCustomProperties) {
  if (css.includes(`--${property}:`)) throw new Error(`CSS property cleanup incomplete for --${property}`);
}

fs.writeFileSync(cssFile, css);
console.log(`Removed ${deadClasses.size} unreachable CSS class families and ${deadCustomProperties.length} unused custom properties.`);

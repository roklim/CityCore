import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";

const HELP_TEXT = `
etl-ordering-legacy

Uso:
  node tools/etl-ordering-legacy.mjs inspect
  node tools/etl-ordering-legacy.mjs compare --business <legacy-business-slug>
  node tools/etl-ordering-legacy.mjs export --business <legacy-business-slug> [--output <file>]
  node tools/etl-ordering-legacy.mjs import [--business <legacy-business-slug>]

Comandi:
  inspect   Legge Mongo legacy e mostra business ordering rilevanti con conteggi.
  compare   Confronta i conteggi legacy con il business V2 corrispondente.
  export    Esporta un dataset ordering normalizzato pronto per ETL/audit.
  import    Esegue un import pilota selettivo in Postgres per i soli dati eleggibili.

Opzioni:
  --business <slug>  Filtra un singolo business legacy.
  --output <file>    File JSON per export. Default: tools/.generated/ordering-etl-<slug>.json
  --include-non-candidates  Include tenant demo/seed nei comandi export/compare.
`;

const currentDir = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(currentDir, "../apps/api/.env") });

const require = createRequire(import.meta.url);
const legacyBackendDir = resolve(currentDir, "../legacy/backend");
const legacySourceAvailable = existsSync(legacyBackendDir);
const legacyDb = legacySourceAvailable ? require("../legacy/backend/db") : null;
const legacyConfig = legacySourceAvailable ? require("../legacy/backend/config") : null;

const prisma = new PrismaClient();
const KNOWN_DEMO_SLUGS = new Set(["mucho-gusto", "sushi"]);
const KNOWN_DEMO_PROJECTS = new Set(["mucho-gusto"]);
const DEMO_TEMPLATE_SIGNATURES = new Map([
  ["mucho-gusto", ["margherita", "diavola", "coca-cola", "suppli", "tiramisu"]],
  ["sushi", ["acqua", "edamame", "gyoza", "nigiri-mix", "uramaki-salmone"]],
]);
const DEFAULT_V2_ORDERING_SETTINGS = {
  openingHours: "Tutti i giorni 18:00-22:30",
  openingDays: ["lun", "mar", "mer", "gio", "ven", "sab", "dom"],
  openingTimeStart: "18:00",
  openingTimeEnd: "22:30",
  deliveryCost: 0,
  minimumOrder: 0,
  serviceZones: [],
  customerMessage: "",
};

if (process.argv.includes("--help")) {
  console.log(HELP_TEXT.trim());
  process.exit(0);
}

function parseArgs(argv) {
  const options = {
    command: "inspect",
    businessSlug: "",
    output: "",
    includeNonCandidates: false,
  };

  const [, , maybeCommand, ...rest] = argv;
  if (maybeCommand && !maybeCommand.startsWith("--")) {
    options.command = maybeCommand;
  }

  const positional = [];

  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    const next = rest[index + 1];

    if (token === "--business" && next) {
      options.businessSlug = next.trim().toLowerCase();
      index += 1;
      continue;
    }

    if (token === "--output" && next) {
      options.output = next.trim();
      index += 1;
      continue;
    }

    if (token === "--include-non-candidates") {
      options.includeNonCandidates = true;
      continue;
    }

    if (!token.startsWith("--")) {
      positional.push(token.trim());
    }
  }

  if (!options.businessSlug && positional[0]) {
    options.businessSlug = positional[0].toLowerCase();
  }

  if (!options.output && positional[1]) {
    options.output = positional[1];
  }

  return options;
}

function logStep(label, payload) {
  console.log(`\n[etl-ordering] ${label}`);

  if (payload !== undefined) {
    console.log(typeof payload === "string" ? payload : JSON.stringify(payload, null, 2));
  }
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "");
}

function safeDateToIso(value) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toPickupDateTime(dateString, timeString) {
  if (!dateString || !timeString) {
    return null;
  }

  const [year, month, day] = String(dateString).split("-").map(Number);
  const [hours, minutes] = String(timeString).split(":").map(Number);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes)
  ) {
    return null;
  }

  return new Date(Date.UTC(year, month - 1, day, hours - 2, minutes)).toISOString();
}

function mapLegacyOrderStatus(status) {
  switch (status) {
    case "preparing":
      return "preparing";
    case "ready":
      return "ready";
    case "done":
      return "completed";
    case "cancelled":
      return "cancelled";
    default:
      return "pending";
  }
}

function makeScope(businessId, isDefaultBusiness, extra = {}) {
  const businessClause = isDefaultBusiness
    ? {
        $or: [{ businessId }, { businessId: { $exists: false } }, { businessId: null }],
      }
    : { businessId };

  return {
    $and: [businessClause, extra],
  };
}

function deriveCategoryName(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "Altro";
  }

  return raw
    .split(/[-_]/g)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

function buildItemSlug(name, legacyId) {
  return `${slugify(name) || "item"}-${String(legacyId).slice(-6).toLowerCase()}`;
}

function getDefaultExportPath(businessSlug) {
  return resolve(currentDir, `.generated/ordering-etl-${businessSlug}.json`);
}

function areStringArraysEqual(left, right) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}

function normalizeSettingsForComparison(settings) {
  return {
    openingHours: String(settings.openingHours || "").trim(),
    openingDays: Array.isArray(settings.openingDays)
      ? settings.openingDays.map((day) => String(day || "").trim()).filter(Boolean)
      : [],
    openingTimeStart: String(settings.openingTimeStart || "").trim(),
    openingTimeEnd: String(settings.openingTimeEnd || "").trim(),
    deliveryCost: Number(settings.deliveryCost || 0),
    minimumOrder: Number(settings.minimumOrder || 0),
    serviceZones: Array.isArray(settings.serviceZones)
      ? settings.serviceZones.map((zone) => String(zone || "").trim()).filter(Boolean)
      : [],
    customerMessage: String(settings.customerMessage || "").trim(),
  };
}

function settingsDifferFromV2Defaults(settings) {
  const normalized = normalizeSettingsForComparison(settings);
  const defaults = normalizeSettingsForComparison(DEFAULT_V2_ORDERING_SETTINGS);

  return !(
    normalized.openingHours === defaults.openingHours &&
    areStringArraysEqual(normalized.openingDays, defaults.openingDays) &&
    normalized.openingTimeStart === defaults.openingTimeStart &&
    normalized.openingTimeEnd === defaults.openingTimeEnd &&
    normalized.deliveryCost === defaults.deliveryCost &&
    normalized.minimumOrder === defaults.minimumOrder &&
    areStringArraysEqual(normalized.serviceZones, defaults.serviceZones) &&
    normalized.customerMessage === defaults.customerMessage
  );
}

function matchesDemoTemplateSignature(businessSlug, menuItemNames) {
  const expected = DEMO_TEMPLATE_SIGNATURES.get(businessSlug);
  if (!expected) {
    return false;
  }

  const actual = menuItemNames.map((name) => slugify(name)).sort();
  const normalizedExpected = expected.map((name) => slugify(name)).sort();

  return (
    actual.length === normalizedExpected.length &&
    actual.every((value, index) => value === normalizedExpected[index])
  );
}

function classifyLegacyBusiness(entry) {
  const { business, isDefaultBusiness, counts, sampleMenuNames } = entry;
  const reasons = [];
  const recommendedAction = [];
  let kind = "audit_only";

  const hasOperationalData = counts.orders > 0 || counts.customers > 0 || counts.coupons > 0;
  const hasNoOperationalData =
    counts.orders === 0 && counts.customers === 0 && counts.coupons === 0;
  const deploymentProject = String(business.deployment?.vercelProjectName || "")
    .trim()
    .toLowerCase();
  const deploymentNotes = String(business.deployment?.notes || "")
    .trim()
    .toLowerCase();
  const isKnownDemoSlug = KNOWN_DEMO_SLUGS.has(business.slug);
  const isKnownDemoProject = KNOWN_DEMO_PROJECTS.has(deploymentProject);
  const templateSignatureMatch = matchesDemoTemplateSignature(business.slug, sampleMenuNames);

  if (isDefaultBusiness) {
    reasons.push("default legacy single-business fallback tenant");
  }

  if (isKnownDemoSlug) {
    reasons.push("known demo/test slug from legacy fixtures");
  }

  if (isKnownDemoProject || deploymentNotes.includes("vite_business_slug")) {
    reasons.push("deployment metadata points to legacy demo fixture");
  }

  if (templateSignatureMatch) {
    reasons.push("menu matches built-in legacy demo template");
  }

  if (entry.isDefaultBusiness && entry.counts.orders > 0) {
    reasons.push("default tenant may also absorb legacy documents without businessId");
  }

  if (hasNoOperationalData) {
    reasons.push("no operational data beyond setup records");
  }

  if (hasOperationalData) {
    reasons.push("contains operational data to review before ETL");
  }

  if (isDefaultBusiness) {
    kind = "audit_only";
    recommendedAction.push("do-not-import-1to-1");
    recommendedAction.push("use-only-for-reference-or-audit");
  } else if (isKnownDemoSlug && (isKnownDemoProject || templateSignatureMatch)) {
    kind = "ignored_demo";
    recommendedAction.push("ignore-for-production-etl");
  } else if (isKnownDemoSlug && hasNoOperationalData) {
    kind = "ignored_demo";
    recommendedAction.push("ignore-for-production-etl");
  } else if (hasOperationalData) {
    kind = "eligible_for_import";
    recommendedAction.push("review-and-import-selectively");
  } else {
    kind = "ignored_demo";
    recommendedAction.push("ignore-unless-explicitly-needed");
  }

  return {
    kind,
    hasOperationalData,
    recommendedAction,
    reasons,
  };
}

function allowMigrationTarget(entry, options) {
  if (options.includeNonCandidates) {
    return true;
  }

  return entry.classification.kind === "eligible_for_import";
}

async function listLegacyBusinesses(filterSlug = "") {
  const where = filterSlug ? { slug: filterSlug } : {};
  const businesses = await legacyDb.Business.find(where).sort({ createdAt: 1 }).lean();
  const defaultSlug = legacyConfig.business.defaultSlug;

  const results = [];

  for (const business of businesses) {
    const isDefaultBusiness = business.slug === defaultSlug;
    const baseScope = makeScope(business._id, isDefaultBusiness);

    const [menuItems, orders, customers, coupons, settings, sampleMenuItems] = await Promise.all([
      legacyDb.MenuItem.countDocuments(baseScope),
      legacyDb.Order.countDocuments(baseScope),
      legacyDb.Customer.countDocuments(baseScope),
      legacyDb.Coupon.countDocuments(baseScope),
      legacyDb.StoreSettings.countDocuments(baseScope),
      legacyDb.MenuItem.find(baseScope).sort({ createdAt: 1 }).limit(12).select("name").lean(),
    ]);

    const orderingRelevant =
      business?.features?.ordering === true ||
      menuItems > 0 ||
      orders > 0 ||
      customers > 0 ||
      coupons > 0 ||
      settings > 0;

    const entry = {
      business,
      isDefaultBusiness,
      orderingRelevant,
      counts: {
        menuItems,
        orders,
        customers,
        coupons,
        settings,
      },
      sampleMenuNames: sampleMenuItems.map((item) => item.name),
    };

    entry.classification = classifyLegacyBusiness(entry);

    results.push(entry);
  }

  return results.filter((entry) => entry.orderingRelevant);
}

function buildSelectionReport({ classification, menuItems, customers, orders, businessSettings }) {
  const report = {
    businessStatus: classification.kind,
    importAllowed: classification.kind === "eligible_for_import",
    menuItems: {
      eligible: [],
      rejected: [],
    },
    customers: {
      eligible: [],
      rejected: [],
    },
    orders: {
      eligible: [],
      rejected: [],
    },
    coupons: {
      eligible: [],
      rejected: [],
    },
    settings: {
      eligible: null,
      rejectedStatus: null,
      rejectedReason: null,
    },
  };

  for (const item of menuItems) {
    if (!report.importAllowed) {
      report.menuItems.rejected.push({
        legacyId: item.legacyId,
        status: classification.kind,
        reason: classification.kind,
      });
      continue;
    }

    if (!item.name.trim() || item.price <= 0) {
      report.menuItems.rejected.push({
        legacyId: item.legacyId,
        status: "rejected_dirty_data",
        reason: "invalid_menu_item",
      });
      continue;
    }

    report.menuItems.eligible.push(item.legacyId);
  }

  for (const customer of customers) {
    if (!report.importAllowed) {
      report.customers.rejected.push({
        legacyId: customer.legacyId,
        status: classification.kind,
        reason: classification.kind,
      });
      continue;
    }

    if (customer.phone.length < 6) {
      report.customers.rejected.push({
        legacyId: customer.legacyId,
        status: "rejected_dirty_data",
        reason: "missing_valid_phone",
      });
      continue;
    }

    report.customers.eligible.push(customer.legacyId);
  }

  for (const order of orders) {
    if (!report.importAllowed) {
      report.orders.rejected.push({
        legacyId: order.legacyId,
        status: classification.kind,
        reason: classification.kind,
      });
      continue;
    }

    if (!order.customerName.trim() || order.customerPhone.length < 6) {
      report.orders.rejected.push({
        legacyId: order.legacyId,
        status: "rejected_dirty_data",
        reason: "dirty_customer_data",
      });
      continue;
    }

    if (!order.pickupAt || order.items.length === 0 || order.grandTotal <= 0) {
      report.orders.rejected.push({
        legacyId: order.legacyId,
        status: "rejected_dirty_data",
        reason: "dirty_order_payload",
      });
      continue;
    }

    report.orders.eligible.push(order.legacyId);
  }

  report.coupons.rejected.push({
    status: "rejected_dirty_data",
    reason: "legacy_coupons_not_imported_by_policy",
    count: 0,
  });

  if (!report.importAllowed) {
    report.settings.rejectedStatus = classification.kind;
    report.settings.rejectedReason = classification.kind;
  } else if (settingsDifferFromV2Defaults(businessSettings)) {
    report.settings.eligible = businessSettings;
  } else {
    report.settings.rejectedStatus = "rejected_dirty_data";
    report.settings.rejectedReason = "matches_v2_defaults";
  }

  return report;
}

function summarizeSelectionReport(report) {
  return {
    businessStatus: report.businessStatus,
    importAllowed: report.importAllowed,
    menuItems: {
      eligible: report.menuItems.eligible.length,
      rejected: report.menuItems.rejected.length,
    },
    customers: {
      eligible: report.customers.eligible.length,
      rejected: report.customers.rejected.length,
    },
    orders: {
      eligible: report.orders.eligible.length,
      rejected: report.orders.rejected.length,
    },
    coupons: {
      eligible: report.coupons.eligible.length,
      rejected: report.coupons.rejected.length,
    },
    settings: {
      eligible: report.settings.eligible != null,
      rejectedStatus: report.settings.rejectedStatus,
      rejectedReason: report.settings.rejectedReason,
    },
  };
}

async function buildNormalizedDataset(entry) {
  const { business, isDefaultBusiness } = entry;
  const scope = makeScope(business._id, isDefaultBusiness);

  const [menuItems, customers, coupons, orders, settings] = await Promise.all([
    legacyDb.MenuItem.find(scope).sort({ category: 1, sortOrder: 1, name: 1 }).lean(),
    legacyDb.Customer.find(scope).sort({ updatedAt: -1, createdAt: -1 }).lean(),
    legacyDb.Coupon.find(scope).sort({ createdAt: -1 }).lean(),
    legacyDb.Order.find(scope).sort({ createdAt: 1 }).lean(),
    legacyDb.StoreSettings.findOne(scope).lean(),
  ]);

  const categoriesMap = new Map();
  for (const item of menuItems) {
    const categoryValue =
      String(item.category || "altro")
        .trim()
        .toLowerCase() || "altro";

    if (!categoriesMap.has(categoryValue)) {
      categoriesMap.set(categoryValue, {
        legacyCategory: categoryValue,
        slug: slugify(categoryValue) || "altro",
        name: deriveCategoryName(categoryValue),
        sortOrder: Number(item.sortOrder) || categoriesMap.size * 10,
      });
    }
  }

  const normalizedMenuItems = menuItems.map((item) => {
    const categoryValue =
      String(item.category || "altro")
        .trim()
        .toLowerCase() || "altro";
    const category = categoriesMap.get(categoryValue);

    return {
      legacyId: String(item._id),
      categoryLegacy: categoryValue,
      categorySlug: category.slug,
      name: item.name,
      slug: buildItemSlug(item.name, item._id),
      description: item.description || "",
      price: Number(item.price || 0),
      available: item.available !== false,
      featured: item.featured === true,
      emoji: item.emoji || null,
      imageUrl: item.imageUrl || null,
      unit: item.unit || null,
      tags: Array.isArray(item.tags) ? item.tags : [],
      allergens: Array.isArray(item.allergens) ? item.allergens : [],
      sortOrder: Number(item.sortOrder) || 0,
      createdAt: safeDateToIso(item.createdAt),
      updatedAt: safeDateToIso(item.updatedAt),
    };
  });

  const normalizedCustomers = customers.map((customer) => ({
    legacyId: String(customer._id),
    name: customer.name || "",
    phone: normalizePhone(customer.phone),
    points: Number(customer.points || 0),
    completedOrders: Number(customer.completedOrders || 0),
    totalOrders: Number(customer.totalOrders || 0),
    lastOrderLegacyId: customer.lastOrder ? String(customer.lastOrder) : null,
    lastOrderAt: safeDateToIso(customer.lastOrderAt),
    createdAt: safeDateToIso(customer.createdAt),
    updatedAt: safeDateToIso(customer.updatedAt),
  }));

  const normalizedCoupons = coupons.map((coupon) => ({
    legacyId: String(coupon._id),
    code: String(coupon.code || "")
      .trim()
      .toUpperCase(),
    type: coupon.type === "fixed" ? "fixed" : "percent",
    value: Number(coupon.value || 0),
    expiresAt: coupon.expiresAt ? safeDateToIso(coupon.expiresAt) : null,
    usageLimit: Number(coupon.usageLimit || 0),
    usedCount: Number(coupon.usedCount || 0),
    active: coupon.active !== false,
    createdAt: safeDateToIso(coupon.createdAt),
    updatedAt: safeDateToIso(coupon.updatedAt),
  }));

  const normalizedOrders = orders.map((order) => ({
    legacyId: String(order._id),
    customerName: order.customer,
    customerPhone: normalizePhone(order.phone),
    notes: order.notes || "",
    status: mapLegacyOrderStatus(order.status),
    pickupDate: order.pickupDate,
    pickupTime: order.pickupTime,
    pickupSlot: order.pickupSlot,
    pickupAt: toPickupDateTime(order.pickupDate, order.pickupTime),
    fulfillmentType: order.fulfillmentType === "delivery" ? "delivery" : "pickup",
    grandTotal: Number(order.total || 0),
    paymentStatus: "pending",
    source: order.handledBy ? "admin" : "web",
    loyaltyAwarded: order.loyaltyAwarded === true,
    handledBy: order.handledBy || null,
    items: Array.isArray(order.items)
      ? order.items.map((item) => ({
          legacyMenuItemId: item.menuItemId ? String(item.menuItemId) : null,
          name: item.name,
          price: Number(item.price || 0),
          qty: Number(item.qty || 0),
          notes: item.notes || "",
          lineTotal: Number(item.price || 0) * Number(item.qty || 0),
        }))
      : [],
    createdAt: safeDateToIso(order.createdAt),
    updatedAt: safeDateToIso(order.updatedAt),
  }));

  const counts = {
    categories: categoriesMap.size,
    menuItems: normalizedMenuItems.length,
    customers: normalizedCustomers.length,
    customersWithPhone: normalizedCustomers.filter((entry) => entry.phone.length >= 6).length,
    customersWithoutPhone: normalizedCustomers.filter((entry) => entry.phone.length < 6).length,
    coupons: normalizedCoupons.length,
    orders: normalizedOrders.length,
    ordersWithoutPhone: normalizedOrders.filter((entry) => entry.customerPhone.length < 6).length,
    ordersByStatus: normalizedOrders.reduce((accumulator, order) => {
      accumulator[order.status] = (accumulator[order.status] || 0) + 1;
      return accumulator;
    }, {}),
  };

  const businessSettings = {
    openingHours:
      settings?.openingHours || business?.settings?.openingHours || "Mar-Dom 18:00-22:30",
    openingDays: settings?.openingDays ||
      business?.settings?.openingDays || ["mar", "mer", "gio", "ven", "sab", "dom"],
    openingTimeStart: settings?.openingTimeStart || business?.settings?.openingTimeStart || "18:00",
    openingTimeEnd: settings?.openingTimeEnd || business?.settings?.openingTimeEnd || "22:30",
    deliveryCost: Number(settings?.deliveryCost || 0),
    minimumOrder: Number(settings?.minimumOrder || 0),
    serviceZones: Array.isArray(settings?.serviceZones) ? settings.serviceZones : [],
    customerMessage: settings?.customerMessage || business?.settings?.publicMessage || "",
  };

  const selection = buildSelectionReport({
    classification: entry.classification,
    menuItems: normalizedMenuItems,
    customers: normalizedCustomers,
    orders: normalizedOrders,
    businessSettings,
  });
  selection.coupons.rejected = [
    {
      reason: "legacy_coupons_not_imported_by_policy",
      count: normalizedCoupons.length,
    },
  ];

  return {
    exportedAt: new Date().toISOString(),
    legacy: {
      businessId: String(business._id),
      businessSlug: business.slug,
      businessName: business.name,
      citySlug: business.location?.citySlug || "cagli",
      cityName: business.location?.cityName || "Cagli",
      province: business.location?.province || "",
      region: business.location?.region || "",
      defaultTenantIncludesMissingBusinessId: isDefaultBusiness,
      features: business.features || {},
      settings: businessSettings,
      branding: {
        primaryColor: business.branding?.primaryColor || null,
        accentColor: business.branding?.accentColor || null,
        logoUrl: business.branding?.logoUrl || null,
        coverImageUrl: business.branding?.coverImageUrl || null,
        publicName: business.branding?.publicName || null,
      },
      classification: entry.classification,
      counts,
      selection: summarizeSelectionReport(selection),
    },
    normalized: {
      city: {
        slug: business.location?.citySlug || "cagli",
        name: business.location?.cityName || "Cagli",
        province: business.location?.province || "",
        region: business.location?.region || "",
        country: business.location?.country || "IT",
      },
      business: {
        slug: business.slug,
        name: business.name,
        templateCode: "pizzeria",
        category: "food",
        plan: business.plan || "free",
        subscriptionStatus: business.subscriptionStatus || "trialing",
        publicPhone: "",
        publicEmail: "",
        addressLine1: business.location?.address || "",
        primaryColor: business.branding?.primaryColor || null,
        accentColor: business.branding?.accentColor || null,
        publicTitle: business.branding?.publicName || business.name,
        publicDescription: business.settings?.publicMessage || "",
      },
      settings: businessSettings,
      categories: Array.from(categoriesMap.values()),
      menuItems: normalizedMenuItems,
      customers: normalizedCustomers,
      coupons: normalizedCoupons,
      orders: normalizedOrders,
    },
    blockers: {
      customersWithoutPhone: counts.customersWithoutPhone,
      ordersWithoutPhone: counts.ordersWithoutPhone,
      legacyStatusValues: Array.from(new Set(orders.map((order) => order.status).filter(Boolean))),
      notes: [
        "Legacy orders do not carry coupon linkage in a way directly reusable in V2.",
        "Users/access grants are not imported in this slice.",
        "Orders are normalized for ETL/audit, but not yet written into Postgres by this script.",
      ],
    },
    selection,
  };
}

async function ensureGeneratedDirectory(filePath) {
  await mkdir(dirname(filePath), { recursive: true });
}

async function runInspect(options) {
  const businesses = await listLegacyBusinesses(options.businessSlug);
  const summary = [];

  for (const entry of businesses) {
    const dataset = await buildNormalizedDataset(entry);
    summary.push({
      businessSlug: entry.business.slug,
      businessName: entry.business.name,
      citySlug: entry.business.location?.citySlug || "cagli",
      defaultTenantIncludesMissingBusinessId: entry.isDefaultBusiness,
      classification: entry.classification.kind,
      recommendedAction: entry.classification.recommendedAction,
      reasons: entry.classification.reasons,
      counts: entry.counts,
      selection: dataset.legacy.selection,
    });
  }

  logStep("legacy ordering businesses", summary);

  const aggregate = summary.reduce((accumulator, entry) => {
    accumulator[entry.classification] = (accumulator[entry.classification] || 0) + 1;
    return accumulator;
  }, {});

  logStep("classification summary", aggregate);
}

async function runExport(options) {
  const businesses = await listLegacyBusinesses(options.businessSlug);

  if (businesses.length === 0) {
    throw new Error("No legacy ordering business found for export");
  }

  for (const entry of businesses) {
    if (!allowMigrationTarget(entry, options)) {
      logStep("export skipped", {
        businessSlug: entry.business.slug,
        classification: entry.classification.kind,
        reasons: entry.classification.reasons,
      });
      continue;
    }

    const dataset = await buildNormalizedDataset(entry);
    const outputPath = options.output || getDefaultExportPath(entry.business.slug);
    await ensureGeneratedDirectory(outputPath);
    await writeFile(outputPath, JSON.stringify(dataset, null, 2), "utf8");

    logStep("export written", {
      businessSlug: entry.business.slug,
      outputPath,
      classification: dataset.legacy.classification.kind,
      counts: dataset.legacy.counts,
    });
  }
}

async function runCompare(options) {
  const businesses = await listLegacyBusinesses(options.businessSlug);

  if (businesses.length === 0) {
    throw new Error("No legacy ordering business found for comparison");
  }

  for (const entry of businesses) {
    if (!allowMigrationTarget(entry, options)) {
      logStep("compare skipped", {
        businessSlug: entry.business.slug,
        classification: entry.classification.kind,
        reasons: entry.classification.reasons,
      });
      continue;
    }

    const dataset = await buildNormalizedDataset(entry);
    const businessSlug = dataset.normalized.business.slug;
    const citySlug = dataset.normalized.city.slug;

    const v2Business = await prisma.business.findFirst({
      where: {
        slug: businessSlug,
        city: {
          slug: citySlug,
        },
      },
      select: {
        id: true,
        slug: true,
        city: {
          select: {
            slug: true,
          },
        },
        modules: {
          where: {
            moduleCode: "ordering",
          },
          select: {
            id: true,
            active: true,
          },
        },
      },
    });

    if (!v2Business) {
      logStep("compare", {
        businessSlug,
        citySlug,
        error: "Matching V2 business not found",
        legacyCounts: dataset.legacy.counts,
      });
      continue;
    }

    const [categoryCount, menuItemCount, customerCount, couponCount, orderCount] =
      await Promise.all([
        prisma.menuCategory.count({ where: { businessId: v2Business.id } }),
        prisma.menuItem.count({ where: { businessId: v2Business.id } }),
        prisma.customerProfile.count({ where: { businessId: v2Business.id } }),
        prisma.coupon.count({ where: { businessId: v2Business.id } }),
        prisma.order.count({ where: { businessId: v2Business.id } }),
      ]);

    logStep("compare", {
      businessSlug,
      citySlug,
      orderingModuleActive: v2Business.modules.some((entry) => entry.active),
      legacy: dataset.legacy.counts,
      v2: {
        categories: categoryCount,
        menuItems: menuItemCount,
        customers: customerCount,
        coupons: couponCount,
        orders: orderCount,
      },
      blockers: dataset.blockers,
    });
  }
}

async function ensureTemplate() {
  return prisma.businessTemplate.upsert({
    where: {
      code: "pizzeria",
    },
    update: {
      name: "Pizzeria",
      category: "food",
      primaryModule: "ordering",
      active: true,
    },
    create: {
      code: "pizzeria",
      name: "Pizzeria",
      category: "food",
      primaryModule: "ordering",
      active: true,
    },
  });
}

async function ensureCityForImport(cityData) {
  return prisma.city.upsert({
    where: {
      slug: cityData.slug,
    },
    update: {
      name: cityData.name,
      province: cityData.province || null,
      region: cityData.region || null,
      country: cityData.country || "IT",
      status: "active",
      active: true,
    },
    create: {
      name: cityData.name,
      slug: cityData.slug,
      province: cityData.province || null,
      region: cityData.region || null,
      country: cityData.country || "IT",
      status: "active",
      active: true,
    },
  });
}

async function ensureImportedBusiness(dataset) {
  const template = await ensureTemplate();
  const city = await ensureCityForImport(dataset.normalized.city);

  const business = await prisma.business.upsert({
    where: {
      cityId_slug: {
        cityId: city.id,
        slug: dataset.normalized.business.slug,
      },
    },
    update: {
      templateId: template.id,
      name: dataset.normalized.business.name,
      category: "food",
      status: "active",
      plan: dataset.normalized.business.plan || "free",
      subscriptionStatus: dataset.normalized.business.subscriptionStatus || "trialing",
      addressLine1: dataset.normalized.business.addressLine1 || null,
      primaryColor: dataset.normalized.business.primaryColor || null,
      accentColor: dataset.normalized.business.accentColor || null,
      publicTitle: dataset.normalized.business.publicTitle || null,
      publicDescription: dataset.normalized.business.publicDescription || null,
      notesInternal: `Imported from legacy ordering ETL (${dataset.legacy.businessSlug})`,
    },
    create: {
      cityId: city.id,
      templateId: template.id,
      name: dataset.normalized.business.name,
      slug: dataset.normalized.business.slug,
      category: "food",
      status: "active",
      plan: dataset.normalized.business.plan || "free",
      subscriptionStatus: dataset.normalized.business.subscriptionStatus || "trialing",
      addressLine1: dataset.normalized.business.addressLine1 || null,
      primaryColor: dataset.normalized.business.primaryColor || null,
      accentColor: dataset.normalized.business.accentColor || null,
      publicTitle: dataset.normalized.business.publicTitle || null,
      publicDescription: dataset.normalized.business.publicDescription || null,
      notesInternal: `Imported from legacy ordering ETL (${dataset.legacy.businessSlug})`,
    },
  });

  await prisma.businessModule.upsert({
    where: {
      businessId_moduleCode: {
        businessId: business.id,
        moduleCode: "ordering",
      },
    },
    update: {
      active: true,
      settingsJson: dataset.selection.settings.eligible || undefined,
    },
    create: {
      businessId: business.id,
      moduleCode: "ordering",
      active: true,
      settingsJson: dataset.selection.settings.eligible || DEFAULT_V2_ORDERING_SETTINGS,
    },
  });

  return business;
}

async function importMenuAndCategories(businessId, dataset) {
  const importedCategories = [];
  const importedItems = [];

  for (const category of dataset.normalized.categories) {
    const categoryHasEligibleItems = dataset.normalized.menuItems.some(
      (item) =>
        item.categorySlug === category.slug &&
        dataset.selection.menuItems.eligible.includes(item.legacyId),
    );

    if (!categoryHasEligibleItems) {
      continue;
    }

    const importedCategory = await prisma.menuCategory.upsert({
      where: {
        businessId_slug: {
          businessId,
          slug: category.slug,
        },
      },
      update: {
        name: category.name,
        sortOrder: category.sortOrder,
        active: true,
      },
      create: {
        businessId,
        name: category.name,
        slug: category.slug,
        sortOrder: category.sortOrder,
        active: true,
      },
    });

    importedCategories.push(importedCategory);
  }

  const categoryBySlug = new Map(importedCategories.map((category) => [category.slug, category]));

  for (const item of dataset.normalized.menuItems) {
    if (!dataset.selection.menuItems.eligible.includes(item.legacyId)) {
      continue;
    }

    const category = categoryBySlug.get(item.categorySlug) || null;
    const importedItem = await prisma.menuItem.upsert({
      where: {
        businessId_slug: {
          businessId,
          slug: item.slug,
        },
      },
      update: {
        categoryId: category?.id || null,
        name: item.name,
        description: item.description || null,
        price: item.price,
        available: item.available,
        featured: item.featured,
        emoji: item.emoji || null,
        imageUrl: item.imageUrl || null,
        unit: item.unit || null,
        tagsJson: item.tags,
        allergensJson: item.allergens,
        sortOrder: item.sortOrder,
      },
      create: {
        businessId,
        categoryId: category?.id || null,
        name: item.name,
        slug: item.slug,
        description: item.description || null,
        price: item.price,
        available: item.available,
        featured: item.featured,
        emoji: item.emoji || null,
        imageUrl: item.imageUrl || null,
        unit: item.unit || null,
        tagsJson: item.tags,
        allergensJson: item.allergens,
        sortOrder: item.sortOrder,
      },
    });

    importedItems.push(importedItem);
  }

  return {
    categories: importedCategories,
    items: importedItems,
  };
}

async function importCustomersAndOrders(businessId, dataset, importedItems) {
  const customerIdByLegacyId = new Map();
  const menuItemIdByLegacyId = new Map();

  for (const item of dataset.normalized.menuItems) {
    const imported = importedItems.find((entry) => entry.slug === item.slug);
    if (imported) {
      menuItemIdByLegacyId.set(item.legacyId, imported.id);
    }
  }

  for (const customer of dataset.normalized.customers) {
    if (!dataset.selection.customers.eligible.includes(customer.legacyId)) {
      continue;
    }

    const importedCustomer = await prisma.customerProfile.upsert({
      where: {
        businessId_phone: {
          businessId,
          phone: customer.phone,
        },
      },
      update: {
        name: customer.name || null,
        points: customer.points,
        totalOrders: customer.totalOrders,
        completedOrders: customer.completedOrders,
        lastOrderAt: customer.lastOrderAt ? new Date(customer.lastOrderAt) : null,
      },
      create: {
        businessId,
        name: customer.name || null,
        phone: customer.phone,
        points: customer.points,
        totalOrders: customer.totalOrders,
        completedOrders: customer.completedOrders,
        lastOrderAt: customer.lastOrderAt ? new Date(customer.lastOrderAt) : null,
      },
    });

    customerIdByLegacyId.set(customer.legacyId, importedCustomer.id);
  }

  const importedOrders = [];

  for (const order of dataset.normalized.orders) {
    if (!dataset.selection.orders.eligible.includes(order.legacyId)) {
      continue;
    }

    const marker = `[legacy-etl:${order.legacyId}]`;
    const existing = await prisma.order.findFirst({
      where: {
        businessId,
        notes: {
          contains: marker,
        },
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      importedOrders.push(existing);
      continue;
    }

    const customerProfileId = dataset.normalized.customers.find(
      (customer) => customer.phone === order.customerPhone,
    )?.legacyId
      ? customerIdByLegacyId.get(
          dataset.normalized.customers.find((customer) => customer.phone === order.customerPhone)
            .legacyId,
        ) || null
      : null;

    const importedOrder = await prisma.order.create({
      data: {
        businessId,
        customerProfileId,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        status: order.status,
        fulfillmentType: order.fulfillmentType,
        pickupAt: order.pickupAt ? new Date(order.pickupAt) : null,
        notes: order.notes ? `${order.notes}\n${marker}` : marker,
        subtotal: order.grandTotal,
        discountTotal: 0,
        serviceFee: 0,
        deliveryFee: 0,
        grandTotal: order.grandTotal,
        paymentStatus: order.status === "completed" ? "paid" : "pending",
        source: order.source,
        loyaltyAwarded: order.loyaltyAwarded,
        items: {
          create: order.items.map((item) => ({
            menuItemId: item.legacyMenuItemId
              ? menuItemIdByLegacyId.get(item.legacyMenuItemId) || null
              : null,
            nameSnapshot: item.name,
            priceSnapshot: item.price,
            qty: item.qty,
            notes: item.notes || null,
            lineTotal: item.lineTotal,
          })),
        },
      },
      select: {
        id: true,
      },
    });

    importedOrders.push(importedOrder);
  }

  return {
    customersImported: customerIdByLegacyId.size,
    ordersImported: importedOrders.length,
  };
}

async function runImport(options) {
  const businesses = await listLegacyBusinesses(options.businessSlug);

  if (businesses.length === 0) {
    throw new Error("No legacy ordering business found for import");
  }

  const report = [];

  for (const entry of businesses) {
    const dataset = await buildNormalizedDataset(entry);

    if (!allowMigrationTarget(entry, options)) {
      report.push({
        businessSlug: entry.business.slug,
        businessStatus: entry.classification.kind,
        imported: false,
        skipped: true,
        reason: entry.classification.kind,
        selection: dataset.legacy.selection,
      });
      continue;
    }

    if (
      dataset.selection.menuItems.eligible.length === 0 &&
      dataset.selection.customers.eligible.length === 0 &&
      dataset.selection.orders.eligible.length === 0 &&
      dataset.selection.settings.eligible == null
    ) {
      report.push({
        businessSlug: entry.business.slug,
        businessStatus: entry.classification.kind,
        imported: false,
        skipped: true,
        reason: "no_eligible_records",
        selection: dataset.legacy.selection,
      });
      continue;
    }

    const business = await ensureImportedBusiness(dataset);
    const importedMenu = await importMenuAndCategories(business.id, dataset);
    const importedRuntime = await importCustomersAndOrders(
      business.id,
      dataset,
      importedMenu.items,
    );

    report.push({
      businessSlug: entry.business.slug,
      businessStatus: entry.classification.kind,
      imported: true,
      skipped: false,
      importedCounts: {
        categories: importedMenu.categories.length,
        menuItems: importedMenu.items.length,
        customers: importedRuntime.customersImported,
        orders: importedRuntime.ordersImported,
        settings: dataset.selection.settings.eligible != null ? 1 : 0,
      },
      rejected: dataset.selection,
    });
  }

  logStep("import report", report);
}

async function main() {
  const options = parseArgs(process.argv);

  if (!legacySourceAvailable) {
    logStep(
      "legacy source removed",
      "La V1 non e piu presente nel tree corrente del repo. Questo tool resta solo come riferimento storico ETL/audit.",
    );
    return;
  }

  await legacyDb.connect();

  switch (options.command) {
    case "inspect":
      await runInspect(options);
      break;
    case "compare":
      await runCompare(options);
      break;
    case "export":
      await runExport(options);
      break;
    case "import":
      await runImport(options);
      break;
    default:
      throw new Error(`Unknown command: ${options.command}`);
  }
}

main()
  .catch((error) => {
    console.error("[etl-ordering] failure");
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => {});

    if (legacySourceAvailable) {
      await require("../legacy/backend/node_modules/mongoose")
        .disconnect()
        .catch(() => {});
    }
  });

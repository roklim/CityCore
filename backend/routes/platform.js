"use strict";

const router = require("express").Router();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const {
  Business,
  City,
  CityRegistry,
  Customer,
  MenuItem,
  Order,
  StoreSettings,
  User,
} = require("../db");
const { requireGlobalAdmin } = require("../middleware/auth");
const { normalizeSlug } = require("../middleware/business");
const asyncHandler = require("../middleware/asyncHandler");

router.use(requireGlobalAdmin);

const BUSINESS_TYPES = [
  "pizzeria",
  "sushi",
  "restaurant",
  "bar",
  "bike_rental",
  "service",
  "custom",
];
const PLANS = ["free", "pro", "premium"];
const SUBSCRIPTION_STATUSES = ["trialing", "active", "past_due", "cancelled"];
const BUSINESS_USER_ROLES = ["owner", "admin", "staff"];

// Template leggeri per rendere subito provabile un nuovo business senza creare
// un gestionale complesso o richiedere seed manuali su Mongo.
const MENU_TEMPLATES = {
  pizzeria: [
    ["Margherita", "Pomodoro, mozzarella e basilico", 8, "pizze-tonde", "🍕", "pezzo", true],
    ["Diavola", "Pomodoro, mozzarella e salame piccante", 10, "pizze-tonde", "🌶️", "pezzo", false],
    ["Trancio Margherita", "Pizza al taglio calda dal banco", 4, "pizza-teglia", "🍕", "trancio", true],
    ["Suppli", "Riso, pomodoro e mozzarella filante", 2.5, "fritti", "🧆", "pezzo", false],
    ["Coca Cola", "Lattina 33cl", 2.5, "bevande", "🥤", "lattina", false],
  ],
  sushi: [
    ["Uramaki Salmone", "8 pezzi con salmone e avocado", 9.5, "uramaki", "🍣", "porzione", true],
    ["Nigiri Mix", "6 pezzi assortiti", 8, "nigiri", "🍱", "porzione", false],
    ["Gyoza", "Ravioli alla piastra", 5, "antipasti", "🥟", "porzione", false],
    ["Edamame", "Baccelli di soia al sale", 4, "antipasti", "🫛", "porzione", false],
    ["Acqua", "Bottiglia 50cl", 1.5, "bevande", "💧", "bottiglia", false],
  ],
  restaurant: [
    ["Piatto del giorno", "Speciale preparato dalla cucina", 10, "piatti", "🍽️", "porzione", true],
    ["Panino classico", "Pane artigianale, farcitura e contorno", 8, "panini", "🥪", "pezzo", false],
    ["Patatine", "Porzione croccante", 3.5, "contorni", "🍟", "porzione", false],
    ["Dolce della casa", "Disponibilita del giorno", 4.5, "dolci", "🍰", "pezzo", false],
  ],
  bar: [
    ["Aperitivo", "Drink e snack salati", 8, "aperitivi", "🍹", "pezzo", true],
    ["Tagliere", "Selezione salata da condividere", 12, "aperitivi", "🧀", "porzione", false],
    ["Caffe", "Espresso al banco", 1.2, "caffetteria", "☕", "tazzina", false],
    ["Acqua", "Bottiglia 50cl", 1.5, "bevande", "💧", "bottiglia", false],
  ],
  bike_rental: [
    ["City bike", "Noleggio bici urbana", 12, "bici", "🚲", "giorno", true],
    ["E-bike", "Noleggio bici elettrica", 24, "bici", "🔋", "giorno", true],
    ["Casco", "Accessorio sicurezza", 3, "accessori", "🪖", "giorno", false],
    ["Seggiolino", "Accessorio bambino", 5, "accessori", "💺", "giorno", false],
  ],
  service: [
    ["Consulenza base", "Appuntamento introduttivo", 30, "servizi", "📅", "sessione", true],
    ["Servizio standard", "Intervento prenotabile", 50, "servizi", "🛠️", "sessione", false],
    ["Extra rapido", "Priorita sulla prenotazione", 15, "extra", "⚡", "pezzo", false],
  ],
  custom: [
    ["Prodotto demo", "Voce modificabile dall'admin", 9, "prodotti", "✨", "pezzo", true],
    ["Extra", "Aggiunta o servizio opzionale", 3, "extra", "➕", "pezzo", false],
  ],
};

// Le aggregazioni Mongo restituiscono array; questa utility li rende facili da
// unire con la lista business senza cicli annidati.
function asBusinessIdMap(rows) {
  return new Map(rows.map((row) => [String(row._id), row]));
}

// Vista sicura degli utenti da mostrare nel pannello globale.
function publicUser(user) {
  if (!user) return null;
  return {
    _id: user._id,
    businessId: user.businessId,
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
  };
}

function publicCity(city) {
  if (!city) return null;
  return {
    _id: city._id,
    registryId: city.registryId,
    name: city.name,
    slug: city.slug,
    province: city.province,
    region: city.region,
    country: city.country,
    lat: city.lat,
    lng: city.lng,
    active: city.active,
    status: city.status || "active",
    heroTitle: city.heroTitle || "",
    heroDescription: city.heroDescription || "",
    sortOrder: city.sortOrder || 0,
    enabledModules: city.enabledModules || {},
  };
}

function publicRegistryCity(city, activeCity = null) {
  if (!city) return null;
  return {
    _id: city._id,
    name: city.name,
    slug: city.slug,
    provinceCode: city.provinceCode,
    provinceName: city.provinceName,
    regionCode: city.regionCode,
    regionName: city.regionName,
    country: city.country,
    istatCode: city.istatCode,
    cadastralCode: city.cadastralCode,
    activeMunicipality: city.activeMunicipality,
    source: city.source,
    sourceVersion: city.sourceVersion,
    lat: city.lat,
    lng: city.lng,
    activeCity: publicCity(activeCity),
  };
}

function escapeRegex(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function locationFromCity(city, current = {}) {
  return {
    cityName: city.name,
    citySlug: city.slug,
    province: city.province || "",
    region: city.region || "",
    country: city.country || "IT",
    address: String(current.address || "").trim(),
    lat: city.lat,
    lng: city.lng,
  };
}

async function resolveCity(body = {}) {
  const cityId = body.cityId || body.location?.cityId;
  const citySlug = normalizeSlug(body.citySlug || body.location?.citySlug || "");
  const base = { active: true, status: { $ne: "disabled" } };
  const query = cityId && mongoose.Types.ObjectId.isValid(cityId)
    ? { ...base, _id: cityId }
    : citySlug
      ? { ...base, slug: citySlug }
      : { ...base, slug: "cagli" };
  return City.findOne(query).lean();
}

async function applyVerifiedCity(payload, body = {}) {
  const city = await resolveCity(body);
  if (!city) {
    throw Object.assign(new Error("Seleziona una citta verificata"), { status: 400 });
  }
  payload.cityId = city._id;
  payload.location = locationFromCity(city, body.location);
  return payload;
}

async function resolveRegistryCity(body = {}) {
  const registryId = body.registryId || body.cityRegistryId;
  const istatCode = String(body.istatCode || "").trim();
  const slug = normalizeSlug(body.slug || body.citySlug || "");
  const provinceCode = String(body.provinceCode || "").trim().toUpperCase();

  const filters = [];
  if (registryId && mongoose.Types.ObjectId.isValid(registryId)) {
    filters.push({ _id: registryId });
  }
  if (istatCode) filters.push({ istatCode });
  if (slug && provinceCode) filters.push({ slug, provinceCode });
  if (slug) filters.push({ slug });

  if (filters.length === 0) return null;
  return CityRegistry.findOne({
    activeMunicipality: true,
    $or: filters,
  }).lean();
}

function cityPayloadFromRegistry(registryCity, body = {}) {
  const status = ["active", "coming_soon", "disabled"].includes(body.status)
    ? body.status
    : "active";
  return {
    registryId: registryCity._id,
    name: registryCity.name,
    slug: normalizeSlug(body.citySlug || body.slug || registryCity.slug),
    province: registryCity.provinceCode || "",
    region: registryCity.regionName || "",
    country: registryCity.country || "IT",
    provider: "registry",
    providerPlaceId: registryCity.istatCode || String(registryCity._id),
    lat: registryCity.lat,
    lng: registryCity.lng,
    active: body.active === undefined ? status !== "disabled" : body.active !== false,
    status,
    heroTitle: String(body.heroTitle || "").trim(),
    heroDescription: String(body.heroDescription || "").trim(),
    sortOrder: Number(body.sortOrder) || 0,
    lastVerifiedAt: new Date(),
  };
}

async function searchRegistryCities(req, res) {
  const q = String(req.query.q || "").trim();
  const normalized = normalizeSlug(q);
  const filter = { activeMunicipality: true };

  if (q) {
    const safe = escapeRegex(q.toLowerCase());
    const normalizedSafe = escapeRegex(normalized);
    filter.$or = [
      { searchText: new RegExp(safe, "i") },
      { slug: new RegExp(normalizedSafe, "i") },
      { name: new RegExp(escapeRegex(q), "i") },
      { provinceCode: new RegExp(escapeRegex(q), "i") },
      { provinceName: new RegExp(escapeRegex(q), "i") },
      { regionName: new RegExp(escapeRegex(q), "i") },
      { istatCode: new RegExp(escapeRegex(q), "i") },
    ];
  }

  const registryCities = await CityRegistry.find(filter)
    .sort({ name: 1, provinceCode: 1 })
    .limit(q ? 30 : 12)
    .lean();
  const registryIds = registryCities.map((city) => city._id);
  const activeCities = await City.find({ registryId: { $in: registryIds } }).lean();
  const activeByRegistry = new Map(
    activeCities.map((city) => [String(city.registryId), city]),
  );

  res.json({
    cities: registryCities.map((city) =>
      publicRegistryCity(city, activeByRegistry.get(String(city._id))),
    ),
  });
}

// Crea o aggiorna un utente business. L'email e' unica dentro il tenant, quindi
// la stessa email puo' essere riusata su business diversi se serve.
async function upsertBusinessUser(businessId, body = {}, fallbackRole = "admin") {
  const email = String(body.email || "").trim().toLowerCase();
  const name = String(body.name || "").trim();
  const role = BUSINESS_USER_ROLES.includes(body.role) ? body.role : fallbackRole;
  const password = String(body.password || "").trim();

  if (!email) throw Object.assign(new Error("Email utente obbligatoria"), { status: 400 });

  const update = {
    businessId,
    email,
    name,
    role,
    active: body.active !== false,
  };

  if (password) {
    if (password.length < 8) {
      throw Object.assign(new Error("Password: minimo 8 caratteri"), { status: 400 });
    }
    update.passwordHash = await bcrypt.hash(password, 10);
  }

  const existing = await User.findOne({ businessId, email });
  if (!existing && !password) {
    throw Object.assign(new Error("Password obbligatoria per nuovo utente"), {
      status: 400,
    });
  }

  const user = await User.findOneAndUpdate(
    { businessId, email },
    { $set: update },
    { returnDocument: "after", upsert: true, setDefaultsOnInsert: true },
  );

  return user;
}

// Traduce il form del frontend nel documento Business canonico.
function toBusinessPayload(body = {}) {
  const name = String(body.name || "").trim();
  const slug = normalizeSlug(body.slug || name);

  const payload = {
    name,
    slug,
    type: BUSINESS_TYPES.includes(body.type) ? body.type : "custom",
    plan: PLANS.includes(body.plan) ? body.plan : "free",
    subscriptionStatus: SUBSCRIPTION_STATUSES.includes(body.subscriptionStatus)
      ? body.subscriptionStatus
      : "trialing",
    branding: {
      publicName: String(body.branding?.publicName || name).trim(),
      logoUrl: String(body.branding?.logoUrl || "").trim(),
      coverImageUrl: String(body.branding?.coverImageUrl || "").trim(),
      primaryColor: String(body.branding?.primaryColor || "#2C5F2E").trim(),
      accentColor: String(body.branding?.accentColor || "#C0392B").trim(),
    },
    deployment: {
      publicUrl: String(body.deployment?.publicUrl || "").trim(),
      vercelProjectName: String(
        body.deployment?.vercelProjectName || slug,
      ).trim(),
      apiBaseUrl: String(body.deployment?.apiBaseUrl || "").trim(),
      notes: String(body.deployment?.notes || "").trim(),
    },
    features: {
      ordering: body.features?.ordering !== false,
      booking: body.features?.booking === true,
      rental: body.features?.rental === true,
      customPizza: body.features?.customPizza === true,
      coupons: body.features?.coupons !== false,
      customerAccounts: body.features?.customerAccounts !== false,
      analytics: body.features?.analytics !== false,
    },
    settings: {
      timezone: String(body.settings?.timezone || "Europe/Rome").trim(),
      currency: String(body.settings?.currency || "EUR").trim(),
      locale: String(body.settings?.locale || "it-IT").trim(),
      publicMessage: String(body.settings?.publicMessage || "").trim(),
      openingHours: String(
        body.settings?.openingHours || "Mar-Dom 18:00-22:30",
      ).trim(),
      openingDays: Array.isArray(body.settings?.openingDays)
        ? body.settings.openingDays
        : ["mar", "mer", "gio", "ven", "sab", "dom"],
      openingTimeStart: String(body.settings?.openingTimeStart || "18:00").trim(),
      openingTimeEnd: String(body.settings?.openingTimeEnd || "22:30").trim(),
    },
  };

  return payload;
}

// Per gli update accettiamo solo gruppi inviati esplicitamente, cosi' una patch
// parziale non sovrascrive feature/branding/settings non presenti nel payload.
function buildBusinessUpdate(body = {}) {
  const payload = toBusinessPayload(body);
  const update = {};

  for (const key of ["name", "slug", "type", "plan", "subscriptionStatus"]) {
    if (body[key] !== undefined) update[key] = payload[key];
  }

  for (const group of ["branding", "deployment", "features", "settings"]) {
    if (body[group] !== undefined) update[group] = payload[group];
  }

  return update;
}

router.get(
  "/cities",
  asyncHandler(async (req, res) => {
    const cities = await City.find()
      .sort({ sortOrder: 1, name: 1 })
      .lean();
    res.json({ cities: cities.map(publicCity) });
  }),
);

router.get(
  "/cities/search",
  asyncHandler(async (req, res) => {
    const q = String(req.query.q || "").trim();
    const filter = { active: true, status: { $ne: "disabled" } };
    if (q) {
      const safe = escapeRegex(q);
      filter.$or = [
        { name: new RegExp(safe, "i") },
        { slug: new RegExp(escapeRegex(normalizeSlug(q)), "i") },
        { province: new RegExp(safe, "i") },
        { region: new RegExp(safe, "i") },
      ];
    }
    const cities = await City.find(filter)
      .sort({ sortOrder: 1, name: 1 })
      .limit(20)
      .lean();
    res.json({ cities: cities.map(publicCity) });
  }),
);

router.get(
  "/registry/cities",
  asyncHandler(searchRegistryCities),
);

router.get(
  "/registry/cities/search",
  asyncHandler(searchRegistryCities),
);

router.post(
  "/cities/activate",
  asyncHandler(async (req, res) => {
    const registryCity = await resolveRegistryCity(req.body);
    if (!registryCity) {
      return res.status(404).json({
        error: "Comune non trovato nel registro nazionale",
      });
    }

    const payload = cityPayloadFromRegistry(registryCity, req.body);
    if (!payload.slug) return res.status(400).json({ error: "Slug citta non valido" });

    const slugOwner = await City.findOne({
      slug: payload.slug,
      registryId: { $ne: registryCity._id },
    }).lean();
    if (slugOwner) {
      return res.status(409).json({
        error: "Slug citta gia usato da un altro comune attivo",
      });
    }

    const city = await City.findOneAndUpdate(
      { registryId: registryCity._id },
      { $set: payload },
      {
        returnDocument: "after",
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    );

    res.status(201).json({ city: publicCity(city) });
  }),
);

router.patch(
  "/cities/:id/status",
  asyncHandler(async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "ID citta non valido" });
    }

    const status = ["active", "coming_soon", "disabled"].includes(req.body.status)
      ? req.body.status
      : "";
    if (!status) return res.status(400).json({ error: "Stato citta non valido" });

    const city = await City.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          status,
          active: req.body.active === undefined ? status !== "disabled" : req.body.active !== false,
          heroTitle: String(req.body.heroTitle || "").trim(),
          heroDescription: String(req.body.heroDescription || "").trim(),
          sortOrder: Number(req.body.sortOrder) || 0,
          lastVerifiedAt: new Date(),
        },
      },
      { returnDocument: "after", runValidators: true },
    );

    if (!city) return res.status(404).json({ error: "Citta non trovata" });
    res.json({ city: publicCity(city) });
  }),
);

// Seed per nuovi tenant: crea prodotti demo solo se il business non ha ancora
// articoli. Rende comoda la prova immediata su una nuova app Vercel.
async function seedBusinessMenu(business) {
  const existing = await MenuItem.countDocuments({ businessId: business._id });
  if (existing > 0) return;

  const rows = MENU_TEMPLATES[business.type] || MENU_TEMPLATES.custom;
  await MenuItem.insertMany(
    rows.map(([name, description, price, category, emoji, unit, featured], index) => ({
      businessId: business._id,
      module: business.features?.rental ? "rental" : "ordering",
      type: business.features?.rental ? "rental_item" : "product",
      name,
      description,
      price,
      category,
      emoji,
      unit,
      featured,
      sortOrder: (index + 1) * 10,
      available: true,
    })),
  );
}

router.get(
  "/businesses",
  asyncHandler(async (req, res) => {
    // Dashboard globale: aggrega ordini, prodotti, clienti e owner per tutti i
    // tenant. Questa route e' protetta da requireGlobalAdmin a livello router.
    const businesses = await Business.find().sort({ createdAt: -1 }).lean();
    const businessIds = businesses.map((business) => business._id);
    const cityIds = businesses.map((business) => business.cityId).filter(Boolean);

    const [orders, menuItems, customers, lastOrders, owners, cities] = await Promise.all([
      Order.aggregate([
        { $match: { businessId: { $in: businessIds } } },
        {
          $group: {
            _id: "$businessId",
            orders: { $sum: 1 },
            revenue: {
              $sum: {
                $cond: [{ $eq: ["$status", "cancelled"] }, 0, "$total"],
              },
            },
            preparing: {
              $sum: { $cond: [{ $eq: ["$status", "preparing"] }, 1, 0] },
            },
            ready: {
              $sum: { $cond: [{ $eq: ["$status", "ready"] }, 1, 0] },
            },
            done: {
              $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] },
            },
          },
        },
      ]),
      MenuItem.aggregate([
        { $match: { businessId: { $in: businessIds } } },
        {
          $group: {
            _id: "$businessId",
            products: { $sum: 1 },
            availableProducts: {
              $sum: { $cond: [{ $eq: ["$available", true] }, 1, 0] },
            },
          },
        },
      ]),
      Customer.aggregate([
        { $match: { businessId: { $in: businessIds } } },
        { $group: { _id: "$businessId", customers: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: { businessId: { $in: businessIds } } },
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: "$businessId",
            lastOrderAt: { $first: "$createdAt" },
            lastOrderTotal: { $first: "$total" },
          },
        },
      ]),
      User.find({ businessId: { $in: businessIds }, role: "owner" })
        .sort({ createdAt: 1 })
        .lean(),
      City.find({ _id: { $in: cityIds } }).lean(),
    ]);

    const ordersByBusiness = asBusinessIdMap(orders);
    const menuByBusiness = asBusinessIdMap(menuItems);
    const customersByBusiness = asBusinessIdMap(customers);
    const lastOrdersByBusiness = asBusinessIdMap(lastOrders);
    const ownersByBusiness = new Map(
      owners.map((owner) => [String(owner.businessId), owner]),
    );
    const citiesById = new Map(cities.map((city) => [String(city._id), city]));

    res.json({
      businesses: businesses.map((business) => {
        const key = String(business._id);
        const orderStats = ordersByBusiness.get(key) || {};
        const menuStats = menuByBusiness.get(key) || {};
        const customerStats = customersByBusiness.get(key) || {};
        const lastOrder = lastOrdersByBusiness.get(key) || {};
        const owner = ownersByBusiness.get(key);
        const city = business.cityId ? citiesById.get(String(business.cityId)) : null;

        return {
          ...business,
          city: publicCity(city) || null,
          owner: publicUser(owner),
          metrics: {
            orders: orderStats.orders || 0,
            revenue: Number((orderStats.revenue || 0).toFixed(2)),
            pending: (orderStats.preparing || 0) + (orderStats.ready || 0),
            done: orderStats.done || 0,
            products: menuStats.products || 0,
            availableProducts: menuStats.availableProducts || 0,
            customers: customerStats.customers || 0,
            lastOrderAt: lastOrder.lastOrderAt || null,
            lastOrderTotal: lastOrder.lastOrderTotal || 0,
          },
        };
      }),
    });
  }),
);

router.post(
  "/businesses",
  asyncHandler(async (req, res) => {
    const payload = await applyVerifiedCity(toBusinessPayload(req.body), req.body);
    if (!payload.name) return res.status(400).json({ error: "Nome obbligatorio" });
    if (!payload.slug) return res.status(400).json({ error: "Slug obbligatorio" });
    const duplicate = await Business.findOne({
      slug: payload.slug,
      "location.citySlug": payload.location.citySlug,
    }).lean();
    if (duplicate) {
      return res
        .status(409)
        .json({ error: "Slug business gia usato in questa citta" });
    }

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    try {
      if (req.body?.owner?.email && !req.body.owner.password) {
        return res
          .status(400)
          .json({ error: "Password owner obbligatoria per nuovo business" });
      }
      if (req.body?.owner?.email && String(req.body.owner.password).trim().length < 8) {
        return res
          .status(400)
          .json({ error: "Password owner: minimo 8 caratteri" });
      }

      // Creiamo prima il tenant e poi le risorse collegate. L'owner viene
      // validato prima per evitare business creati con credenziali incomplete.
      const business = await Business.create({ ...payload, trialEndsAt });
      await StoreSettings.create({
        businessId: business._id,
        openingHours: payload.settings.openingHours,
        openingDays: payload.settings.openingDays,
        openingTimeStart: payload.settings.openingTimeStart,
        openingTimeEnd: payload.settings.openingTimeEnd,
        customerMessage: payload.settings.publicMessage,
      });

      if (req.body?.owner?.email) {
        const owner = await upsertBusinessUser(
          business._id,
          { ...req.body.owner, role: "owner" },
          "owner",
        );
        business.ownerUserId = owner._id;
        await business.save();
      }

      if (req.body?.seedTemplate !== false) {
        await seedBusinessMenu(business);
      }

      res.status(201).json(business);
    } catch (error) {
      if (error.status) return res.status(error.status).json({ error: error.message });
      if (error.code === 11000) {
        return res
          .status(409)
          .json({ error: "Slug business gia utilizzato. Verifica gli indici Mongo legacy." });
      }
      throw error;
    }
  }),
);

router.put(
  "/businesses/:id",
  asyncHandler(async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "ID business non valido" });
    }

    const update = buildBusinessUpdate(req.body);
    if (
      req.body.cityId !== undefined ||
      req.body.citySlug !== undefined ||
      req.body.location !== undefined
    ) {
      await applyVerifiedCity(update, req.body);
    }
    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: "Nessuna modifica valida" });
    }
    if (update.slug || update.location) {
      const current = await Business.findById(req.params.id).lean();
      if (!current) return res.status(404).json({ error: "Business non trovato" });
      const nextSlug = update.slug || current.slug;
      const nextCitySlug =
        update.location?.citySlug || current.location?.citySlug || "cagli";
      const duplicate = await Business.findOne({
        _id: { $ne: current._id },
        slug: nextSlug,
        "location.citySlug": nextCitySlug,
      }).lean();
      if (duplicate) {
        return res
          .status(409)
          .json({ error: "Slug business gia usato in questa citta" });
      }
    }

    try {
      const business = await Business.findByIdAndUpdate(
        req.params.id,
        { $set: update },
        { returnDocument: "after", runValidators: true },
      );

      if (!business) {
        return res.status(404).json({ error: "Business non trovato" });
      }

      if (update.settings) {
        await StoreSettings.findOneAndUpdate(
          { businessId: business._id },
          {
            $set: {
              openingHours: update.settings.openingHours,
              openingDays: update.settings.openingDays,
              openingTimeStart: update.settings.openingTimeStart,
              openingTimeEnd: update.settings.openingTimeEnd,
              customerMessage: update.settings.publicMessage,
            },
            $setOnInsert: { businessId: business._id },
          },
          { upsert: true, setDefaultsOnInsert: true },
        );
      }

      // L'owner puo' essere creato o aggiornato mentre si modifica il business.
      // Se la password e' vuota e l'utente esiste gia', resta invariata.
      if (req.body?.owner?.email) {
        const owner = await upsertBusinessUser(
          business._id,
          { ...req.body.owner, role: "owner" },
          "owner",
        );
        business.ownerUserId = owner._id;
        await business.save();
      }

      res.json(business);
    } catch (error) {
      if (error.status) return res.status(error.status).json({ error: error.message });
      if (error.code === 11000) {
        return res
          .status(409)
          .json({ error: "Slug business gia utilizzato. Verifica gli indici Mongo legacy." });
      }
      throw error;
    }
  }),
);

router.get(
  "/businesses/:id/users",
  asyncHandler(async (req, res) => {
    // Lista utenti tenant per consentire al global admin di vedere chi puo'
    // accedere a ogni app dedicata.
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "ID business non valido" });
    }

    const users = await User.find({ businessId: req.params.id })
      .sort({ role: 1, createdAt: 1 })
      .lean();

    res.json({ users: users.map(publicUser) });
  }),
);

router.post(
  "/businesses/:id/users",
  asyncHandler(async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "ID business non valido" });
    }

    const business = await Business.findById(req.params.id);
    if (!business) return res.status(404).json({ error: "Business non trovato" });

    try {
      const user = await upsertBusinessUser(business._id, req.body, "admin");
      if (user.role === "owner" && !business.ownerUserId) {
        business.ownerUserId = user._id;
        await business.save();
      }
      res.status(201).json(publicUser(user));
    } catch (error) {
      if (error.status) return res.status(error.status).json({ error: error.message });
      if (error.code === 11000) {
        return res.status(409).json({ error: "Email gia usata per questo business" });
      }
      throw error;
    }
  }),
);

router.put(
  "/users/:userId",
  asyncHandler(async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
      return res.status(400).json({ error: "ID utente non valido" });
    }

    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: "Utente non trovato" });
    if (user.role === "global_admin") {
      return res.status(403).json({ error: "Modifica global admin non consentita qui" });
    }

    // Aggiornamento granulare: i campi non inviati non vengono toccati.
    const update = {};
    if (req.body.name !== undefined) update.name = String(req.body.name || "").trim();
    if (req.body.email !== undefined) {
      update.email = String(req.body.email || "").trim().toLowerCase();
      if (!update.email) return res.status(400).json({ error: "Email obbligatoria" });
    }
    if (req.body.role !== undefined) {
      if (!BUSINESS_USER_ROLES.includes(req.body.role)) {
        return res.status(400).json({ error: "Ruolo non valido" });
      }
      update.role = req.body.role;
    }
    if (req.body.active !== undefined) update.active = req.body.active !== false;
    if (req.body.password) {
      if (String(req.body.password).length < 8) {
        return res.status(400).json({ error: "Password: minimo 8 caratteri" });
      }
      update.passwordHash = await bcrypt.hash(String(req.body.password), 10);
    }

    try {
      const saved = await User.findByIdAndUpdate(
        user._id,
        { $set: update },
        { returnDocument: "after", runValidators: true },
      );
      res.json(publicUser(saved));
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({ error: "Email gia usata per questo business" });
      }
      throw error;
    }
  }),
);

module.exports = router;

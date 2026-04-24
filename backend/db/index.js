"use strict";

const mongoose = require("mongoose");
const config = require("../config");

let isConnected = false;
const DEFAULT_BUSINESS_SLUG = config.business.defaultSlug || "mucho-gusto";
const DEFAULT_CITY_SLUG = "cagli";

function localSlugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Mantiene una sola connessione Mongoose per processo Node. Su ambienti cloud
// evita riconnessioni inutili quando il server viene risvegliato o riavviato.
async function connect() {
  if (isConnected) return;

  mongoose.set("strictQuery", true);

  mongoose.connection.on("connected", () =>
    console.log("[db] MongoDB connesso"),
  );
  mongoose.connection.on("error", (err) =>
    console.error("[db] Errore:", err.message),
  );
  mongoose.connection.on("disconnected", () =>
    console.warn("[db] Disconnesso"),
  );

  await mongoose.connect(config.mongo.uri, {
    serverSelectionTimeoutMS: 8000,
  });

  isConnected = true;
}

// Registro nazionale/comunale importato da fonti autorevoli. Questo livello non
// significa "citta attiva nell'app": e' solo la fonte verificata da cui il global
// admin puo' abilitare nuovi mercati locali senza inventare luoghi a mano.
const cityRegistrySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },
    provinceCode: { type: String, default: "", trim: true, uppercase: true },
    provinceName: { type: String, default: "", trim: true, maxlength: 120 },
    regionCode: { type: String, default: "", trim: true },
    regionName: { type: String, default: "", trim: true, maxlength: 120 },
    country: { type: String, default: "IT", trim: true, uppercase: true },
    istatCode: { type: String, default: "", trim: true },
    cadastralCode: { type: String, default: "", trim: true, uppercase: true },
    activeMunicipality: { type: Boolean, default: true },
    source: {
      type: String,
      enum: ["istat", "openapi", "manual_seed", "csv_import", "json_import"],
      default: "manual_seed",
    },
    sourceVersion: { type: String, default: "", trim: true },
    providerPlaceId: { type: String, default: "", trim: true },
    lat: { type: Number },
    lng: { type: Number },
    lastSyncedAt: { type: Date },
    searchText: { type: String, default: "", trim: true, lowercase: true },
  },
  { timestamps: true },
);

// Citta/mercati abilitati nella piattaforma. Sono un sottoinsieme editoriale e
// operativo del registro: solo questi appaiono nella home pubblica.
const citySchema = new mongoose.Schema(
  {
    registryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CityRegistry",
    },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },
    province: { type: String, default: "", trim: true, maxlength: 20 },
    region: { type: String, default: "", trim: true, maxlength: 80 },
    country: { type: String, default: "IT", trim: true, uppercase: true },
    provider: {
      type: String,
      enum: ["istat", "google", "osm", "manual_seed", "registry"],
      default: "registry",
    },
    providerPlaceId: { type: String, default: "", trim: true },
    lat: { type: Number },
    lng: { type: Number },
    active: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ["active", "coming_soon", "disabled"],
      default: "active",
    },
    heroTitle: { type: String, default: "", trim: true, maxlength: 160 },
    heroDescription: { type: String, default: "", trim: true, maxlength: 420 },
    sortOrder: { type: Number, default: 0 },
    enabledModules: {
      ordering: { type: Boolean, default: true },
      directory: { type: Boolean, default: true },
      events: { type: Boolean, default: false },
      reports: { type: Boolean, default: false },
      rentals: { type: Boolean, default: true },
    },
    lastVerifiedAt: { type: Date },
  },
  { timestamps: true },
);

// Business e' il tenant principale della piattaforma: ogni pizzeria/attivita
// ha il proprio slug, branding, piano, feature abilitate e impostazioni base.
const businessSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },
    type: {
      type: String,
      enum: [
        "pizzeria",
        "sushi",
        "restaurant",
        "bar",
        "bike_rental",
        "service",
        "custom",
      ],
      default: "pizzeria",
    },
    cityId: { type: mongoose.Schema.Types.ObjectId, ref: "City", index: true },
    location: {
      cityName: { type: String, default: "Cagli", trim: true },
      citySlug: { type: String, default: DEFAULT_CITY_SLUG, trim: true, lowercase: true },
      province: { type: String, default: "PU", trim: true },
      region: { type: String, default: "Marche", trim: true },
      country: { type: String, default: "IT", trim: true, uppercase: true },
      address: { type: String, default: "", trim: true, maxlength: 240 },
      lat: { type: Number },
      lng: { type: Number },
    },
    ownerUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    plan: { type: String, enum: ["free", "pro", "premium"], default: "free" },
    subscriptionStatus: {
      type: String,
      enum: ["trialing", "active", "past_due", "cancelled"],
      default: "trialing",
    },
    trialEndsAt: { type: Date },
    branding: {
      logoUrl: { type: String, default: "" },
      coverImageUrl: { type: String, default: "" },
      primaryColor: { type: String, default: "#2C5F2E" },
      accentColor: { type: String, default: "#C0392B" },
      publicName: { type: String, default: "" },
    },
    deployment: {
      publicUrl: { type: String, default: "", trim: true },
      vercelProjectName: { type: String, default: "", trim: true },
      apiBaseUrl: { type: String, default: "", trim: true },
      notes: { type: String, default: "", trim: true, maxlength: 500 },
    },
    features: {
      ordering: { type: Boolean, default: true },
      booking: { type: Boolean, default: false },
      rental: { type: Boolean, default: false },
      customPizza: { type: Boolean, default: true },
      coupons: { type: Boolean, default: true },
      customerAccounts: { type: Boolean, default: true },
      analytics: { type: Boolean, default: true },
    },
    settings: {
      timezone: { type: String, default: "Europe/Rome" },
      currency: { type: String, default: "EUR" },
      locale: { type: String, default: "it-IT" },
      publicMessage: { type: String, default: "" },
      openingHours: { type: String, default: "Mar-Dom 18:00-22:30" },
      openingDays: {
        type: [String],
        default: ["mar", "mer", "gio", "ven", "sab", "dom"],
      },
      openingTimeStart: { type: String, default: "18:00" },
      openingTimeEnd: { type: String, default: "22:30" },
    },
  },
  { timestamps: true },
);

// Utenti Mongo reali per Milestone 2. Gli utenti owner/admin/staff sono sempre
// collegati a un businessId; il global_admin resta un ruolo di piattaforma.
const userSchema = new mongoose.Schema(
  {
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: "Business", index: true },
    name: { type: String, default: "", trim: true, maxlength: 100 },
    email: { type: String, trim: true, lowercase: true },
    passwordHash: { type: String, default: "" },
    role: {
      type: String,
      enum: ["global_admin", "owner", "admin", "staff"],
      default: "owner",
    },
    active: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true },
);

// MenuItem nasce come prodotto food, ma contiene gia' module/type/metadata per
// diventare un item vendibile riusabile anche per rental o booking in futuro.
const menuItemSchema = new mongoose.Schema(
  {
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: "Business", index: true },
    module: {
      type: String,
      enum: ["ordering", "rental", "booking"],
      default: "ordering",
    },
    type: {
      type: String,
      enum: ["product", "service", "rental_item"],
      default: "product",
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
    category: { type: String, default: "pizza", trim: true },
    available: { type: Boolean, default: true },
    emoji: { type: String, default: "🍕" },
    imageUrl: { type: String, default: "", trim: true },
    sortOrder: { type: Number, default: 0 },
    unit: { type: String, default: "pezzo", trim: true },
    tags: { type: [String], default: [] },
    allergens: { type: [String], default: [] },
    featured: { type: Boolean, default: false },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

const orderItemSchema = new mongoose.Schema(
  {
    menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: "MenuItem" },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    qty: { type: Number, required: true, min: 1, max: 20 },
    notes: { type: String, default: "", trim: true, maxlength: 360 },
  },
  { _id: false },
);

// Ordine del modulo ordering: oggi gestisce asporto/ritiro, ma businessId e
// fulfillmentType lo rendono compatibile con piu' business e varianti future.
const orderSchema = new mongoose.Schema(
  {
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: "Business", index: true },
    customer: { type: String, required: true, trim: true, maxlength: 80 },
    phone: { type: String, default: "", trim: true },
    notes: { type: String, default: "" },
    items: { type: [orderItemSchema], required: true },
    total: { type: Number, required: true, min: 0 },
    fulfillmentType: {
      type: String,
      enum: ["pickup", "delivery", "dine_in"],
      default: "pickup",
    },
    pickupDate: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    pickupTime: {
      type: String,
      required: true,
      match: /^\d{2}:\d{2}$/,
    },
    pickupSlot: {
      type: String,
      required: true,
      index: true,
      match: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/,
    },
    status: {
      type: String,
      enum: ["preparing", "ready", "done", "cancelled"],
      default: "preparing",
    },
    handledBy: { type: String, default: "" },
    loyaltyAwarded: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// Cliente locale al business. Lo stesso numero puo' esistere in tenant diversi
// senza creare collisioni grazie all'indice composto businessId + phone.
const customerSchema = new mongoose.Schema(
  {
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: "Business", index: true },
    name: { type: String, default: "", trim: true, maxlength: 80 },
    phone: { type: String, required: true, trim: true },
    points: { type: Number, default: 0, min: 0 },
    completedOrders: { type: Number, default: 0, min: 0 },
    totalOrders: { type: Number, default: 0, min: 0 },
    lastOrder: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    lastOrderAt: { type: Date },
  },
  { timestamps: true },
);

// Coupon tenant-aware: ogni codice e' unico solo dentro il business, non su
// tutta la piattaforma.
const couponSchema = new mongoose.Schema(
  {
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: "Business", index: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    type: { type: String, enum: ["percent", "fixed"], default: "percent" },
    value: { type: Number, required: true, min: 0 },
    expiresAt: { type: String, default: "" },
    usageLimit: { type: Number, default: 0, min: 0 },
    usedCount: { type: Number, default: 0, min: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// Impostazioni operative del singolo locale. Restano separate da Business per
// mantenere compatibile il pannello admin gia' esistente.
const storeSettingsSchema = new mongoose.Schema(
  {
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: "Business", index: true },
    openingHours: { type: String, default: "Mar-Dom 18:00-22:30" },
    openingDays: {
      type: [String],
      default: ["mar", "mer", "gio", "ven", "sab", "dom"],
    },
    openingTimeStart: { type: String, default: "18:00" },
    openingTimeEnd: { type: String, default: "22:30" },
    deliveryCost: { type: Number, default: 0, min: 0 },
    minimumOrder: { type: Number, default: 0, min: 0 },
    serviceZones: { type: [String], default: [] },
    customerMessage: { type: String, default: "" },
  },
  { timestamps: true },
);

// Scaffold del modulo booking: non e' ancora UI completa, ma il modello rende
// chiara l'estensione verso tavoli, appuntamenti o piccole prenotazioni.
const bookingSchema = new mongoose.Schema(
  {
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: "Business", index: true },
    customer: { type: String, required: true, trim: true, maxlength: 80 },
    phone: { type: String, default: "", trim: true },
    resourceId: { type: mongoose.Schema.Types.ObjectId },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    startTime: { type: String, required: true, match: /^\d{2}:\d{2}$/ },
    endTime: { type: String, default: "", match: /^$|^\d{2}:\d{2}$/ },
    partySize: { type: Number, default: 1, min: 1 },
    status: {
      type: String,
      enum: ["requested", "confirmed", "completed", "cancelled"],
      default: "requested",
    },
    notes: { type: String, default: "", trim: true, maxlength: 360 },
  },
  { timestamps: true },
);

// Scaffold del modulo rental: stesso core multi-tenant, pensato per noleggio
// bici/attrezzatura con durata, deposito e stato.
const rentalSchema = new mongoose.Schema(
  {
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: "Business", index: true },
    customer: { type: String, required: true, trim: true, maxlength: 80 },
    phone: { type: String, default: "", trim: true },
    rentalItemId: { type: mongoose.Schema.Types.ObjectId, ref: "MenuItem" },
    startDateTime: { type: Date, required: true },
    endDateTime: { type: Date, required: true },
    duration: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    deposit: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ["requested", "active", "returned", "cancelled"],
      default: "requested",
    },
    notes: { type: String, default: "", trim: true, maxlength: 360 },
  },
  { timestamps: true },
);

// Indici multi-tenant: le unicita' importanti sono sempre composte con
// businessId, cosi' due attivita possono usare stessi nomi/codici/telefoni.
userSchema.index({ businessId: 1, email: 1 }, { unique: true, sparse: true });
menuItemSchema.index({ businessId: 1, category: 1, sortOrder: 1, name: 1 });
menuItemSchema.index({ businessId: 1, name: 1 }, { unique: true, sparse: true });
orderSchema.index({ businessId: 1, status: 1, createdAt: -1 });
orderSchema.index({ businessId: 1, pickupDate: 1, pickupTime: 1 });
customerSchema.index({ businessId: 1, phone: 1 }, { unique: true, sparse: true });
couponSchema.index({ businessId: 1, active: 1, expiresAt: 1 });
couponSchema.index({ businessId: 1, code: 1 }, { unique: true, sparse: true });
cityRegistrySchema.index({ slug: 1, provinceCode: 1 });
cityRegistrySchema.index({ searchText: 1 });
cityRegistrySchema.index(
  { istatCode: 1 },
  { unique: true, sparse: true, partialFilterExpression: { istatCode: { $gt: "" } } },
);
citySchema.index({ active: 1, status: 1, name: 1 });
citySchema.index({ registryId: 1 }, { unique: true, sparse: true });
businessSchema.index({ slug: 1 });
businessSchema.index({ "location.citySlug": 1, slug: 1 }, { unique: true });
businessSchema.index({ "location.citySlug": 1, subscriptionStatus: 1 });

const CityRegistry =
  mongoose.models.CityRegistry ||
  mongoose.model("CityRegistry", cityRegistrySchema);
const City = mongoose.models.City || mongoose.model("City", citySchema);
const Business =
  mongoose.models.Business || mongoose.model("Business", businessSchema);
const User = mongoose.models.User || mongoose.model("User", userSchema);
const MenuItem =
  mongoose.models.MenuItem || mongoose.model("MenuItem", menuItemSchema);
const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);
const Customer =
  mongoose.models.Customer || mongoose.model("Customer", customerSchema);
const Coupon = mongoose.models.Coupon || mongoose.model("Coupon", couponSchema);
const StoreSettings =
  mongoose.models.StoreSettings ||
  mongoose.model("StoreSettings", storeSettingsSchema);
const Booking = mongoose.models.Booking || mongoose.model("Booking", bookingSchema);
const Rental = mongoose.models.Rental || mongoose.model("Rental", rentalSchema);

const DEFAULT_REGISTRY_CITIES = [
  {
    name: "Cagli",
    slug: "cagli",
    provinceCode: "PU",
    provinceName: "Pesaro e Urbino",
    regionCode: "11",
    regionName: "Marche",
    country: "IT",
    istatCode: "041007",
    cadastralCode: "B352",
    activeMunicipality: true,
    source: "manual_seed",
    sourceVersion: "bootstrap-2026-02-21",
    lat: 43.5473,
    lng: 12.6474,
  },
  {
    name: "Pesaro",
    slug: "pesaro",
    provinceCode: "PU",
    provinceName: "Pesaro e Urbino",
    regionCode: "11",
    regionName: "Marche",
    country: "IT",
    istatCode: "041044",
    cadastralCode: "G479",
    activeMunicipality: true,
    source: "manual_seed",
    sourceVersion: "bootstrap-2026-02-21",
  },
  {
    name: "Urbino",
    slug: "urbino",
    provinceCode: "PU",
    provinceName: "Pesaro e Urbino",
    regionCode: "11",
    regionName: "Marche",
    country: "IT",
    istatCode: "041067",
    cadastralCode: "L500",
    activeMunicipality: true,
    source: "manual_seed",
    sourceVersion: "bootstrap-2026-02-21",
  },
  {
    name: "Fano",
    slug: "fano",
    provinceCode: "PU",
    provinceName: "Pesaro e Urbino",
    regionCode: "11",
    regionName: "Marche",
    country: "IT",
    istatCode: "041013",
    cadastralCode: "D488",
    activeMunicipality: true,
    source: "manual_seed",
    sourceVersion: "bootstrap-2026-02-21",
  },
  {
    name: "Roma",
    slug: "roma",
    provinceCode: "RM",
    provinceName: "Roma",
    regionCode: "12",
    regionName: "Lazio",
    country: "IT",
    istatCode: "058091",
    cadastralCode: "H501",
    activeMunicipality: true,
    source: "manual_seed",
    sourceVersion: "bootstrap-2026-02-21",
  },
  {
    name: "Milano",
    slug: "milano",
    provinceCode: "MI",
    provinceName: "Milano",
    regionCode: "03",
    regionName: "Lombardia",
    country: "IT",
    istatCode: "015146",
    cadastralCode: "F205",
    activeMunicipality: true,
    source: "manual_seed",
    sourceVersion: "bootstrap-2026-02-21",
  },
  {
    name: "Torino",
    slug: "torino",
    provinceCode: "TO",
    provinceName: "Torino",
    regionCode: "01",
    regionName: "Piemonte",
    country: "IT",
    istatCode: "001272",
    cadastralCode: "L219",
    activeMunicipality: true,
    source: "manual_seed",
    sourceVersion: "bootstrap-2026-02-21",
  },
  {
    name: "Bologna",
    slug: "bologna",
    provinceCode: "BO",
    provinceName: "Bologna",
    regionCode: "08",
    regionName: "Emilia-Romagna",
    country: "IT",
    istatCode: "037006",
    cadastralCode: "A944",
    activeMunicipality: true,
    source: "manual_seed",
    sourceVersion: "bootstrap-2026-02-21",
  },
  {
    name: "Firenze",
    slug: "firenze",
    provinceCode: "FI",
    provinceName: "Firenze",
    regionCode: "09",
    regionName: "Toscana",
    country: "IT",
    istatCode: "048017",
    cadastralCode: "D612",
    activeMunicipality: true,
    source: "manual_seed",
    sourceVersion: "bootstrap-2026-02-21",
  },
  {
    name: "Napoli",
    slug: "napoli",
    provinceCode: "NA",
    provinceName: "Napoli",
    regionCode: "15",
    regionName: "Campania",
    country: "IT",
    istatCode: "063049",
    cadastralCode: "F839",
    activeMunicipality: true,
    source: "manual_seed",
    sourceVersion: "bootstrap-2026-02-21",
  },
];

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

async function ensureRegistrySeed() {
  const syncedAt = new Date();
  await Promise.all(
    DEFAULT_REGISTRY_CITIES.map((city) =>
      CityRegistry.findOneAndUpdate(
        city.istatCode ? { istatCode: city.istatCode } : { slug: city.slug },
        {
          $setOnInsert: {
            ...city,
            searchText: registrySearchText(city),
            lastSyncedAt: syncedAt,
          },
        },
        { upsert: true, setDefaultsOnInsert: true },
      ),
    ),
  );
}

async function ensureDefaultCityRegistry() {
  await ensureRegistrySeed();
  return CityRegistry.findOne({
    $or: [{ istatCode: "041007" }, { slug: DEFAULT_CITY_SLUG }],
    activeMunicipality: true,
  });
}

async function ensureDefaultCity() {
  const registryCity = await ensureDefaultCityRegistry();
  return City.findOneAndUpdate(
    { slug: DEFAULT_CITY_SLUG },
    {
      $setOnInsert: {
        name: "Cagli",
        slug: DEFAULT_CITY_SLUG,
        province: "PU",
        region: "Marche",
        country: "IT",
        lat: 43.5473,
        lng: 12.6474,
      },
      $set: {
        registryId: registryCity?._id,
        active: true,
        status: "active",
        provider: "registry",
        providerPlaceId: registryCity?.istatCode || "manual-seed:cagli-pu-it",
        heroTitle: "Cagli a portata di mano",
        heroDescription:
          "Attivita, menu, servizi e ordini locali in una directory unica.",
        lastVerifiedAt: new Date(),
      },
    },
    { returnDocument: "after", upsert: true, setDefaultsOnInsert: true },
  );
}

// Crea il tenant Mucho Gusto di fallback. Serve per far continuare a girare la
// vecchia app single-business mentre il progetto diventa SaaS multi-business.
async function ensureDefaultBusiness() {
  const defaultCity = await ensureDefaultCity();
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 14);

  return Business.findOneAndUpdate(
    { slug: DEFAULT_BUSINESS_SLUG },
    {
      $setOnInsert: {
        name: "Mucho Gusto",
        slug: DEFAULT_BUSINESS_SLUG,
        type: "pizzeria",
        cityId: defaultCity._id,
        location: {
          cityName: defaultCity.name,
          citySlug: defaultCity.slug,
          province: defaultCity.province,
          region: defaultCity.region,
          country: defaultCity.country,
          lat: defaultCity.lat,
          lng: defaultCity.lng,
        },
        plan: "free",
        subscriptionStatus: "trialing",
        trialEndsAt,
        branding: {
          publicName: "Mucho Gusto",
          primaryColor: "#2C5F2E",
          accentColor: "#C0392B",
        },
        deployment: {
          publicUrl: "",
          vercelProjectName: "mucho-gusto",
          apiBaseUrl: "",
          notes: "Vercel app dedicata con VITE_BUSINESS_SLUG=mucho-gusto",
        },
        features: {
          ordering: true,
          booking: false,
          rental: false,
          customPizza: true,
          coupons: true,
          customerAccounts: true,
          analytics: true,
        },
        settings: {
          timezone: "Europe/Rome",
          currency: "EUR",
          locale: "it-IT",
          openingHours: "Mar-Dom 18:00-22:30",
        },
      },
    },
    { returnDocument: "after", upsert: true, setDefaultsOnInsert: true },
  );
}

// Migrazione morbida: i documenti vecchi senza businessId vengono agganciati al
// tenant di default invece di richiedere una migrazione manuale immediata.
async function attachLegacyDataToDefaultBusiness(businessId) {
  const legacyFilter = {
    $or: [{ businessId: { $exists: false } }, { businessId: null }],
  };

  await Promise.all([
    MenuItem.updateMany(legacyFilter, { $set: { businessId } }),
    Order.updateMany(legacyFilter, { $set: { businessId } }),
    Customer.updateMany(legacyFilter, { $set: { businessId } }),
    Coupon.updateMany(legacyFilter, { $set: { businessId } }),
    StoreSettings.updateMany(legacyFilter, { $set: { businessId } }),
  ]);
}

// Seed idempotente: crea dati demo solo se il business di default non ha menu.
// In produzione evita duplicati ad ogni riavvio.
async function seedMenu() {
  try {
    const defaultBusiness = await ensureDefaultBusiness();
    const defaultCity = await ensureDefaultCity();
    await Business.updateMany(
      {
        $or: [
          { cityId: { $exists: false } },
          { cityId: null },
          { "location.citySlug": { $exists: false } },
          { "location.citySlug": "" },
        ],
      },
      {
        $set: {
          cityId: defaultCity._id,
          location: {
            cityName: defaultCity.name,
            citySlug: defaultCity.slug,
            province: defaultCity.province,
            region: defaultCity.region,
            country: defaultCity.country,
            lat: defaultCity.lat,
            lng: defaultCity.lng,
          },
        },
      },
    );
    await attachLegacyDataToDefaultBusiness(defaultBusiness._id);

    const count = await MenuItem.countDocuments({ businessId: defaultBusiness._id });
    if (count > 0) return;

    await MenuItem.insertMany([
      {
        businessId: defaultBusiness._id,
        name: "Margherita",
        description: "Pomodoro, fior di latte, basilico",
        price: 8.5,
        category: "pizze-tonde",
        emoji: "🍕",
        sortOrder: 10,
      },
      {
        businessId: defaultBusiness._id,
        name: "Diavola",
        description: "Pomodoro, mozzarella, salame piccante",
        price: 10,
        category: "pizze-tonde",
        emoji: "🌶️",
        sortOrder: 20,
        tags: ["piccante"],
      },
      {
        businessId: defaultBusiness._id,
        name: "Quattro Formaggi",
        description: "Mozzarella, gorgonzola, brie, parmigiano",
        price: 11,
        category: "pizze-tonde",
        emoji: "🧀",
        sortOrder: 30,
      },
      {
        businessId: defaultBusiness._id,
        name: "Prosciutto",
        description: "Pomodoro, mozzarella, prosciutto cotto",
        price: 10,
        category: "pizze-tonde",
        emoji: "🥩",
        sortOrder: 40,
      },
      {
        businessId: defaultBusiness._id,
        name: "Margherita in teglia",
        description: "Trancio alto e soffice con pomodoro e mozzarella",
        price: 4,
        category: "pizza-teglia",
        emoji: "🍕",
        sortOrder: 10,
        unit: "trancio",
      },
      {
        businessId: defaultBusiness._id,
        name: "Suppli al telefono",
        description: "Riso, pomodoro e cuore filante",
        price: 2.5,
        category: "fritti",
        emoji: "🧆",
        sortOrder: 10,
      },
      {
        businessId: defaultBusiness._id,
        name: "Patatine fritte",
        description: "Porzione croccante",
        price: 3.5,
        category: "fritti",
        emoji: "🍟",
        sortOrder: 20,
        unit: "porzione",
      },
      {
        businessId: defaultBusiness._id,
        name: "Coca Cola",
        description: "33cl",
        price: 2.5,
        category: "bevande",
        emoji: "🥤",
        sortOrder: 10,
        unit: "lattina",
      },
      {
        businessId: defaultBusiness._id,
        name: "Acqua",
        description: "50cl naturale o frizzante",
        price: 1.5,
        category: "bevande",
        emoji: "💧",
        sortOrder: 20,
        unit: "bottiglia",
      },
      {
        businessId: defaultBusiness._id,
        name: "Tiramisu",
        description: "Fatto in casa",
        price: 4.5,
        category: "dolci",
        emoji: "☕",
        sortOrder: 10,
      },
    ]);

    console.log("[db] Seed menu completato");
  } catch (err) {
    console.error("[db] Seed error:", err.message);
  }
}

module.exports = {
  connect,
  seedMenu,
  ensureDefaultBusiness,
  ensureDefaultCity,
  ensureDefaultCityRegistry,
  ensureRegistrySeed,
  DEFAULT_BUSINESS_SLUG,
  DEFAULT_CITY_SLUG,
  CityRegistry,
  City,
  Business,
  User,
  MenuItem,
  Order,
  Customer,
  Coupon,
  StoreSettings,
  Booking,
  Rental,
};

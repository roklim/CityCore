import { randomBytes, scryptSync } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";

const HELP_TEXT = `
seed:ordering

Uso:
  npm run seed:ordering

Env opzionali:
  ORDERING_SEED_CITY_NAME=...
  ORDERING_SEED_CITY_SLUG=...
  ORDERING_SEED_BUSINESS_NAME=...
  ORDERING_SEED_BUSINESS_SLUG=...
  ORDERING_SEED_ADMIN_EMAIL=...
  ORDERING_SEED_ADMIN_PASSWORD=...
  ORDERING_SEED_CUSTOMER_NAME=...
  ORDERING_SEED_CUSTOMER_PHONE=...
  ORDERING_SEED_COUPON_CODE=...

Comportamento:
  - crea o aggiorna una citta V2 attiva
  - crea o aggiorna un business ordering V2 attivo
  - attiva il modulo ordering con settings minime realistiche
  - crea utente local admin e access grant business
  - crea categorie e item menu demo
  - crea coupon demo
  - crea ordini baseline completato + pending per smoke runtime
  - stampa le variabili consigliate per npm run verify:ordering
`;

const currentDir = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(currentDir, "../apps/api/.env") });

const prisma = new PrismaClient();

const defaults = {
  cityName: process.env.ORDERING_SEED_CITY_NAME?.trim() || "Cagli Smoke",
  citySlug: process.env.ORDERING_SEED_CITY_SLUG?.trim() || "cagli-smoke",
  businessName: process.env.ORDERING_SEED_BUSINESS_NAME?.trim() || "Forno Locale Demo",
  businessSlug: process.env.ORDERING_SEED_BUSINESS_SLUG?.trim() || "forno-locale-demo",
  adminEmail: process.env.ORDERING_SEED_ADMIN_EMAIL?.trim() || "smoke-admin@platform.local",
  adminPassword: process.env.ORDERING_SEED_ADMIN_PASSWORD?.trim() || "SmokeAdmin123!",
  customerPhone: process.env.ORDERING_SEED_CUSTOMER_PHONE?.trim() || "3330000000",
  customerName: process.env.ORDERING_SEED_CUSTOMER_NAME?.trim() || "Cliente Demo",
  couponCode: process.env.ORDERING_SEED_COUPON_CODE?.trim() || "SMOKE10",
};

const templateSeed = {
  code: "pizzeria",
  name: "Pizzeria",
  category: "food",
  primaryModule: "ordering",
  defaultCtaLabel: "Ordina ora",
  fieldSchemaJson: {
    onboardingFields: ["name", "city", "hours", "menu", "contacts"],
  },
  sectionSchemaJson: {
    sections: ["hero", "menu_preview", "faq", "gallery", "contact"],
  },
};

const menuSeed = [
  {
    category: {
      name: "Pizze classiche",
      slug: "pizze-classiche",
      sortOrder: 10,
    },
    items: [
      {
        name: "Margherita",
        slug: "margherita",
        description: "Pomodoro, fiordilatte e basilico.",
        price: 6.5,
        emoji: "pizza",
        featured: true,
        unit: "pizza",
        tags: ["classica", "vegetariana"],
        allergens: ["glutine", "latte"],
        sortOrder: 10,
      },
      {
        name: "Diavola",
        slug: "diavola",
        description: "Salame piccante, pomodoro e mozzarella.",
        price: 8.5,
        emoji: "spicy",
        featured: true,
        unit: "pizza",
        tags: ["piccante"],
        allergens: ["glutine", "latte"],
        sortOrder: 20,
      },
    ],
  },
  {
    category: {
      name: "Fritti",
      slug: "fritti",
      sortOrder: 20,
    },
    items: [
      {
        name: "Suppli",
        slug: "suppli",
        description: "Riso al pomodoro con cuore filante.",
        price: 2.5,
        emoji: "fried",
        featured: false,
        unit: "pezzo",
        tags: ["street"],
        allergens: ["glutine", "latte"],
        sortOrder: 10,
      },
    ],
  },
];

function hashPassword(password) {
  const salt = randomBytes(16);
  const derivedKey = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("base64url")}$${derivedKey.toString("base64url")}`;
}

function toDateAtTime(dateString, timeString) {
  const [year, month, day] = dateString.split("-").map(Number);
  const [hours, minutes] = timeString.split(":").map(Number);
  return new Date(Date.UTC(year, month - 1, day, hours - 2, minutes));
}

function todayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftDate(dateString, amount) {
  const value = new Date(`${dateString}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

async function ensureTemplate() {
  return prisma.businessTemplate.upsert({
    where: {
      code: templateSeed.code,
    },
    update: {
      name: templateSeed.name,
      category: templateSeed.category,
      primaryModule: templateSeed.primaryModule,
      defaultCtaLabel: templateSeed.defaultCtaLabel,
      active: true,
      fieldSchemaJson: templateSeed.fieldSchemaJson,
      sectionSchemaJson: templateSeed.sectionSchemaJson,
    },
    create: {
      ...templateSeed,
      active: true,
    },
  });
}

async function ensureCity() {
  return prisma.city.upsert({
    where: {
      slug: defaults.citySlug,
    },
    update: {
      name: defaults.cityName,
      status: "active",
      active: true,
      province: "CA",
      region: "Sardegna",
      country: "IT",
      heroTitle: "Scopri attivita locali e prova i flussi ordering di CityCore",
      heroDescription: "Tenant smoke per ordering V2, confronto runtime e preparazione ETL.",
      seoTitle: `${defaults.cityName} - smoke tenant V2`,
      seoDescription: "Tenant tecnico usato per verificare ordering V2 end-to-end.",
      sortOrder: 10,
    },
    create: {
      name: defaults.cityName,
      slug: defaults.citySlug,
      status: "active",
      active: true,
      province: "CA",
      region: "Sardegna",
      country: "IT",
      heroTitle: "Scopri attivita locali e prova i flussi ordering di CityCore",
      heroDescription: "Tenant smoke per ordering V2, confronto runtime e preparazione ETL.",
      seoTitle: `${defaults.cityName} - smoke tenant V2`,
      seoDescription: "Tenant tecnico usato per verificare ordering V2 end-to-end.",
      sortOrder: 10,
    },
  });
}

async function ensureAdminUser() {
  return prisma.user.upsert({
    where: {
      email: defaults.adminEmail,
    },
    update: {
      name: "Ordering Smoke Admin",
      status: "active",
      passwordHash: hashPassword(defaults.adminPassword),
      authVersion: {
        increment: 1,
      },
    },
    create: {
      email: defaults.adminEmail,
      name: "Ordering Smoke Admin",
      status: "active",
      passwordHash: hashPassword(defaults.adminPassword),
    },
  });
}

async function ensureBusiness(cityId, templateId, ownerUserId) {
  return prisma.business.upsert({
    where: {
      cityId_slug: {
        cityId,
        slug: defaults.businessSlug,
      },
    },
    update: {
      templateId,
      ownerUserId,
      name: defaults.businessName,
      status: "active",
      plan: "pro",
      subscriptionStatus: "active",
      category: "food",
      publicEmail: "ordini@localdemo.test",
      publicPhone: "+39 070 000 0000",
      website: "https://localdemo.test",
      addressLine1: "Via Demo 12",
      postalCode: "09100",
      timezone: "Europe/Rome",
      currency: "EUR",
      locale: "it-IT",
      primaryColor: "#f4892e",
      accentColor: "#45d38b",
      publicTitle: "Ordering V2 smoke tenant",
      publicSubtitle: "Tenant locale per verifiche end-to-end ripetibili",
      publicDescription:
        "Business demo usato per verificare menu, availability, ordini, coupon e banco locale V2.",
      seoTitle: "Ordering smoke tenant",
      seoDescription: "Tenant demo per ordering V2.",
      bookingPolicy: "Ritiro in sede con slot configurabili.",
      cancellationPolicy: "Ordini demo annullabili solo da staff autorizzato.",
      notesInternal: "Creato dallo script seed:ordering.",
    },
    create: {
      cityId,
      templateId,
      ownerUserId,
      name: defaults.businessName,
      slug: defaults.businessSlug,
      status: "active",
      plan: "pro",
      subscriptionStatus: "active",
      category: "food",
      publicEmail: "ordini@localdemo.test",
      publicPhone: "+39 070 000 0000",
      website: "https://localdemo.test",
      addressLine1: "Via Demo 12",
      postalCode: "09100",
      timezone: "Europe/Rome",
      currency: "EUR",
      locale: "it-IT",
      primaryColor: "#f4892e",
      accentColor: "#45d38b",
      publicTitle: "Ordering V2 smoke tenant",
      publicSubtitle: "Tenant locale per verifiche end-to-end ripetibili",
      publicDescription:
        "Business demo usato per verificare menu, availability, ordini, coupon e banco locale V2.",
      seoTitle: "Ordering smoke tenant",
      seoDescription: "Tenant demo per ordering V2.",
      bookingPolicy: "Ritiro in sede con slot configurabili.",
      cancellationPolicy: "Ordini demo annullabili solo da staff autorizzato.",
      notesInternal: "Creato dallo script seed:ordering.",
    },
  });
}

async function ensureOrderingModule(businessId) {
  const today = todayString();
  const settingsJson = {
    openingHours: "Tutti i giorni 18:00-22:30",
    openingDays: ["lun", "mar", "mer", "gio", "ven", "sab", "dom"],
    openingTimeStart: "18:00",
    openingTimeEnd: "22:30",
    slotMinutes: 15,
    maxOrdersPerSlot: 4,
    minPreparationMinutes: 30,
    minimumOrder: 6,
    deliveryCost: 0,
    serviceZones: ["Centro", "Stazione", "Porto"],
    customerMessage: "Tenant demo V2 per smoke ordering e confronto ETL.",
    closedDates: [shiftDate(today, 10)],
    specialDates: [
      {
        date: shiftDate(today, 1),
        openingTimeStart: "17:30",
        openingTimeEnd: "23:00",
        slotMinutes: 10,
        maxOrdersPerSlot: 6,
        minPreparationMinutes: 20,
      },
    ],
  };

  return prisma.businessModule.upsert({
    where: {
      businessId_moduleCode: {
        businessId,
        moduleCode: "ordering",
      },
    },
    update: {
      active: true,
      settingsJson,
    },
    create: {
      businessId,
      moduleCode: "ordering",
      active: true,
      settingsJson,
    },
  });
}

async function ensureBusinessAccess(userId, cityId, businessId) {
  const existing = await prisma.accessGrant.findFirst({
    where: {
      userId,
      scopeType: "business",
      businessId,
      cityId,
      role: "local_admin",
    },
  });

  if (existing) {
    return prisma.accessGrant.update({
      where: {
        id: existing.id,
      },
      data: {
        active: true,
      },
    });
  }

  return prisma.accessGrant.create({
    data: {
      userId,
      role: "local_admin",
      scopeType: "business",
      cityId,
      businessId,
      active: true,
    },
  });
}

async function ensureMenu(businessId) {
  for (const categorySeed of menuSeed) {
    const category = await prisma.menuCategory.upsert({
      where: {
        businessId_slug: {
          businessId,
          slug: categorySeed.category.slug,
        },
      },
      update: {
        name: categorySeed.category.name,
        sortOrder: categorySeed.category.sortOrder,
        active: true,
      },
      create: {
        businessId,
        name: categorySeed.category.name,
        slug: categorySeed.category.slug,
        sortOrder: categorySeed.category.sortOrder,
        active: true,
      },
    });

    for (const itemSeed of categorySeed.items) {
      await prisma.menuItem.upsert({
        where: {
          businessId_slug: {
            businessId,
            slug: itemSeed.slug,
          },
        },
        update: {
          categoryId: category.id,
          name: itemSeed.name,
          description: itemSeed.description,
          price: itemSeed.price,
          available: true,
          featured: itemSeed.featured,
          emoji: itemSeed.emoji,
          unit: itemSeed.unit,
          tagsJson: itemSeed.tags,
          allergensJson: itemSeed.allergens,
          sortOrder: itemSeed.sortOrder,
        },
        create: {
          businessId,
          categoryId: category.id,
          name: itemSeed.name,
          slug: itemSeed.slug,
          description: itemSeed.description,
          price: itemSeed.price,
          available: true,
          featured: itemSeed.featured,
          emoji: itemSeed.emoji,
          unit: itemSeed.unit,
          tagsJson: itemSeed.tags,
          allergensJson: itemSeed.allergens,
          sortOrder: itemSeed.sortOrder,
        },
      });
    }
  }
}

async function ensureCoupon(businessId) {
  return prisma.coupon.upsert({
    where: {
      businessId_code: {
        businessId,
        code: defaults.couponCode,
      },
    },
    update: {
      type: "percent",
      value: 10,
      usageLimit: 50,
      active: true,
    },
    create: {
      businessId,
      code: defaults.couponCode,
      type: "percent",
      value: 10,
      usageLimit: 50,
      active: true,
    },
  });
}

async function ensureOrderWithItems({
  businessId,
  customerId,
  customerName,
  customerPhone,
  note,
  status,
  pickupAt,
  item,
  qty,
  paymentStatus,
  source,
  loyaltyAwarded,
}) {
  const existingOrder = await prisma.order.findFirst({
    where: {
      businessId,
      customerProfileId: customerId,
      notes: note,
    },
    select: {
      id: true,
    },
  });

  const subtotal = Number(item.price.toString()) * qty;

  if (existingOrder) {
    await prisma.orderItem.deleteMany({
      where: {
        orderId: existingOrder.id,
      },
    });

    return prisma.order.update({
      where: {
        id: existingOrder.id,
      },
      data: {
        customerName,
        customerPhone,
        status,
        fulfillmentType: "pickup",
        pickupAt,
        subtotal,
        discountTotal: 0,
        serviceFee: 0,
        deliveryFee: 0,
        grandTotal: subtotal,
        paymentStatus,
        source,
        loyaltyAwarded,
        items: {
          create: [
            {
              menuItemId: item.id,
              nameSnapshot: item.name,
              priceSnapshot: item.price,
              qty,
              lineTotal: subtotal,
            },
          ],
        },
      },
    });
  }

  return prisma.order.create({
    data: {
      businessId,
      customerProfileId: customerId,
      customerName,
      customerPhone,
      status,
      fulfillmentType: "pickup",
      pickupAt,
      notes: note,
      subtotal,
      discountTotal: 0,
      serviceFee: 0,
      deliveryFee: 0,
      grandTotal: subtotal,
      paymentStatus,
      source,
      loyaltyAwarded,
      items: {
        create: [
          {
            menuItemId: item.id,
            nameSnapshot: item.name,
            priceSnapshot: item.price,
            qty,
            lineTotal: subtotal,
          },
        ],
      },
    },
  });
}

async function ensureCustomerAndOrders(businessId) {
  const margherita = await prisma.menuItem.findFirst({
    where: {
      businessId,
      slug: "margherita",
    },
  });
  const diavola = await prisma.menuItem.findFirst({
    where: {
      businessId,
      slug: "diavola",
    },
  });

  if (!margherita || !diavola) {
    throw new Error("Baseline menu items not found after menu seed");
  }

  const completedPickupAt = toDateAtTime(shiftDate(todayString(), -1), "19:00");
  const pendingPickupAt = toDateAtTime(shiftDate(todayString(), 1), "20:00");

  const customer = await prisma.customerProfile.upsert({
    where: {
      businessId_phone: {
        businessId,
        phone: defaults.customerPhone,
      },
    },
    update: {
      name: defaults.customerName,
      totalOrders: 2,
      completedOrders: 1,
      points: 1,
      lastOrderAt: pendingPickupAt,
    },
    create: {
      businessId,
      name: defaults.customerName,
      phone: defaults.customerPhone,
      totalOrders: 2,
      completedOrders: 1,
      points: 1,
      lastOrderAt: pendingPickupAt,
    },
  });

  const completedOrder = await ensureOrderWithItems({
    businessId,
    customerId: customer.id,
    customerName: defaults.customerName,
    customerPhone: defaults.customerPhone,
    note: "seed:ordering baseline completed order",
    status: "completed",
    pickupAt: completedPickupAt,
    item: margherita,
    qty: 1,
    paymentStatus: "paid",
    source: "admin",
    loyaltyAwarded: true,
  });

  const pendingOrder = await ensureOrderWithItems({
    businessId,
    customerId: customer.id,
    customerName: defaults.customerName,
    customerPhone: defaults.customerPhone,
    note: "seed:ordering baseline pending order",
    status: "pending",
    pickupAt: pendingPickupAt,
    item: diavola,
    qty: 2,
    paymentStatus: "pending",
    source: "web",
    loyaltyAwarded: false,
  });

  return {
    customer,
    completedOrder,
    pendingOrder,
  };
}

function printSmokeGuide(summary) {
  console.log("[seed:ordering] tenant ready");
  console.log(JSON.stringify(summary, null, 2));
  console.log("");
  console.log("[seed:ordering] suggested verify command");
  console.log(
    [
      `$env:ORDERING_CITY_SLUG='${summary.citySlug}'`,
      `$env:ORDERING_BUSINESS_SLUG='${summary.businessSlug}'`,
      `$env:ORDERING_ADMIN_EMAIL='${summary.adminEmail}'`,
      `$env:ORDERING_ADMIN_PASSWORD='${summary.adminPassword}'`,
      `$env:ORDERING_ACCESS_GRANT_ID='${summary.accessGrantId}'`,
      `$env:ORDERING_PHONE='${summary.customerPhone}'`,
      "$env:ORDERING_SMOKE_CREATE='1'",
      "$env:ORDERING_SMOKE_ADMIN_MUTATIONS='1'",
      "npm run verify:ordering",
    ].join("; "),
  );
}

async function main() {
  if (process.argv.includes("--help")) {
    console.log(HELP_TEXT.trim());
    return;
  }

  const template = await ensureTemplate();
  const city = await ensureCity();
  const adminUser = await ensureAdminUser();
  const business = await ensureBusiness(city.id, template.id, adminUser.id);
  const accessGrant = await ensureBusinessAccess(adminUser.id, city.id, business.id);

  await ensureOrderingModule(business.id);
  await ensureMenu(business.id);
  const coupon = await ensureCoupon(business.id);
  const sampleData = await ensureCustomerAndOrders(business.id);

  const summary = {
    citySlug: city.slug,
    businessSlug: business.slug,
    adminEmail: adminUser.email,
    adminPassword: defaults.adminPassword,
    accessGrantId: accessGrant.id,
    couponCode: coupon.code,
    customerPhone: sampleData.customer.phone,
    sampleOrders: {
      completedOrderId: sampleData.completedOrder.id,
      pendingOrderId: sampleData.pendingOrder.id,
    },
    suggestedSmoke: {
      ORDERING_CITY_SLUG: city.slug,
      ORDERING_BUSINESS_SLUG: business.slug,
      ORDERING_ADMIN_EMAIL: adminUser.email,
      ORDERING_ADMIN_PASSWORD: defaults.adminPassword,
      ORDERING_ACCESS_GRANT_ID: accessGrant.id,
      ORDERING_PHONE: sampleData.customer.phone,
      ORDERING_SMOKE_CREATE: "1",
      ORDERING_SMOKE_ADMIN_MUTATIONS: "1",
    },
  };

  printSmokeGuide(summary);
}

main()
  .catch((error) => {
    console.error("[seed:ordering] failure");
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

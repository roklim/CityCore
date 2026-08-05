import { randomBytes, scryptSync } from "node:crypto";
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";

loadEnv({ path: "apps/api/.env" });

const prisma = new PrismaClient();
const password = process.env.DEMO_SEED_PASSWORD?.trim();
const publishedAt = new Date("2026-08-05T10:00:00.000Z");

const templateSpecs = [
  {
    code: "local_business",
    name: "Local Business",
    category: "commerce",
    primaryModule: "catalog",
    defaultCtaLabel: "Scopri l'attività",
  },
  {
    code: "studio_service",
    name: "Studio Service",
    category: "service",
    primaryModule: "booking",
    defaultCtaLabel: "Invia una richiesta",
  },
  {
    code: "hospitality",
    name: "Hospitality",
    category: "hospitality",
    primaryModule: "hospitality",
    defaultCtaLabel: "Chiedi informazioni",
  },
  {
    code: "events_listings",
    name: "Events & Listings",
    category: "editorial",
    primaryModule: "listings",
    defaultCtaLabel: "Apri la vetrina",
  },
];

const cityCategorySpecs = [
  { slug: "ristorazione", name: "Ristorazione", moduleCode: "catalog", sortOrder: 10 },
  { slug: "servizi", name: "Servizi", moduleCode: "booking", sortOrder: 20 },
  { slug: "ospitalita", name: "Ospitalità", moduleCode: "hospitality", sortOrder: 30 },
  { slug: "eventi", name: "Eventi e annunci", moduleCode: "events", sortOrder: 40 },
];

const cagliBusinessSpecs = [
  {
    slug: "forno-civico",
    name: "Forno Civico",
    templateCode: "local_business",
    cityCategorySlug: "ristorazione",
    moduleCodes: ["catalog", "forms_inbox"],
    publicTitle: "Pizzeria di quartiere, impasti semplici e contatti diretti.",
    publicSubtitle: "Pizze preparate la sera, da consultare e richiedere senza percorsi complessi.",
    publicDescription:
      "Forno Civico è una pizzeria demo: una scheda locale leggibile con servizi, orari e un contatto diretto.",
    publicEmail: "contatti@forno-civico.citycore.example",
    publicPhone: "+39 0721 000101",
    website: "https://citycore.example/demo/forno-civico",
    addressLine1: "Via del Borgo 12",
    locality: "Cagli",
    province: "PU",
    ordering: {
      enabled: true,
      pickupLeadMinutes: 30,
      slotMinutes: 15,
      slotCapacity: 4,
      minimumOrderCents: 0,
    },
    services: [
      {
        slug: "pizza-margherita",
        name: "Pizza Margherita",
        shortDescription: "Pomodoro, fiordilatte e basilico.",
        description: "Pizza classica disponibile per l'ordine con ritiro serale.",
        priceCents: 750,
        priceLabel: "€ 7,50",
        sortOrder: 10,
      },
      {
        slug: "pizza-vegetariana",
        name: "Pizza vegetariana",
        shortDescription: "Verdure di stagione e fiordilatte.",
        description: "Proposta vegetariana disponibile per il ritiro serale.",
        priceCents: 900,
        priceLabel: "€ 9,00",
        sortOrder: 20,
      },
      {
        slug: "pizza-del-forno",
        name: "Pizza del Forno",
        shortDescription: "Ricetta demo a rotazione.",
        description: "Proposta stagionale disponibile nel menu demo di Forno Civico.",
        priceCents: 1100,
        priceLabel: "€ 11,00",
        sortOrder: 30,
      },
    ],
    openingHours: {
      weekdays: [{ opensAt: "18:00", closesAt: "23:00" }],
      saturday: [{ opensAt: "18:00", closesAt: "23:30" }],
      sunday: [{ opensAt: "18:00", closesAt: "22:30" }],
    },
  },
  {
    slug: "studio-aurora",
    name: "Studio Aurora",
    templateCode: "studio_service",
    cityCategorySlug: "servizi",
    moduleCodes: ["booking", "forms_inbox"],
    publicTitle: "Uno studio demo per servizi professionali chiari.",
    publicSubtitle: "Informazioni pratiche, richieste e tempi ordinati in una sola scheda.",
    publicDescription:
      "Studio Aurora rappresenta un'attività professionale demo con servizi pubblicati e contatto diretto.",
    publicEmail: "contatti@studio-aurora.citycore.example",
    publicPhone: "+39 0721 000102",
    website: "https://citycore.example/demo/studio-aurora",
    addressLine1: "Via del Teatro 7",
    locality: "Cagli",
    province: "PU",
    services: [
      {
        slug: "primo-incontro",
        name: "Primo incontro",
        shortDescription: "Un confronto iniziale su appuntamento.",
        description: "Servizio demo per verificare la visualizzazione di una durata.",
        durationMinutes: 45,
        sortOrder: 10,
      },
      {
        slug: "consulenza-programmata",
        name: "Consulenza programmata",
        shortDescription: "Approfondimento su richiesta.",
        description: "Servizio demo per lo studio professionale.",
        durationMinutes: 60,
        sortOrder: 20,
      },
    ],
    openingHours: {
      weekdays: [
        { opensAt: "09:00", closesAt: "13:00" },
        { opensAt: "15:00", closesAt: "19:00" },
      ],
      saturday: [{ opensAt: "09:00", closesAt: "12:30" }],
      sunday: [],
    },
  },
  {
    slug: "casa-del-borgo",
    name: "Casa del Borgo",
    templateCode: "hospitality",
    cityCategorySlug: "ospitalita",
    moduleCodes: ["hospitality", "forms_inbox"],
    publicTitle: "Ospitalità demo nel centro storico.",
    publicSubtitle: "Una struttura di esempio con informazioni pratiche e richieste dirette.",
    publicDescription:
      "Casa del Borgo è una struttura ricettiva demo, presente per verificare la sezione ospitalità della città.",
    publicEmail: "contatti@casa-del-borgo.citycore.example",
    publicPhone: "+39 0721 000103",
    website: "https://citycore.example/demo/casa-del-borgo",
    addressLine1: "Piazza del Mercato 3",
    locality: "Cagli",
    province: "PU",
    services: [
      {
        slug: "richiesta-soggiorno",
        name: "Richiesta soggiorno",
        shortDescription: "Contatto per ricevere informazioni sulla struttura.",
        description: "Servizio demo senza disponibilità o tariffe simulate.",
        sortOrder: 10,
      },
    ],
    openingHours: {
      weekdays: [{ opensAt: "08:00", closesAt: "20:00" }],
      saturday: [{ opensAt: "08:00", closesAt: "20:00" }],
      sunday: [{ opensAt: "08:00", closesAt: "20:00" }],
    },
  },
  {
    slug: "agenda-cagli",
    name: "Agenda Cagli",
    templateCode: "events_listings",
    cityCategorySlug: "eventi",
    moduleCodes: ["listings", "events", "forms_inbox"],
    publicTitle: "Eventi e annunci in una raccolta locale demo.",
    publicSubtitle: "Segnalazioni e contatti per la sezione editoriale della città.",
    publicDescription:
      "Agenda Cagli è una vetrina demo per mostrare come eventi e annunci vivono nella stessa directory city-first.",
    publicEmail: "contatti@agenda-cagli.citycore.example",
    publicPhone: "+39 0721 000104",
    website: "https://citycore.example/demo/agenda-cagli",
    addressLine1: "Corso XX Settembre 4",
    locality: "Cagli",
    province: "PU",
    services: [
      {
        slug: "segnala-un-evento",
        name: "Segnala un evento",
        shortDescription: "Invia una segnalazione alla redazione demo.",
        description: "Servizio di contatto per la raccolta editoriale.",
        sortOrder: 10,
      },
    ],
    openingHours: {
      weekdays: [{ opensAt: "10:00", closesAt: "18:00" }],
      saturday: [],
      sunday: [],
    },
  },
  {
    slug: "officina-del-ponte",
    name: "Officina del Ponte",
    templateCode: "local_business",
    cityCategorySlug: "servizi",
    moduleCodes: ["catalog", "forms_inbox"],
    publicTitle: "Un'attività locale demo per servizi e manutenzione.",
    publicSubtitle: "Una scheda essenziale con servizi pubblicati, orari e richiesta di contatto.",
    publicDescription:
      "Officina del Ponte amplia il dataset demo con un'altra attività locale senza introdurre una verticale dedicata.",
    publicEmail: "contatti@officina-del-ponte.citycore.example",
    publicPhone: "+39 0721 000105",
    website: "https://citycore.example/demo/officina-del-ponte",
    addressLine1: "Via del Ponte 22",
    locality: "Cagli",
    province: "PU",
    services: [
      {
        slug: "controllo-generale",
        name: "Controllo generale",
        shortDescription: "Servizio dimostrativo su richiesta.",
        description: "Informazione di catalogo senza listini o tempi simulati.",
        sortOrder: 10,
      },
      {
        slug: "manutenzione-programmata",
        name: "Manutenzione programmata",
        shortDescription: "Richiesta per un intervento pianificato.",
        description: "Servizio dimostrativo per la pagina business.",
        sortOrder: 20,
      },
    ],
    openingHours: {
      weekdays: [
        { opensAt: "08:30", closesAt: "12:30" },
        { opensAt: "14:30", closesAt: "18:30" },
      ],
      saturday: [{ opensAt: "08:30", closesAt: "12:30" }],
      sunday: [],
    },
  },
];

function hashPassword(value) {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString("base64url")}$${scryptSync(value, salt, 64).toString("base64url")}`;
}

async function ensureUser(email, name) {
  return prisma.user.upsert({
    where: { email },
    update: { name, status: "active", passwordHash: hashPassword(password) },
    create: { email, name, status: "active", passwordHash: hashPassword(password) },
  });
}

async function ensureTemplate(spec) {
  return prisma.businessTemplate.upsert({
    where: { code: spec.code },
    update: { ...spec, active: true },
    create: { ...spec, active: true },
  });
}

function openingDays(openingHours) {
  return Array.from({ length: 7 }, (_, weekday) => {
    const intervals =
      weekday < 5
        ? openingHours.weekdays
        : weekday === 5
          ? openingHours.saturday
          : openingHours.sunday;

    return { weekday, intervals };
  });
}

async function ensureOpeningHours(businessId, openingHours) {
  for (const day of openingDays(openingHours)) {
    await prisma.businessOpeningDay.upsert({
      where: { businessId_weekday: { businessId, weekday: day.weekday } },
      update: {
        isClosed: day.intervals.length === 0,
        intervals: {
          deleteMany: {},
          create: day.intervals.map((interval, sortOrder) => ({ ...interval, sortOrder })),
        },
      },
      create: {
        businessId,
        weekday: day.weekday,
        isClosed: day.intervals.length === 0,
        intervals: {
          create: day.intervals.map((interval, sortOrder) => ({ ...interval, sortOrder })),
        },
      },
    });
  }
}

async function ensureServices(businessId, services) {
  for (const service of services) {
    await prisma.businessService.upsert({
      where: { businessId_slug: { businessId, slug: service.slug } },
      update: { ...service, status: "published" },
      create: { businessId, ...service, status: "published" },
    });
  }
}

async function ensureOrderingSettings(businessId, settings) {
  if (!settings) return;
  await prisma.businessOrderingSettings.upsert({
    where: { businessId },
    update: settings,
    create: { businessId, ...settings },
  });
}

async function ensureBusiness({ city, templates, categories, owner, spec }) {
  const template = templates.get(spec.templateCode);
  const category = categories.get(spec.cityCategorySlug);

  if (!template || !category) {
    throw new Error(`Missing template or category for ${spec.slug}.`);
  }

  const businessData = {
    templateId: template.id,
    ownerUserId: owner.id,
    name: spec.name,
    category: template.category,
    status: "active",
    subscriptionStatus: "active",
    publicTitle: spec.publicTitle,
    publicSubtitle: spec.publicSubtitle,
    publicDescription: spec.publicDescription,
    publicEmail: spec.publicEmail,
    publicPhone: spec.publicPhone,
    website: spec.website,
    addressLine1: spec.addressLine1,
    locality: spec.locality,
    province: spec.province,
    timezone: "Europe/Rome",
    locale: "it-IT",
    currency: "EUR",
    publishedAt,
  };
  const business = await prisma.business.upsert({
    where: { cityId_slug: { cityId: city.id, slug: spec.slug } },
    update: businessData,
    create: { cityId: city.id, slug: spec.slug, ...businessData },
  });

  await prisma.businessModule.upsert({
    where: {
      businessId_moduleCode: { businessId: business.id, moduleCode: template.primaryModule },
    },
    update: { active: true, sortOrder: 0 },
    create: {
      businessId: business.id,
      moduleCode: template.primaryModule,
      active: true,
      sortOrder: 0,
    },
  });
  for (const [index, moduleCode] of spec.moduleCodes.entries()) {
    await prisma.businessModule.upsert({
      where: { businessId_moduleCode: { businessId: business.id, moduleCode } },
      update: { active: true, sortOrder: index + 1 },
      create: { businessId: business.id, moduleCode, active: true, sortOrder: index + 1 },
    });
  }

  await prisma.businessCategoryAssignment.updateMany({
    where: { businessId: business.id },
    data: { primary: false },
  });
  await prisma.businessCategoryAssignment.upsert({
    where: { businessId_categoryId: { businessId: business.id, categoryId: category.id } },
    update: { primary: true, sortOrder: 0 },
    create: { businessId: business.id, categoryId: category.id, primary: true, sortOrder: 0 },
  });

  await ensureServices(business.id, spec.services);
  await ensureOpeningHours(business.id, spec.openingHours);
  await ensureOrderingSettings(business.id, spec.ordering);

  const accessGrant = await prisma.accessGrant.findFirst({
    where: { userId: owner.id, businessId: business.id, role: "local_admin" },
  });
  if (!accessGrant) {
    await prisma.accessGrant.create({
      data: {
        userId: owner.id,
        role: "local_admin",
        scopeType: "business",
        cityId: city.id,
        businessId: business.id,
      },
    });
  }

  return business;
}

async function main() {
  if (!password) throw new Error("DEMO_SEED_PASSWORD is required.");

  const [admin, ownerOne, ownerTwo] = await Promise.all([
    ensureUser("global-admin@citycore.demo", "CityCore Admin"),
    ensureUser("owner-one@citycore.demo", "Demo Owner One"),
    ensureUser("owner-two@citycore.demo", "Demo Owner Two"),
  ]);
  const templates = new Map(
    (await Promise.all(templateSpecs.map(ensureTemplate))).map((template) => [
      template.code,
      template,
    ]),
  );
  const city = await prisma.city.upsert({
    where: { slug: "cagli" },
    update: {
      name: "Cagli",
      province: "PU",
      region: "Marche",
      status: "active",
      active: true,
      heroTitle: "Attività locali, una città alla volta",
      heroDescription:
        "Scopri attività, servizi, ospitalità ed eventi pubblicati a Cagli in una directory locale chiara.",
      publishedAt,
      sortOrder: 10,
    },
    create: {
      name: "Cagli",
      slug: "cagli",
      province: "PU",
      region: "Marche",
      status: "active",
      active: true,
      heroTitle: "Attività locali, una città alla volta",
      heroDescription:
        "Scopri attività, servizi, ospitalità ed eventi pubblicati a Cagli in una directory locale chiara.",
      publishedAt,
      sortOrder: 10,
    },
  });
  const categories = new Map(
    (
      await Promise.all(
        cityCategorySpecs.map((spec) =>
          prisma.cityCategory.upsert({
            where: { cityId_slug: { cityId: city.id, slug: spec.slug } },
            update: { ...spec, active: true },
            create: { cityId: city.id, ...spec, active: true },
          }),
        ),
      )
    ).map((category) => [category.slug, category]),
  );

  await Promise.all(
    cagliBusinessSpecs.map((spec, index) =>
      ensureBusiness({
        city,
        templates,
        categories,
        owner: index % 2 === 0 ? ownerOne : ownerTwo,
        spec,
      }),
    ),
  );

  const globalGrant = await prisma.accessGrant.findFirst({
    where: { userId: admin.id, role: "global_admin", scopeType: "platform" },
  });
  if (!globalGrant) {
    await prisma.accessGrant.create({
      data: { userId: admin.id, role: "global_admin", scopeType: "platform" },
    });
  }

  console.log("[db:seed] Cagli demo directory ready");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

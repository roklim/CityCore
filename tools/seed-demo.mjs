import { randomBytes, scryptSync } from "node:crypto";
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";

loadEnv({ path: "apps/api/.env" });
const prisma = new PrismaClient();
const password = process.env.DEMO_SEED_PASSWORD?.trim();

function hashPassword(value) {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString("base64url")}$${scryptSync(value, salt, 64).toString("base64url")}`;
}

async function user(email, name) {
  return prisma.user.upsert({
    where: { email },
    update: { name, status: "active", passwordHash: hashPassword(password) },
    create: { email, name, status: "active", passwordHash: hashPassword(password) },
  });
}

async function main() {
  if (!password) throw new Error("DEMO_SEED_PASSWORD is required.");
  const [admin, ownerOne, ownerTwo] = await Promise.all([
    user("global-admin@citycore.demo", "CityCore Admin"),
    user("owner-one@citycore.demo", "Demo Owner One"),
    user("owner-two@citycore.demo", "Demo Owner Two"),
  ]);
  const template = await prisma.businessTemplate.upsert({
    where: { code: "local_business" },
    update: {},
    create: {
      code: "local_business",
      name: "Local Business",
      category: "commerce",
      primaryModule: "catalog",
      defaultCtaLabel: "Scopri",
    },
  });
  const cities = await Promise.all([
    prisma.city.upsert({
      where: { slug: "cagli-demo" },
      update: { status: "active", active: true },
      create: { name: "Cagli Demo", slug: "cagli-demo", status: "active" },
    }),
    prisma.city.upsert({
      where: { slug: "rimini-demo" },
      update: { status: "active", active: true },
      create: { name: "Rimini Demo", slug: "rimini-demo", status: "active" },
    }),
    prisma.city.upsert({
      where: { slug: "futura-demo" },
      update: { status: "coming_soon", active: true },
      create: { name: "Futura Demo", slug: "futura-demo", status: "coming_soon" },
    }),
  ]);
  const categories = [];
  for (const city of cities.slice(0, 2)) {
    const food = await prisma.cityCategory.upsert({
      where: { cityId_slug: { cityId: city.id, slug: "ristorazione" } },
      update: { active: true },
      create: {
        cityId: city.id,
        name: "Ristorazione",
        slug: "ristorazione",
        active: true,
        sortOrder: 1,
      },
    });
    const services = await prisma.cityCategory.upsert({
      where: { cityId_slug: { cityId: city.id, slug: "servizi" } },
      update: { active: true },
      create: { cityId: city.id, name: "Servizi", slug: "servizi", active: true, sortOrder: 2 },
    });
    await prisma.cityCategory.upsert({
      where: { cityId_slug: { cityId: city.id, slug: "cucina-locale" } },
      update: { parentId: food.id },
      create: {
        cityId: city.id,
        parentId: food.id,
        name: "Cucina locale",
        slug: "cucina-locale",
        active: true,
      },
    });
    await prisma.cityCategory.upsert({
      where: { cityId_slug: { cityId: city.id, slug: "professionisti" } },
      update: { parentId: services.id },
      create: {
        cityId: city.id,
        parentId: services.id,
        name: "Professionisti",
        slug: "professionisti",
        active: true,
      },
    });
    categories.push({ cityId: city.id, food, services });
  }
  const specs = [
    [cities[0], "osteria-demo", "Osteria Demo", ownerOne, true, 0],
    [cities[0], "studio-demo", "Studio Demo", ownerTwo, true, 1],
    [cities[0], "bottega-demo", "Bottega Demo", ownerOne, true, 0],
    [cities[1], "caffe-demo", "Caffe Demo", ownerTwo, false, 1],
    [cities[1], "incompleto-demo", "Incompleto Demo", ownerOne, false, 0],
  ];
  for (const [city, slug, name, owner, published, categoryIndex] of specs) {
    const business = await prisma.business.upsert({
      where: { cityId_slug: { cityId: city.id, slug } },
      update: {
        name,
        ownerUserId: owner.id,
        status: published ? "active" : "draft",
        publicSubtitle: slug === "incompleto-demo" ? null : "Attivita locale demo",
        publicEmail: slug === "incompleto-demo" ? null : `${slug}@example.test`,
        socialLinksJson: { instagram: `https://instagram.example.test/${slug}` },
        publishedAt: published ? new Date() : null,
      },
      create: {
        cityId: city.id,
        templateId: template.id,
        name,
        slug,
        ownerUserId: owner.id,
        status: published ? "active" : "draft",
        publicSubtitle: slug === "incompleto-demo" ? null : "Attivita locale demo",
        publicEmail: slug === "incompleto-demo" ? null : `${slug}@example.test`,
        socialLinksJson: { instagram: `https://instagram.example.test/${slug}` },
        publishedAt: published ? new Date() : null,
      },
    });
    const localGrant = await prisma.accessGrant.findFirst({
      where: { userId: owner.id, businessId: business.id, role: "local_admin" },
    });
    if (!localGrant)
      await prisma.accessGrant.create({
        data: {
          userId: owner.id,
          role: "local_admin",
          scopeType: "business",
          cityId: city.id,
          businessId: business.id,
        },
      });
    const category = categories.find((entry) => entry.cityId === city.id)?.[
      categoryIndex ? "services" : "food"
    ];
    if (category)
      await prisma.businessCategoryAssignment.upsert({
        where: { businessId_categoryId: { businessId: business.id, categoryId: category.id } },
        update: { primary: true },
        create: { businessId: business.id, categoryId: category.id, primary: true },
      });
    await prisma.businessOpeningDay.deleteMany({ where: { businessId: business.id } });
    for (let weekday = 0; weekday < 7; weekday += 1)
      await prisma.businessOpeningDay.create({
        data: {
          businessId: business.id,
          weekday,
          isClosed: weekday === 6,
          intervals:
            weekday === 6
              ? undefined
              : {
                  create:
                    weekday === 5
                      ? [
                          { opensAt: "09:00", closesAt: "12:00", sortOrder: 0 },
                          { opensAt: "16:00", closesAt: "19:00", sortOrder: 1 },
                        ]
                      : [{ opensAt: "09:00", closesAt: "18:00", sortOrder: 0 }],
                },
        },
      });
    if (published) {
      await prisma.businessService.upsert({
        where: { businessId_slug: { businessId: business.id, slug: "servizio-principale" } },
        update: { status: "published" },
        create: {
          businessId: business.id,
          name: "Servizio principale",
          slug: "servizio-principale",
          status: "published",
        },
      });
      await prisma.businessService.upsert({
        where: { businessId_slug: { businessId: business.id, slug: "servizio-extra" } },
        update: { status: "published" },
        create: {
          businessId: business.id,
          name: "Servizio extra",
          slug: "servizio-extra",
          status: "published",
        },
      });
    }
    await prisma.businessInquiry.deleteMany({ where: { businessId: business.id } });
    if (published)
      await prisma.businessInquiry.createMany({
        data: ["new", "read", "closed", "read", "new"].map((status, index) => ({
          businessId: business.id,
          name: `Visitatore Demo ${index + 1}`,
          email: `visitor${index + 1}@example.test`,
          message: "Richiesta demo per verificare l'inbox.",
          privacyAccepted: true,
          status,
          readAt: status === "new" ? null : new Date(),
          internalNote: status === "read" ? "Nota interna demo" : null,
        })),
      });
  }
  const globalGrant = await prisma.accessGrant.findFirst({
    where: { userId: admin.id, role: "global_admin", scopeType: "platform" },
  });
  if (!globalGrant)
    await prisma.accessGrant.create({
      data: { userId: admin.id, role: "global_admin", scopeType: "platform" },
    });
  console.log("[db:seed] demo dataset ready");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

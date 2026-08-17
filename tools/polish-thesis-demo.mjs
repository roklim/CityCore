import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const placeholderSubtitle = "pizzeria paura";
const placeholderDescription = "pizzeria paura";
const placeholderAddress = "via gay";

function equalsIgnoreCase(value, expected) {
  return typeof value === "string" && value.trim().toLocaleLowerCase("it") === expected;
}

async function main() {
  const business = await prisma.business.findFirst({
    where: {
      slug: "mucho-gusto",
      city: { slug: "cagli" },
    },
    include: {
      city: {
        select: {
          name: true,
          province: true,
        },
      },
    },
  });

  if (!business) {
    console.log("Thesis demo polish: cagli/mucho-gusto not present; nothing to update.");
    return;
  }

  const data = {};

  if (equalsIgnoreCase(business.name, "mucho gusto - pizzeria")) {
    data.name = "Mucho Gusto";
  }

  if (!business.publicTitle?.trim()) {
    data.publicTitle = "Mucho Gusto · Pizzeria";
  }

  if (equalsIgnoreCase(business.publicSubtitle, placeholderSubtitle)) {
    data.publicSubtitle =
      "Pizzeria locale a Cagli, con informazioni, servizi e contatti sempre a portata di mano.";
  }

  if (equalsIgnoreCase(business.publicDescription, placeholderDescription)) {
    data.publicDescription =
      "Scopri Mucho Gusto a Cagli: consulta le informazioni dell'attività, i servizi disponibili e i contatti aggiornati direttamente dalla scheda CityCore.";
  }

  if (equalsIgnoreCase(business.addressLine1, placeholderAddress)) {
    data.addressLine1 = null;
  }

  if (equalsIgnoreCase(business.locality, "cagli")) {
    data.locality = business.city.name;
  }

  if (!business.province?.trim() && business.city.province?.trim()) {
    data.province = business.city.province;
  }

  if (Object.keys(data).length === 0) {
    console.log("Thesis demo polish: Mucho Gusto already contains clean data.");
    return;
  }

  await prisma.business.update({
    where: { id: business.id },
    data,
  });

  console.log(`Thesis demo polish: updated ${Object.keys(data).join(", ")}.`);
}

main()
  .catch((error) => {
    console.error("Thesis demo polish failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

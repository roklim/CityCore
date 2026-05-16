import { Prisma } from "@prisma/client";
import { prisma } from "../database.js";

const orderingBusinessArgs = Prisma.validator<Prisma.BusinessDefaultArgs>()({
  include: {
    city: {
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        active: true,
      },
    },
    template: {
      select: {
        id: true,
        code: true,
        name: true,
        primaryModule: true,
        defaultCtaLabel: true,
      },
    },
    modules: {
      where: {
        active: true,
      },
      orderBy: {
        moduleCode: "asc",
      },
      select: {
        id: true,
        moduleCode: true,
        active: true,
        settingsJson: true,
      },
    },
  },
});

export type OrderingBusiness = Prisma.BusinessGetPayload<typeof orderingBusinessArgs>;

export async function findBusinessForOrdering(citySlug: string, businessSlug: string) {
  return prisma.business.findFirst({
    ...orderingBusinessArgs,
    where: {
      slug: businessSlug,
      city: {
        slug: citySlug,
      },
    },
  });
}

export function hasOrderingEnabled(business: OrderingBusiness | null) {
  if (!business) {
    return false;
  }

  return (
    business.template.primaryModule === "ordering" ||
    business.modules.some((entry) => entry.moduleCode === "ordering")
  );
}

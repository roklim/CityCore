import { Prisma } from "@prisma/client";

import { prisma } from "../database.js";
import { templateCatalogMap, type TemplateCode } from "./config.js";

export async function ensureTemplateRecord(code: TemplateCode) {
  const definition = templateCatalogMap.get(code);

  if (!definition) {
    throw new Error(`Unknown template code: ${code}`);
  }

  return prisma.businessTemplate.upsert({
    where: {
      code: definition.code,
    },
    update: {
      name: definition.name,
      category: definition.category,
      primaryModule: definition.primaryModule,
      fieldSchemaJson: definition.onboardingFields as Prisma.InputJsonValue,
      sectionSchemaJson: definition.sectionTypes as Prisma.InputJsonValue,
      defaultCtaLabel: definition.defaultCtaLabel,
      active: true,
    },
    create: {
      code: definition.code,
      name: definition.name,
      category: definition.category,
      primaryModule: definition.primaryModule,
      fieldSchemaJson: definition.onboardingFields as Prisma.InputJsonValue,
      sectionSchemaJson: definition.sectionTypes as Prisma.InputJsonValue,
      defaultCtaLabel: definition.defaultCtaLabel,
      active: true,
    },
  });
}

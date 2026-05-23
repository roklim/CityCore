import { Prisma } from "@prisma/client";
import { z } from "zod";

import { updateBusinessSchema, updateCitySchema } from "./config.js";
import { hasOwn, normalizeColor, normalizeOptionalString, slugify } from "./utils.js";

export function buildCityUpdateData(input: z.infer<typeof updateCitySchema>) {
  const data: Prisma.CityUpdateInput = {};

  if (hasOwn(input, "name") && input.name) {
    data.name = input.name;
  }

  if (hasOwn(input, "slug") && input.slug) {
    data.slug = slugify(input.slug);
  }

  if (hasOwn(input, "province")) {
    data.province = normalizeOptionalString(input.province);
  }

  if (hasOwn(input, "region")) {
    data.region = normalizeOptionalString(input.region);
  }

  if (hasOwn(input, "country") && input.country) {
    data.country = input.country;
  }

  if (hasOwn(input, "status") && input.status) {
    data.status = input.status;
  }

  if (hasOwn(input, "active") && typeof input.active === "boolean") {
    data.active = input.active;
  }

  if (hasOwn(input, "heroTitle")) {
    data.heroTitle = normalizeOptionalString(input.heroTitle);
  }

  if (hasOwn(input, "heroDescription")) {
    data.heroDescription = normalizeOptionalString(input.heroDescription);
  }

  if (hasOwn(input, "seoTitle")) {
    data.seoTitle = normalizeOptionalString(input.seoTitle);
  }

  if (hasOwn(input, "seoDescription")) {
    data.seoDescription = normalizeOptionalString(input.seoDescription);
  }

  if (hasOwn(input, "registryId")) {
    data.registry = input.registryId
      ? {
          connect: {
            id: input.registryId,
          },
        }
      : {
          disconnect: true,
        };
  }

  if (hasOwn(input, "sortOrder") && typeof input.sortOrder === "number") {
    data.sortOrder = input.sortOrder;
  }

  return data;
}

export function buildBusinessUpdateData(input: z.infer<typeof updateBusinessSchema>) {
  const data: Prisma.BusinessUpdateInput = {};

  if (hasOwn(input, "name") && input.name) {
    data.name = input.name;
  }

  if (hasOwn(input, "slug") && input.slug) {
    data.slug = slugify(input.slug);
  }

  if (hasOwn(input, "legalName")) {
    data.legalName = normalizeOptionalString(input.legalName);
  }

  if (hasOwn(input, "category")) {
    data.category = input.category ?? null;
  }

  if (hasOwn(input, "status") && input.status) {
    data.status = input.status;
  }

  if (hasOwn(input, "plan") && input.plan) {
    data.plan = input.plan;
  }

  if (hasOwn(input, "subscriptionStatus") && input.subscriptionStatus) {
    data.subscriptionStatus = input.subscriptionStatus;
  }

  if (hasOwn(input, "publicEmail")) {
    data.publicEmail = input.publicEmail ?? null;
  }

  if (hasOwn(input, "publicPhone")) {
    data.publicPhone = normalizeOptionalString(input.publicPhone);
  }

  if (hasOwn(input, "website")) {
    data.website = input.website ?? null;
  }

  if (hasOwn(input, "addressLine1")) {
    data.addressLine1 = normalizeOptionalString(input.addressLine1);
  }

  if (hasOwn(input, "addressLine2")) {
    data.addressLine2 = normalizeOptionalString(input.addressLine2);
  }

  if (hasOwn(input, "postalCode")) {
    data.postalCode = normalizeOptionalString(input.postalCode);
  }

  if (hasOwn(input, "timezone") && input.timezone) {
    data.timezone = input.timezone;
  }

  if (hasOwn(input, "currency") && input.currency) {
    data.currency = input.currency;
  }

  if (hasOwn(input, "locale") && input.locale) {
    data.locale = input.locale;
  }

  if (hasOwn(input, "primaryColor")) {
    data.primaryColor = normalizeColor(input.primaryColor ?? undefined);
  }

  if (hasOwn(input, "accentColor")) {
    data.accentColor = normalizeColor(input.accentColor ?? undefined);
  }

  if (hasOwn(input, "publicTitle")) {
    data.publicTitle = normalizeOptionalString(input.publicTitle);
  }

  if (hasOwn(input, "publicSubtitle")) {
    data.publicSubtitle = normalizeOptionalString(input.publicSubtitle);
  }

  if (hasOwn(input, "publicDescription")) {
    data.publicDescription = normalizeOptionalString(input.publicDescription);
  }

  if (hasOwn(input, "seoTitle")) {
    data.seoTitle = normalizeOptionalString(input.seoTitle);
  }

  if (hasOwn(input, "seoDescription")) {
    data.seoDescription = normalizeOptionalString(input.seoDescription);
  }

  if (hasOwn(input, "bookingPolicy")) {
    data.bookingPolicy = normalizeOptionalString(input.bookingPolicy);
  }

  if (hasOwn(input, "cancellationPolicy")) {
    data.cancellationPolicy = normalizeOptionalString(input.cancellationPolicy);
  }

  if (hasOwn(input, "notesInternal")) {
    data.notesInternal = normalizeOptionalString(input.notesInternal);
  }

  return data;
}

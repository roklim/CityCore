import { z } from "zod";
import { moduleCodes } from "./config.js";

const optionalText = (max: number) =>
  z.union([z.string().trim().min(1).max(max), z.null()]).optional();
const timeValue = z.string().regex(/^\d{2}:\d{2}$/, "Expected HH:MM.");
const noHtmlText = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .refine((value) => !/<[^>]*>/u.test(value), "HTML is not accepted.");

export const categoryParamsSchema = z.object({
  citySlug: z.string().trim().min(2).max(120),
  categoryId: z.string().trim().min(1),
});

export const cityParamsSchema = z.object({ citySlug: z.string().trim().min(2).max(120) });
export const businessParamsSchema = z.object({
  citySlug: z.string().trim().min(2).max(120),
  businessSlug: z.string().trim().min(2).max(160),
});
export const businessCategoryParamsSchema = businessParamsSchema.extend({
  categoryId: z.string().trim().min(1),
});

export const createCategorySchema = z.object({
  name: z.string().trim().min(2).max(160),
  slug: z.string().trim().min(1).max(160).optional(),
  description: optionalText(2_000),
  parentId: z.union([z.string().trim().min(1), z.null()]).optional(),
  sortOrder: z.number().int().min(0).max(10_000).default(0),
  active: z.boolean().default(true),
});

export const updateCategorySchema = createCategorySchema.partial();
export const replaceBusinessCategoriesSchema = z
  .object({
    categoryIds: z.array(z.string().trim().min(1)).min(1).max(20),
    primaryCategoryId: z.union([z.string().trim().min(1), z.null()]).optional(),
  })
  .superRefine((value, context) => {
    if (new Set(value.categoryIds).size !== value.categoryIds.length) {
      context.addIssue({
        code: "custom",
        path: ["categoryIds"],
        message: "Categories must be unique.",
      });
    }
    if (value.primaryCategoryId && !value.categoryIds.includes(value.primaryCategoryId)) {
      context.addIssue({
        code: "custom",
        path: ["primaryCategoryId"],
        message: "Primary category must be assigned.",
      });
    }
  });

export const serviceParamsSchema = businessParamsSchema.extend({
  serviceId: z.string().trim().min(1),
});
export const serviceSchema = z.object({
  name: z.string().trim().min(2).max(160),
  slug: z.string().trim().min(1).max(160).optional(),
  shortDescription: optionalText(280),
  description: optionalText(5_000),
  priceLabel: optionalText(80),
  priceCents: z.union([z.number().int().positive().max(1_000_000), z.null()]).optional(),
  durationMinutes: z.union([z.number().int().positive().max(1_440), z.null()]).optional(),
  pickupEnabled: z.boolean().default(false),
  status: z.enum(["draft", "in_review", "published", "archived"]).default("draft"),
  sortOrder: z.number().int().min(0).max(10_000).default(0),
});
export const updateServiceSchema = serviceSchema.partial();

export const replaceBusinessModulesSchema = z
  .object({ moduleCodes: z.array(z.enum(moduleCodes)).max(moduleCodes.length) })
  .superRefine((value, context) => {
    if (new Set(value.moduleCodes).size !== value.moduleCodes.length) {
      context.addIssue({
        code: "custom",
        path: ["moduleCodes"],
        message: "Modules must be unique.",
      });
    }
  });

const openingIntervalSchema = z.object({ opensAt: timeValue, closesAt: timeValue });
export const replaceOpeningWeekSchema = z.object({
  days: z
    .array(
      z.object({
        weekday: z.number().int().min(0).max(6),
        isClosed: z.boolean(),
        note: optionalText(280),
        intervals: z.array(openingIntervalSchema).max(4),
      }),
    )
    .length(7),
});

export const inquiryStatusSchema = z.enum(["new", "read", "closed"]);
export const publicInquirySchema = z.object({
  name: noHtmlText(120).min(2),
  email: z.string().trim().email().max(200),
  phone: z.union([noHtmlText(60), z.null()]).optional(),
  message: noHtmlText(4_000).min(10),
  privacyAccepted: z.literal(true),
  company: z.union([noHtmlText(120), z.literal("")]).optional(),
});
export const inquiryListQuerySchema = z.object({
  status: inquiryStatusSchema.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
export const inquiryParamsSchema = businessParamsSchema.extend({
  inquiryId: z.string().trim().min(1),
});
export const updateInquirySchema = z.object({
  status: inquiryStatusSchema.optional(),
  internalNote: optionalText(2_000),
});

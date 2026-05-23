import { Prisma } from "@prisma/client";
import { z } from "zod";

export function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizeOptionalString(value?: string | null) {
  return value && value.trim().length > 0 ? value.trim() : null;
}

export function normalizeColor(value?: string) {
  if (!value) {
    return null;
  }

  return value.startsWith("#") ? value : `#${value}`;
}

export function hasOwn<T extends object>(value: T, key: keyof T) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

export function parsePayload<T>(schema: z.ZodSchema<T>, payload: unknown) {
  const result = schema.safeParse(payload);

  if (!result.success) {
    return {
      success: false as const,
      response: {
        statusCode: 400,
        body: {
          status: "error",
          error: "Invalid request payload",
          details: z.treeifyError(result.error),
        },
      },
    };
  }

  return {
    success: true as const,
    data: result.data,
  };
}

export function isPrismaError(error: unknown, code: string) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
}

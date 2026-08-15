import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { FastifyRequest, preHandlerHookHandler } from "fastify";
import { prisma } from "./database.js";
import { env } from "./config.js";

const permissionCodes = [
  "platform.read",
  "platform.manage",
  "cities.read",
  "cities.manage",
  "businesses.read",
  "businesses.manage",
  "business_users.manage",
  "content.manage",
  "catalog.manage",
  "modules.manage",
  "profile.manage",
  "settings.manage",
  "events.manage",
  "listings.manage",
] as const;

export type AccessRole = "global_admin" | "city_admin" | "local_admin" | "staff";
export type ScopeType = "platform" | "city" | "business";
export type UserStatus = "invited" | "active" | "disabled";
export type PlatformPermission = (typeof permissionCodes)[number];

type TokenPayload = {
  sub: string;
  authVersion: number;
  activeAccessId?: string;
  iat: number;
  exp: number;
};

type AccessGrantRecord = {
  id: string;
  role: AccessRole;
  scopeType: ScopeType;
  cityId: string | null;
  businessId: string | null;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  city: {
    id: string;
    name: string;
    slug: string;
    status: "active" | "coming_soon" | "disabled";
  } | null;
  business: {
    id: string;
    name: string;
    slug: string;
    status: "draft" | "active" | "paused" | "disabled";
    city: {
      id: string;
      name: string;
      slug: string;
      status: "active" | "coming_soon" | "disabled";
    };
  } | null;
};

type SessionAccess = {
  id: string;
  role: AccessRole;
  scopeType: ScopeType;
  cityId: string | null;
  businessId: string | null;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  permissions: readonly PlatformPermission[];
  city: {
    id: string;
    name: string;
    slug: string;
    status: "active" | "coming_soon" | "disabled";
  } | null;
  business: {
    id: string;
    name: string;
    slug: string;
    status: "draft" | "active" | "paused" | "disabled";
    city: {
      id: string;
      name: string;
      slug: string;
      status: "active" | "coming_soon" | "disabled";
    };
  } | null;
};

export type AuthContext = {
  user: {
    id: string;
    email: string;
    name: string | null;
    phone: string | null;
    status: UserStatus;
    lastLoginAt: Date | null;
    authVersion: number;
    createdAt: Date;
    updatedAt: Date;
  };
  accesses: SessionAccess[];
  defaultAccess: SessionAccess;
  activeAccess: SessionAccess;
  redirectTo: string;
  token: TokenPayload;
};

export type PermissionContext = {
  scopeType?: ScopeType;
  cityId?: string | null;
  businessId?: string | null;
};

declare module "fastify" {
  interface FastifyRequest {
    auth?: AuthContext;
  }
}

const rolePriority: Record<AccessRole, number> = {
  global_admin: 0,
  city_admin: 1,
  local_admin: 2,
  staff: 3,
};

const rolePermissions: Record<AccessRole, readonly PlatformPermission[]> = {
  global_admin: permissionCodes,
  city_admin: [
    "platform.read",
    "cities.read",
    "cities.manage",
    "businesses.read",
    "businesses.manage",
    "business_users.manage",
    "events.manage",
    "listings.manage",
  ],
  local_admin: [
    "businesses.read",
    "businesses.manage",
    "content.manage",
    "catalog.manage",
    "modules.manage",
    "settings.manage",
    "events.manage",
    "listings.manage",
  ],
  staff: [
    "businesses.read",
    "content.manage",
    "catalog.manage",
    "events.manage",
    "listings.manage",
  ],
};

export const authTokenTtlSeconds = parseDurationToSeconds("8h");

function parseDurationToSeconds(input: string) {
  const match = /^(\d+)(s|m|h|d)?$/i.exec(input.trim());

  if (!match) {
    throw new Error(`Unsupported auth duration: ${input}`);
  }

  const value = Number(match[1]);
  const unit = (match[2] ?? "s").toLowerCase();

  if (unit === "s") {
    return value;
  }

  if (unit === "m") {
    return value * 60;
  }

  if (unit === "h") {
    return value * 60 * 60;
  }

  return value * 60 * 60 * 24;
}

function encodeBase64Url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function mapAccessGrant(grant: AccessGrantRecord): SessionAccess {
  return {
    id: grant.id,
    role: grant.role,
    scopeType: grant.scopeType,
    cityId: grant.business?.city.id ?? grant.cityId,
    businessId: grant.businessId,
    lastUsedAt: grant.lastUsedAt,
    createdAt: grant.createdAt,
    updatedAt: grant.updatedAt,
    permissions: rolePermissions[grant.role],
    city: grant.business?.city ?? grant.city,
    business: grant.business,
  };
}

function isStructurallyValidAccessGrant(grant: AccessGrantRecord) {
  if (grant.role === "global_admin") {
    return grant.scopeType === "platform" && grant.cityId === null && grant.businessId === null;
  }

  if (grant.role === "city_admin") {
    return grant.scopeType === "city" && Boolean(grant.cityId && grant.city);
  }

  return (
    grant.scopeType === "business" &&
    Boolean(grant.businessId && grant.business && grant.business.city.id)
  );
}

function sortAccesses(accesses: SessionAccess[]) {
  return [...accesses].sort((left, right) => {
    const priorityDiff = rolePriority[left.role] - rolePriority[right.role];

    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    return left.createdAt.getTime() - right.createdAt.getTime();
  });
}

function resolveRedirectForAccess(access: SessionAccess) {
  if (access.role === "global_admin" || access.role === "city_admin") {
    return "/admin";
  }

  if (!access.business?.slug || !access.city?.slug) {
    return "/admin";
  }

  return `/${access.city.slug}/${access.business.slug}/admin`;
}

function buildDefaultAccess(accesses: SessionAccess[], activeAccessId?: string) {
  const sorted = sortAccesses(accesses);
  const defaultAccess = sorted[0];
  const activeAccess = sorted.find((access) => access.id === activeAccessId) ?? defaultAccess;

  if (!defaultAccess || !activeAccess) {
    return null;
  }

  return {
    defaultAccess,
    activeAccess,
  };
}

function signRawToken(payload: TokenPayload) {
  const header = {
    alg: "HS256",
    typ: "JWT",
  };
  const encodedHeader = encodeBase64Url(JSON.stringify(header));
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signature = createHmac("sha256", env.AUTH_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64url");

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function verifyRawToken(token: string): TokenPayload | null {
  const parts = token.split(".");

  if (parts.length !== 3) {
    return null;
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const expectedSignature = createHmac("sha256", env.AUTH_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest();
  const receivedSignature = Buffer.from(signature, "base64url");

  if (
    expectedSignature.length !== receivedSignature.length ||
    !timingSafeEqual(expectedSignature, receivedSignature)
  ) {
    return null;
  }

  try {
    const header = JSON.parse(decodeBase64Url(encodedHeader));

    if (header.alg !== "HS256" || header.typ !== "JWT") {
      return null;
    }

    const payload = JSON.parse(decodeBase64Url(encodedPayload)) as TokenPayload;

    if (
      typeof payload.sub !== "string" ||
      typeof payload.authVersion !== "number" ||
      typeof payload.iat !== "number" ||
      typeof payload.exp !== "number"
    ) {
      return null;
    }

    if (payload.exp * 1000 <= Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derivedKey = scryptSync(password, salt, 64);

  return `scrypt$${salt.toString("base64url")}$${derivedKey.toString("base64url")}`;
}

export function verifyPassword(password: string, passwordHash: string | null | undefined) {
  if (!passwordHash) {
    return false;
  }

  const [algorithm, saltValue, hashValue] = passwordHash.split("$");

  if (algorithm !== "scrypt" || !saltValue || !hashValue) {
    return false;
  }

  const salt = Buffer.from(saltValue, "base64url");
  const expectedHash = Buffer.from(hashValue, "base64url");
  const derivedKey = scryptSync(password, salt, expectedHash.length);

  return timingSafeEqual(expectedHash, derivedKey);
}

export function createAuthToken(userId: string, authVersion: number, activeAccessId?: string) {
  const issuedAtSeconds = Math.floor(Date.now() / 1000);

  return signRawToken({
    sub: userId,
    authVersion,
    activeAccessId,
    iat: issuedAtSeconds,
    exp: issuedAtSeconds + authTokenTtlSeconds,
  });
}

function getRolePermissions(role: AccessRole) {
  return rolePermissions[role];
}

function scopeMatches(access: SessionAccess, context: PermissionContext = {}) {
  if (!context.scopeType) {
    return true;
  }

  if (access.role === "global_admin" && access.scopeType === "platform") {
    return true;
  }

  if (context.scopeType === "platform") {
    return access.scopeType === "platform";
  }

  if (context.scopeType === "city") {
    return access.scopeType === "city" && access.cityId === context.cityId;
  }

  if (context.scopeType === "business") {
    if (access.scopeType === "business") {
      return access.businessId === context.businessId;
    }

    if (access.scopeType === "city") {
      return Boolean(context.cityId) && access.cityId === context.cityId;
    }
  }

  return false;
}

export function canAccess(
  access: SessionAccess,
  permission: PlatformPermission,
  context: PermissionContext = {},
) {
  return getRolePermissions(access.role).includes(permission) && scopeMatches(access, context);
}

export async function buildAuthContext(userId: string, activeAccessId?: string) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      status: true,
      lastLoginAt: true,
      authVersion: true,
      createdAt: true,
      updatedAt: true,
      accessGrants: {
        where: {
          active: true,
        },
        include: {
          city: {
            select: {
              id: true,
              name: true,
              slug: true,
              status: true,
            },
          },
          business: {
            select: {
              id: true,
              name: true,
              slug: true,
              status: true,
              city: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  status: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user || user.status === "disabled") {
    return null;
  }

  const accesses = user.accessGrants.filter(isStructurallyValidAccessGrant).map(mapAccessGrant);
  const defaults = buildDefaultAccess(accesses, activeAccessId);

  if (!defaults) {
    return null;
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      status: user.status,
      lastLoginAt: user.lastLoginAt,
      authVersion: user.authVersion,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    accesses,
    defaultAccess: defaults.defaultAccess,
    activeAccess: defaults.activeAccess,
    redirectTo:
      activeAccessId != null
        ? resolveRedirectForAccess(defaults.activeAccess)
        : accesses.length > 1
          ? "/select-access"
          : resolveRedirectForAccess(defaults.activeAccess),
    token: {
      sub: user.id,
      authVersion: user.authVersion,
      activeAccessId: defaults.activeAccess.id,
      iat: 0,
      exp: 0,
    },
  } satisfies Omit<AuthContext, "token"> & { token: TokenPayload };
}

export async function touchAccessGrant(accessGrantId: string) {
  await prisma.accessGrant.update({
    where: {
      id: accessGrantId,
    },
    data: {
      lastUsedAt: new Date(),
    },
  });
}

function readBearerToken(request: FastifyRequest) {
  const header = request.headers.authorization;

  if (!header) {
    return null;
  }

  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token.trim();
}

async function authenticateRequest(request: FastifyRequest) {
  if (request.auth) {
    return request.auth;
  }

  const token = readBearerToken(request);

  if (!token) {
    return null;
  }

  const payload = verifyRawToken(token);

  if (!payload) {
    return null;
  }

  const auth = await buildAuthContext(payload.sub, payload.activeAccessId);

  if (!auth || auth.user.authVersion !== payload.authVersion) {
    return null;
  }

  request.auth = {
    ...auth,
    token: payload,
  };

  return request.auth;
}

export function getRequestAuth(request: FastifyRequest) {
  if (!request.auth) {
    throw new Error("Request auth context is not available.");
  }

  return request.auth;
}

export const requireAuth: preHandlerHookHandler = async (request, reply) => {
  const auth = await authenticateRequest(request);

  if (!auth) {
    return reply.code(401).send({
      status: "error",
      error: "Authentication required",
    });
  }
};

export function requirePermission(
  permission: PlatformPermission,
  contextResolver?: (request: FastifyRequest) => PermissionContext,
) {
  const handler: preHandlerHookHandler = async (request, reply) => {
    const auth = await authenticateRequest(request);

    if (!auth) {
      return reply.code(401).send({
        status: "error",
        error: "Authentication required",
      });
    }

    const context = contextResolver?.(request) ?? {
      scopeType: auth.activeAccess.scopeType,
      cityId: auth.activeAccess.cityId,
      businessId: auth.activeAccess.businessId,
    };

    if (!canAccess(auth.activeAccess, permission, context)) {
      return reply.code(403).send({
        status: "error",
        error: "Insufficient permissions",
      });
    }
  };

  return handler;
}

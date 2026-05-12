import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  authTokenTtlSeconds,
  buildAuthContext,
  createAuthToken,
  getRequestAuth,
  hashPassword,
  requireAuth,
  touchAccessGrant,
  verifyPassword,
} from "./auth.js";
import { prisma } from "./database.js";

const bootstrapAdminSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(200),
  name: z.string().trim().min(2).max(120).optional(),
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1).max(200),
  accessGrantId: z.string().trim().min(1).optional(),
});

const selectAccessSchema = z.object({
  accessGrantId: z.string().trim().min(1),
});

function parsePayload<T>(schema: z.ZodSchema<T>, payload: unknown) {
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

function toSessionResponse(
  context: NonNullable<Awaited<ReturnType<typeof buildAuthContext>>>,
  token: string,
) {
  return {
    status: "ok",
    token,
    expiresIn: authTokenTtlSeconds,
    user: context.user,
    accesses: context.accesses,
    defaultAccess: context.defaultAccess,
    activeAccess: context.activeAccess,
    redirectTo: context.redirectTo,
  };
}

async function audit(
  action: string,
  options: {
    actorUserId?: string | null;
    targetId?: string | null;
    metadata?: Record<string, unknown>;
  } = {},
) {
  await prisma.auditLog.create({
    data: {
      actorUserId: options.actorUserId ?? null,
      action,
      targetType: "auth",
      targetId: options.targetId ?? null,
      scopeType: "platform",
      metadataJson: (options.metadata ?? {}) as unknown as object,
    },
  });
}

export function registerAuthRoutes(app: FastifyInstance) {
  app.post("/api/v2/auth/bootstrap-admin", async (request, reply) => {
    const parsed = parsePayload(bootstrapAdminSchema, request.body);

    if (!parsed.success) {
      return reply.code(parsed.response.statusCode).send(parsed.response.body);
    }

    const existingGlobalAdminCount = await prisma.accessGrant.count({
      where: {
        role: "global_admin",
        scopeType: "platform",
        active: true,
      },
    });

    if (existingGlobalAdminCount > 0) {
      return reply.code(409).send({
        status: "error",
        error: "A global admin already exists.",
      });
    }

    const passwordHash = hashPassword(parsed.data.password);

    const user = await prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findUnique({
        where: {
          email: parsed.data.email,
        },
        select: {
          id: true,
        },
      });

      const createdOrUpdatedUser = existingUser
        ? await tx.user.update({
            where: {
              id: existingUser.id,
            },
            data: {
              email: parsed.data.email,
              name: parsed.data.name?.trim() ?? null,
              status: "active",
              passwordHash,
              authVersion: {
                increment: 1,
              },
            },
            select: {
              id: true,
            },
          })
        : await tx.user.create({
            data: {
              email: parsed.data.email,
              name: parsed.data.name?.trim() ?? null,
              status: "active",
              passwordHash,
            },
            select: {
              id: true,
            },
          });

      await tx.accessGrant.create({
        data: {
          userId: createdOrUpdatedUser.id,
          role: "global_admin",
          scopeType: "platform",
          active: true,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: createdOrUpdatedUser.id,
          action: "platform.auth.bootstrap_admin_created",
          targetType: "user",
          targetId: createdOrUpdatedUser.id,
          scopeType: "platform",
          metadataJson: {
            email: parsed.data.email,
          },
        },
      });

      return createdOrUpdatedUser;
    });

    const context = await buildAuthContext(user.id, undefined);

    if (!context) {
      return reply.code(500).send({
        status: "error",
        error: "Failed to initialize admin session",
      });
    }

    await touchAccessGrant(context.activeAccess.id);

    const refreshedContext = await buildAuthContext(user.id, context.activeAccess.id);

    if (!refreshedContext) {
      return reply.code(500).send({
        status: "error",
        error: "Failed to initialize admin session",
      });
    }

    const token = createAuthToken(
      user.id,
      refreshedContext.user.authVersion,
      refreshedContext.activeAccess.id,
    );

    return reply.code(201).send(toSessionResponse(refreshedContext, token));
  });

  app.post("/api/v2/auth/login", async (request, reply) => {
    const parsed = parsePayload(loginSchema, request.body);

    if (!parsed.success) {
      return reply.code(parsed.response.statusCode).send(parsed.response.body);
    }

    const user = await prisma.user.findUnique({
      where: {
        email: parsed.data.email,
      },
      select: {
        id: true,
        email: true,
        status: true,
        passwordHash: true,
        authVersion: true,
      },
    });

    if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
      await audit("platform.auth.login_failed", {
        metadata: {
          email: parsed.data.email,
          reason: "invalid_credentials",
        },
      });

      return reply.code(401).send({
        status: "error",
        error: "Invalid credentials",
      });
    }

    if (user.status !== "active") {
      await audit("platform.auth.login_failed", {
        actorUserId: user.id,
        targetId: user.id,
        metadata: {
          email: user.email,
          reason: "inactive_account",
          status: user.status,
        },
      });

      return reply.code(403).send({
        status: "error",
        error: "Account is not active",
      });
    }

    const initialContext = await buildAuthContext(user.id);

    if (!initialContext || initialContext.accesses.length === 0) {
      await audit("platform.auth.login_failed", {
        actorUserId: user.id,
        targetId: user.id,
        metadata: {
          email: user.email,
          reason: "no_access_grants",
        },
      });

      return reply.code(403).send({
        status: "error",
        error: "No active access grants found",
      });
    }

    let selectedAccessId = initialContext.defaultAccess.id;

    if (parsed.data.accessGrantId) {
      const requestedAccess = initialContext.accesses.find(
        (access) => access.id === parsed.data.accessGrantId,
      );

      if (!requestedAccess) {
        return reply.code(403).send({
          status: "error",
          error: "Requested access grant is not available for this user",
        });
      }

      selectedAccessId = requestedAccess.id;
    }

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        lastLoginAt: new Date(),
      },
    });

    await touchAccessGrant(selectedAccessId);

    const context = await buildAuthContext(
      user.id,
      parsed.data.accessGrantId ? selectedAccessId : undefined,
    );

    if (!context) {
      return reply.code(500).send({
        status: "error",
        error: "Failed to create auth session",
      });
    }

    const token = createAuthToken(user.id, user.authVersion, selectedAccessId);

    await audit("platform.auth.login_succeeded", {
      actorUserId: user.id,
      targetId: user.id,
      metadata: {
        activeAccessId: selectedAccessId,
        accessCount: context.accesses.length,
      },
    });

    return reply.send(toSessionResponse(context, token));
  });

  app.get("/api/v2/auth/me", { preHandler: requireAuth }, async (request, reply) => {
    const auth = getRequestAuth(request);

    return reply.send({
      status: "ok",
      expiresIn: authTokenTtlSeconds,
      user: auth.user,
      accesses: auth.accesses,
      defaultAccess: auth.defaultAccess,
      activeAccess: auth.activeAccess,
      redirectTo: auth.redirectTo,
    });
  });

  app.post("/api/v2/auth/select-access", { preHandler: requireAuth }, async (request, reply) => {
    const parsed = parsePayload(selectAccessSchema, request.body);

    if (!parsed.success) {
      return reply.code(parsed.response.statusCode).send(parsed.response.body);
    }

    const auth = getRequestAuth(request);
    const selectedAccess = auth.accesses.find((access) => access.id === parsed.data.accessGrantId);

    if (!selectedAccess) {
      return reply.code(403).send({
        status: "error",
        error: "Requested access grant is not available for this user",
      });
    }

    await touchAccessGrant(selectedAccess.id);

    const refreshedContext = await buildAuthContext(auth.user.id, selectedAccess.id);

    if (!refreshedContext) {
      return reply.code(500).send({
        status: "error",
        error: "Failed to switch active access",
      });
    }

    const token = createAuthToken(
      auth.user.id,
      refreshedContext.user.authVersion,
      refreshedContext.activeAccess.id,
    );

    await audit("platform.auth.access_switched", {
      actorUserId: auth.user.id,
      targetId: auth.user.id,
      metadata: {
        activeAccessId: refreshedContext.activeAccess.id,
      },
    });

    return reply.send(toSessionResponse(refreshedContext, token));
  });
}

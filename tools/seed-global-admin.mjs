import { randomBytes, scryptSync } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";

const HELP_TEXT = `
seed:global-admin

Uso:
  npm run seed:global-admin

Env opzionali:
  GLOBAL_ADMIN_EMAIL=...
  GLOBAL_ADMIN_PASSWORD=...
  GLOBAL_ADMIN_NAME=...
  GLOBAL_ADMIN_PHONE=...

Comportamento:
  - crea o aggiorna un utente attivo
  - garantisce un access grant \`global_admin\` su scope \`platform\`
  - lascia invariati eventuali scope city/business gia presenti
  - scrive un audit log tecnico di seed
  - stampa le credenziali e il redirect atteso
`;

const currentDir = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(currentDir, "../apps/api/.env") });

const prisma = new PrismaClient();

const defaults = {
  email: process.env.GLOBAL_ADMIN_EMAIL?.trim() || "global-admin@citycore.local",
  password: process.env.GLOBAL_ADMIN_PASSWORD?.trim() || "CityCoreAdmin123!",
  name: process.env.GLOBAL_ADMIN_NAME?.trim() || "CityCore Global Admin",
  phone: process.env.GLOBAL_ADMIN_PHONE?.trim() || null,
};

function hashPassword(password) {
  const salt = randomBytes(16);
  const derivedKey = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("base64url")}$${derivedKey.toString("base64url")}`;
}

async function ensureGlobalAdmin() {
  const passwordHash = hashPassword(defaults.password);

  return prisma.$transaction(async (tx) => {
    const existingUser = await tx.user.findUnique({
      where: {
        email: defaults.email,
      },
      select: {
        id: true,
      },
    });

    const user = existingUser
      ? await tx.user.update({
          where: {
            id: existingUser.id,
          },
          data: {
            name: defaults.name,
            phone: defaults.phone,
            status: "active",
            passwordHash,
            authVersion: {
              increment: 1,
            },
          },
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            status: true,
            authVersion: true,
            createdAt: true,
            updatedAt: true,
          },
        })
      : await tx.user.create({
          data: {
            email: defaults.email,
            name: defaults.name,
            phone: defaults.phone,
            status: "active",
            passwordHash,
          },
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            status: true,
            authVersion: true,
            createdAt: true,
            updatedAt: true,
          },
        });

    const existingGrant = await tx.accessGrant.findFirst({
      where: {
        userId: user.id,
        role: "global_admin",
        scopeType: "platform",
        cityId: null,
        businessId: null,
      },
      select: {
        id: true,
      },
    });

    const accessGrant = existingGrant
      ? await tx.accessGrant.update({
          where: {
            id: existingGrant.id,
          },
          data: {
            active: true,
          },
          select: {
            id: true,
            active: true,
            createdAt: true,
            updatedAt: true,
          },
        })
      : await tx.accessGrant.create({
          data: {
            userId: user.id,
            role: "global_admin",
            scopeType: "platform",
            active: true,
          },
          select: {
            id: true,
            active: true,
            createdAt: true,
            updatedAt: true,
          },
        });

    await tx.auditLog.create({
      data: {
        actorUserId: user.id,
        action: "platform.seed.global_admin",
        targetType: "user",
        targetId: user.id,
        scopeType: "platform",
        metadataJson: {
          email: user.email,
          source: "tools/seed-global-admin.mjs",
          accessGrantId: accessGrant.id,
        },
      },
    });

    return {
      user,
      accessGrant,
    };
  });
}

function printSummary(summary) {
  console.log("[seed:global-admin] platform admin ready");
  console.log(JSON.stringify(summary, null, 2));
  console.log("");
  console.log("[seed:global-admin] login guide");
  console.log(
    [`email: ${summary.email}`, `password: ${summary.password}`, "expectedRedirect: /admin"].join(
      "\n",
    ),
  );
}

async function main() {
  if (process.argv.includes("--help")) {
    console.log(HELP_TEXT.trim());
    return;
  }

  const result = await ensureGlobalAdmin();

  printSummary({
    userId: result.user.id,
    email: result.user.email,
    password: defaults.password,
    name: result.user.name,
    phone: result.user.phone,
    status: result.user.status,
    authVersion: result.user.authVersion,
    accessGrantId: result.accessGrant.id,
    accessGrantActive: result.accessGrant.active,
    expectedRedirect: "/admin",
  });
}

main()
  .catch((error) => {
    console.error("[seed:global-admin] failure");
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

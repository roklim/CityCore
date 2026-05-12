const HELP_TEXT = `
verify:ordering

Uso:
  npm run verify:ordering

Env opzionali:
  ORDERING_BASE_URL=http://localhost:4000
  ORDERING_CITY_SLUG=...
  ORDERING_BUSINESS_SLUG=...
  ORDERING_PHONE=...
  ORDERING_SMOKE_CREATE=1
  ORDERING_ADMIN_TOKEN=...
  ORDERING_ADMIN_EMAIL=...
  ORDERING_ADMIN_PASSWORD=...
  ORDERING_ACCESS_GRANT_ID=...
  ORDERING_SMOKE_ADMIN_MUTATIONS=1

Comportamento:
  - verifica /health e /api/v2/ordering
  - scopre un business ordering V2 se gli slug non sono forniti
  - se il tenant non esiste ancora, usa prima npm run seed:ordering
  - verifica menu pubblico e availability pubblica
  - verifica customer lookup
  - crea un ordine di test se ORDERING_SMOKE_CREATE=1
  - verifica tracking ordine
  - prova login admin V2 se non esiste ORDERING_ADMIN_TOKEN
  - verifica settings, menu admin, stats, lista ordini e coupon admin
  - puo creare/disattivare/eliminare un coupon smoke se ORDERING_SMOKE_ADMIN_MUTATIONS=1
  - puo aggiornare lo stato dell'ordine creato se esiste sessione admin
`;

function getBaseUrl() {
  return (process.env.ORDERING_BASE_URL || "http://localhost:4000").replace(/\/+$/, "");
}

function logStep(label, payload) {
  console.log(`\n[ordering-smoke] ${label}`);

  if (payload !== undefined) {
    console.log(typeof payload === "string" ? payload : JSON.stringify(payload, null, 2));
  }
}

function toErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

async function fetchJson(path, { method = "GET", token, body } = {}) {
  const response = await fetch(`${getBaseUrl()}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const message =
      data && typeof data === "object" && typeof data.error === "string"
        ? data.error
        : `Request failed with status ${response.status}`;

    throw new Error(`${method} ${path}: ${message}`);
  }

  return data;
}

async function runStep(results, label, fn, { optional = false } = {}) {
  try {
    const payload = await fn();
    results.push({ label, ok: true, optional, payload });
    logStep(label, payload);
    return payload;
  } catch (error) {
    const message = toErrorMessage(error);
    results.push({ label, ok: false, optional, error: message });
    logStep(label, optional ? `skipped/failed: ${message}` : `failed: ${message}`);

    if (!optional) {
      throw error;
    }

    return null;
  }
}

function isOrderingBusiness(business) {
  return (
    business?.template?.primaryModule === "ordering" ||
    business?.modules?.some((entry) => entry.active && entry.moduleCode === "ordering")
  );
}

function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date, amount) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

function randomCouponCode() {
  return `SMOKE${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

async function resolveTargetBusiness(adminSession) {
  const citySlug = process.env.ORDERING_CITY_SLUG?.trim();
  const businessSlug = process.env.ORDERING_BUSINESS_SLUG?.trim();

  if (citySlug && businessSlug) {
    return { citySlug, businessSlug };
  }

  const response = await fetchJson("/api/v2/public/businesses?limit=24");
  const business = response.items?.find(isOrderingBusiness);

  if (!business) {
    const activeBusiness = adminSession?.auth?.activeAccess?.business;

    if (activeBusiness?.slug && activeBusiness.city?.slug) {
      return {
        citySlug: activeBusiness.city.slug,
        businessSlug: activeBusiness.slug,
      };
    }

    if (adminSession?.token) {
      const adminBusinesses = await fetchJson("/api/v2/platform-core/businesses?limit=24", {
        token: adminSession.token,
      });
      const adminBusiness = adminBusinesses.items?.find(isOrderingBusiness);

      if (adminBusiness) {
        return {
          citySlug: adminBusiness.city.slug,
          businessSlug: adminBusiness.slug,
        };
      }
    }

    throw new Error(
      "No ordering-enabled business found. Provide ORDERING_CITY_SLUG/ORDERING_BUSINESS_SLUG or admin credentials with access to an ordering business.",
    );
  }

  return {
    citySlug: business.city.slug,
    businessSlug: business.slug,
  };
}

async function findAvailabilityTarget(citySlug, businessSlug) {
  const firstDate = getTodayDateString();

  for (let offset = 0; offset < 7; offset += 1) {
    const date = addDays(firstDate, offset);
    const response = await fetchJson(
      `/api/v2/ordering/public/${citySlug}/${businessSlug}/availability?date=${date}`,
    );
    const slot = response.slots?.find((entry) => entry.available);

    if (slot) {
      return {
        date,
        availability: response,
        slot,
      };
    }
  }

  throw new Error("No available pickup slot found in the next 7 days");
}

async function resolveAdminSession(target, existingSession = null) {
  if (existingSession) {
    const forcedAccessId = process.env.ORDERING_ACCESS_GRANT_ID?.trim();

    if (forcedAccessId && existingSession.auth.activeAccess?.id !== forcedAccessId) {
      const switched = await fetchJson("/api/v2/auth/select-access", {
        method: "POST",
        token: existingSession.token,
        body: {
          accessGrantId: forcedAccessId,
        },
      });

      return {
        token: switched.token,
        auth: switched,
        source: existingSession.source,
      };
    }

    const matchingAccess =
      existingSession.auth.accesses?.find(
        (access) =>
          access.scopeType === "business" &&
          access.city?.slug === target.citySlug &&
          access.business?.slug === target.businessSlug,
      ) ?? null;

    if (matchingAccess && existingSession.auth.activeAccess?.id !== matchingAccess.id) {
      const switched = await fetchJson("/api/v2/auth/select-access", {
        method: "POST",
        token: existingSession.token,
        body: {
          accessGrantId: matchingAccess.id,
        },
      });

      return {
        token: switched.token,
        auth: switched,
        source: existingSession.source,
      };
    }

    return existingSession;
  }

  if (process.env.ORDERING_ADMIN_TOKEN?.trim()) {
    const token = process.env.ORDERING_ADMIN_TOKEN.trim();
    const auth = await fetchJson("/api/v2/auth/me", { token });
    return {
      token,
      auth,
      source: "env-token",
    };
  }

  const email = process.env.ORDERING_ADMIN_EMAIL?.trim();
  const password = process.env.ORDERING_ADMIN_PASSWORD?.trim();

  if (!email || !password) {
    return null;
  }

  const login = await fetchJson("/api/v2/auth/login", {
    method: "POST",
    body: {
      email,
      password,
    },
  });

  let token = login.token;
  let auth = login;
  const forcedAccessId = process.env.ORDERING_ACCESS_GRANT_ID?.trim();

  if (forcedAccessId) {
    auth = await fetchJson("/api/v2/auth/select-access", {
      method: "POST",
      token,
      body: {
        accessGrantId: forcedAccessId,
      },
    });
    token = auth.token;
  } else {
    const matchingAccess =
      auth.accesses?.find(
        (access) =>
          access.scopeType === "business" &&
          access.city?.slug === target.citySlug &&
          access.business?.slug === target.businessSlug,
      ) ?? null;

    if (matchingAccess && auth.activeAccess?.id !== matchingAccess.id) {
      auth = await fetchJson("/api/v2/auth/select-access", {
        method: "POST",
        token,
        body: {
          accessGrantId: matchingAccess.id,
        },
      });
      token = auth.token;
    }
  }

  return {
    token,
    auth,
    source: "login",
  };
}

function buildSummary(results) {
  const requiredPassed = results.filter((entry) => entry.ok && !entry.optional).length;
  const requiredFailed = results.filter((entry) => !entry.ok && !entry.optional).length;
  const optionalFailed = results.filter((entry) => !entry.ok && entry.optional).length;

  return {
    requiredPassed,
    requiredFailed,
    optionalFailed,
    total: results.length,
  };
}

function assertOrderingCapabilities(response) {
  const requiredKeys = [
    "publicMenu",
    "publicAvailability",
    "adminMenu",
    "publicCustomerLookup",
    "adminCustomers",
    "adminCoupons",
    "adminSettings",
  ];

  const capabilities = response?.capabilities ?? {};
  const missing = requiredKeys.filter((key) => !(key in capabilities));

  if (missing.length > 0) {
    throw new Error(
      `Ordering capabilities missing: ${missing.join(", ")}. Runtime may be stale and need restart/redeploy.`,
    );
  }

  return {
    milestone: response?.milestone ?? null,
    capabilities: requiredKeys,
  };
}

async function main() {
  if (process.argv.includes("--help")) {
    console.log(HELP_TEXT.trim());
    return;
  }

  const results = [];

  await runStep(results, "health", () => fetchJson("/health"));
  await runStep(results, "ordering capabilities", async () => {
    const response = await fetchJson("/api/v2/ordering");
    return assertOrderingCapabilities(response);
  });

  let seedAdminSession = null;

  await runStep(
    results,
    "admin seed session",
    async () => {
      const session = await resolveAdminSession(
        {
          citySlug: process.env.ORDERING_CITY_SLUG?.trim() || "",
          businessSlug: process.env.ORDERING_BUSINESS_SLUG?.trim() || "",
        },
        null,
      );

      if (!session) {
        throw new Error(
          "Provide ORDERING_ADMIN_TOKEN or ORDERING_ADMIN_EMAIL/ORDERING_ADMIN_PASSWORD for admin fallback checks",
        );
      }

      seedAdminSession = session;

      return {
        source: session.source,
        activeAccess: {
          id: session.auth.activeAccess?.id ?? null,
          role: session.auth.activeAccess?.role ?? null,
          scopeType: session.auth.activeAccess?.scopeType ?? null,
        },
      };
    },
    { optional: true },
  );

  const target = await runStep(results, "target", () => resolveTargetBusiness(seedAdminSession));

  const menu = await runStep(results, "public menu", async () => {
    const response = await fetchJson(
      `/api/v2/ordering/public/${target.citySlug}/${target.businessSlug}/menu`,
    );
    return {
      business: response.business?.slug,
      categories: response.categories?.length ?? 0,
      items:
        response.categories?.reduce((sum, category) => sum + (category.items?.length ?? 0), 0) ?? 0,
      settings: {
        slotMinutes: response.settings?.slotMinutes ?? null,
        maxOrdersPerSlot: response.settings?.maxOrdersPerSlot ?? null,
      },
    };
  });

  const availabilityTarget = await runStep(results, "public availability", async () => {
    const value = await findAvailabilityTarget(target.citySlug, target.businessSlug);
    return {
      date: value.date,
      closed: value.availability.closed,
      slot: value.slot.pickupSlot,
      remaining: value.slot.remaining,
      slotMinutes: value.availability.slotMinutes,
    };
  });

  const lookupPhone = process.env.ORDERING_PHONE?.trim();
  const customerLookup = await runStep(
    results,
    "customer lookup",
    async () => {
      const lookup = await fetchJson(
        `/api/v2/ordering/public/${target.citySlug}/${target.businessSlug}/customers/lookup?phone=${encodeURIComponent(lookupPhone)}`,
      );
      return {
        found: lookup.found,
        totalOrders: lookup.customer?.totalOrders ?? 0,
        points: lookup.customer?.points ?? 0,
      };
    },
    { optional: !lookupPhone },
  );

  let resolvedAdminSession = null;

  await runStep(
    results,
    "admin session",
    async () => {
      const session = await resolveAdminSession(target, seedAdminSession);

      if (!session) {
        throw new Error(
          "Provide ORDERING_ADMIN_TOKEN or ORDERING_ADMIN_EMAIL/ORDERING_ADMIN_PASSWORD for admin checks",
        );
      }

      resolvedAdminSession = session;

      return {
        source: session.source,
        activeAccess: {
          id: session.auth.activeAccess?.id ?? null,
          role: session.auth.activeAccess?.role ?? null,
          scopeType: session.auth.activeAccess?.scopeType ?? null,
          citySlug: session.auth.activeAccess?.city?.slug ?? null,
          businessSlug: session.auth.activeAccess?.business?.slug ?? null,
        },
      };
    },
    { optional: true },
  );

  const resolvedAdminToken = resolvedAdminSession?.token ?? null;

  if (resolvedAdminToken) {
    await runStep(results, "admin menu", async () => {
      const response = await fetchJson(
        `/api/v2/ordering/businesses/${target.citySlug}/${target.businessSlug}/menu`,
        {
          token: resolvedAdminToken,
        },
      );
      const itemCount =
        response.categories?.reduce((sum, category) => sum + (category.items?.length ?? 0), 0) ?? 0;

      return {
        categories: response.categories?.length ?? 0,
        items: itemCount,
        orderingEnabled: response.business?.orderingEnabled ?? false,
        publicItems: menu?.items ?? 0,
      };
    });

    await runStep(results, "admin settings", async () => {
      const response = await fetchJson(
        `/api/v2/ordering/businesses/${target.citySlug}/${target.businessSlug}/settings`,
        {
          token: resolvedAdminToken,
        },
      );
      return {
        openingDays: response.settings?.openingDays?.length ?? 0,
        closedDates: response.settings?.closedDates?.length ?? 0,
        specialDates: response.settings?.specialDates?.length ?? 0,
      };
    });

    await runStep(results, "admin coupons", async () => {
      const response = await fetchJson(
        `/api/v2/ordering/businesses/${target.citySlug}/${target.businessSlug}/coupons?limit=5`,
        {
          token: resolvedAdminToken,
        },
      );
      return {
        count: response.items?.length ?? 0,
        first: response.items?.[0]?.code ?? null,
      };
    });
  }

  let createdOrderId = null;
  let createdCouponId = null;
  let createdCouponCode = null;

  if (process.env.ORDERING_SMOKE_CREATE === "1") {
    await runStep(results, "order create", async () => {
      const publicMenu = await fetchJson(
        `/api/v2/ordering/public/${target.citySlug}/${target.businessSlug}/menu`,
      );
      const firstItem = publicMenu.categories?.flatMap((category) => category.items ?? []).at(0);

      if (!firstItem) {
        throw new Error("Cannot create smoke order without at least one menu item");
      }

      const created = await fetchJson(
        `/api/v2/ordering/public/${target.citySlug}/${target.businessSlug}/orders`,
        {
          method: "POST",
          body: {
            customerName: "Smoke Test Customer",
            customerPhone: lookupPhone || "3330000000",
            pickupDate: availabilityTarget.date,
            pickupTime: availabilityTarget.slot.split("T")[1],
            pickupSlot: availabilityTarget.slot,
            items: [
              {
                menuItemId: firstItem.id,
                qty: 1,
              },
            ],
          },
        },
      );

      createdOrderId = created.order?.id ?? null;
      return {
        orderId: createdOrderId,
        trackingPath: created.trackingPath,
        grandTotal: created.order?.grandTotal ?? null,
      };
    });

    await runStep(results, "tracking order", async () => {
      const tracking = await fetchJson(
        `/api/v2/ordering/public/${target.citySlug}/${target.businessSlug}/orders/${createdOrderId}`,
      );
      return {
        orderId: tracking.order?.id,
        status: tracking.order?.status,
      };
    });
  } else {
    await runStep(
      results,
      "order create",
      () => Promise.reject(new Error("ORDERING_SMOKE_CREATE != 1")),
      { optional: true },
    );
  }

  if (resolvedAdminToken) {
    await runStep(results, "admin stats", async () => {
      const stats = await fetchJson(
        `/api/v2/ordering/businesses/${target.citySlug}/${target.businessSlug}/orders/stats`,
        {
          token: resolvedAdminToken,
        },
      );
      return stats.summary;
    });

    await runStep(results, "admin orders", async () => {
      const orders = await fetchJson(
        `/api/v2/ordering/businesses/${target.citySlug}/${target.businessSlug}/orders?limit=5`,
        {
          token: resolvedAdminToken,
        },
      );
      return {
        count: orders.items?.length ?? 0,
        first: orders.items?.[0]?.id ?? null,
        containsCreatedOrder:
          createdOrderId != null ? orders.items?.some((item) => item.id === createdOrderId) : null,
      };
    });

    if (process.env.ORDERING_SMOKE_ADMIN_MUTATIONS === "1") {
      createdCouponCode = randomCouponCode();

      await runStep(results, "admin coupon create", async () => {
        const created = await fetchJson(
          `/api/v2/ordering/businesses/${target.citySlug}/${target.businessSlug}/coupons`,
          {
            method: "POST",
            token: resolvedAdminToken,
            body: {
              code: createdCouponCode,
              type: "fixed",
              value: 1,
              usageLimit: 1,
              active: true,
            },
          },
        );
        createdCouponId = created.item?.id ?? null;
        return {
          couponId: createdCouponId,
          code: created.item?.code ?? null,
        };
      });

      if (createdOrderId) {
        await runStep(results, "admin order status update", async () => {
          const updated = await fetchJson(
            `/api/v2/ordering/businesses/${target.citySlug}/${target.businessSlug}/orders/${createdOrderId}/status`,
            {
              method: "PATCH",
              token: resolvedAdminToken,
              body: {
                status: "confirmed",
              },
            },
          );
          return {
            orderId: updated.order?.id ?? null,
            status: updated.order?.status ?? null,
          };
        });
      }

      if (createdCouponId) {
        await runStep(results, "admin coupon delete", async () => {
          await fetchJson(
            `/api/v2/ordering/businesses/${target.citySlug}/${target.businessSlug}/coupons/${createdCouponId}`,
            {
              method: "DELETE",
              token: resolvedAdminToken,
            },
          );
          return {
            deleted: true,
            couponId: createdCouponId,
          };
        });
      }
    } else {
      await runStep(
        results,
        "admin mutations",
        () => Promise.reject(new Error("ORDERING_SMOKE_ADMIN_MUTATIONS != 1")),
        { optional: true },
      );
    }
  }

  if (lookupPhone) {
    await runStep(
      results,
      "customer lookup after create",
      async () => {
        const lookup = await fetchJson(
          `/api/v2/ordering/public/${target.citySlug}/${target.businessSlug}/customers/lookup?phone=${encodeURIComponent(lookupPhone)}`,
        );
        return {
          found: lookup.found,
          totalOrders: lookup.customer?.totalOrders ?? 0,
          lastOrderId: lookup.lastOrder?.id ?? null,
        };
      },
      { optional: createdOrderId == null },
    );
  }

  const summary = buildSummary(results);
  logStep("summary", summary);

  if (summary.requiredFailed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("\n[ordering-smoke] failure");
  console.error(toErrorMessage(error));
  process.exitCode = 1;
});

import { platformConfig } from "@platform/config";

const bootedAt = new Date().toISOString();
const apiHealthTimeoutMs = 5_000;

type ApiIndexResponse = {
  status?: string;
  area?: string;
  routes?: Record<string, string>;
};

type BackendHealthResponse = {
  status?: string;
  service?: string;
  release?: string;
  surface?: string;
  env?: string;
  deployment?: {
    provider?: string;
    branch?: string | null;
    commit?: string | null;
  };
  dependencies?: {
    database?: { configured?: boolean; status?: string };
    redis?: { configured?: boolean; status?: string };
    auth?: { configured?: boolean; status?: string };
  };
};

async function checkApiDeployment() {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/\/+$/, "");
  if (!baseUrl) {
    return {
      configured: false,
      status: "error" as const,
      reachable: false,
      lookupRoutesAvailable: false,
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), apiHealthTimeoutMs);

  try {
    const [indexResponse, healthResponse] = await Promise.all([
      fetch(`${baseUrl}/api/v2`, {
        cache: "no-store",
        signal: controller.signal,
      }),
      fetch(`${baseUrl}/health`, {
        cache: "no-store",
        signal: controller.signal,
      }),
    ]);

    const indexData = (await indexResponse.json()) as ApiIndexResponse;
    const healthData = (await healthResponse.json()) as BackendHealthResponse;
    const lookupRoutesAvailable = Boolean(
      indexData.routes?.cityLookups &&
      indexData.routes?.businessLookups &&
      indexData.routes?.cityRegistryLookups,
    );
    const dependenciesHealthy = Boolean(
      healthData.dependencies?.database?.status === "ok" &&
      healthData.dependencies?.redis?.status === "ok" &&
      healthData.dependencies?.auth?.status === "ok",
    );
    const healthy =
      indexResponse.ok &&
      healthResponse.ok &&
      indexData.status === "ok" &&
      healthData.status === "ok" &&
      lookupRoutesAvailable &&
      dependenciesHealthy;

    return {
      configured: true,
      status: healthy ? ("ok" as const) : ("error" as const),
      reachable: true,
      apiHost: new URL(baseUrl).host,
      httpStatus: indexResponse.status,
      healthHttpStatus: healthResponse.status,
      area: indexData.area ?? null,
      lookupRoutesAvailable,
      deployment: healthData.deployment ?? null,
      dependencies: healthData.dependencies ?? null,
    };
  } catch (error) {
    return {
      configured: true,
      status: "error" as const,
      reachable: false,
      lookupRoutesAvailable: false,
      error: error instanceof Error ? error.name : "request_failed",
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET() {
  const api = await checkApiDeployment();
  const healthy = api.status === "ok";

  return Response.json(
    {
      status: healthy ? "ok" : "degraded",
      service: platformConfig.services.web,
      release: platformConfig.releaseLabel,
      surface: "web",
      env: process.env.NODE_ENV ?? "development",
      bootedAt,
      time: new Date().toISOString(),
      dependencies: {
        apiBaseUrlConfigured: Boolean(process.env.NEXT_PUBLIC_API_BASE_URL),
        api,
      },
    },
    { status: healthy ? 200 : 503 },
  );
}

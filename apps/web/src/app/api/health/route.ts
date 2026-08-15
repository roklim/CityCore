import { platformConfig } from "@platform/config";

const bootedAt = new Date().toISOString();
const apiHealthTimeoutMs = 5_000;

type ApiIndexResponse = {
  status?: string;
  area?: string;
  routes?: Record<string, string>;
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
    const response = await fetch(`${baseUrl}/api/v2`, {
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        configured: true,
        status: "error" as const,
        reachable: true,
        httpStatus: response.status,
        lookupRoutesAvailable: false,
      };
    }

    const data = (await response.json()) as ApiIndexResponse;
    const lookupRoutesAvailable = Boolean(
      data.routes?.cityLookups && data.routes?.businessLookups && data.routes?.cityRegistryLookups,
    );

    return {
      configured: true,
      status: "ok" as const,
      reachable: true,
      httpStatus: response.status,
      area: data.area ?? null,
      lookupRoutesAvailable,
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

  return Response.json({
    status: "ok",
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
  });
}

import { platformConfig } from "@platform/config";

const bootedAt = new Date().toISOString();

export async function GET() {
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
    },
  });
}

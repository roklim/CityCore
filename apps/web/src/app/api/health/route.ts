export async function GET() {
  return Response.json({
    status: "ok",
    app: "web",
    version: "v2-foundation",
    time: new Date().toISOString(),
  });
}

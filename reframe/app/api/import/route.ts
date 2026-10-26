import { importWebsite } from "@/lib/reframe/web";
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin)
    return Response.json(
      { error: "This import must be started from Reframe." },
      { status: 403 },
    );
  try {
    if (Number(request.headers.get("content-length")) > 4096)
      return Response.json({ error: "Request is too large." }, { status: 413 });
    const body = await request.text();
    if (body.length > 4096) throw new Error("Request is too large.");
    const data = JSON.parse(body);
    if (typeof data.url !== "string" || data.url.length > 2048)
      throw new Error("Enter a valid URL.");
    const page = await importWebsite(data.url);
    return Response.json(page, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Import failed. Please retry.",
      },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
}

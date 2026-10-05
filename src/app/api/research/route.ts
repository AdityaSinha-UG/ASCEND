import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ResearchError, searchWeb, validateSearchQuery } from "@/lib/server/serpapi";

export const runtime = "nodejs";

async function readBoundedJson(request: NextRequest, maxBytes: number): Promise<unknown> {
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > maxBytes) throw new RangeError("body_too_large");
  if (!request.body) throw new SyntaxError("empty_body");

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel();
      throw new RangeError("body_too_large");
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await readBoundedJson(request, 4096);
  } catch (error) {
    if (error instanceof RangeError) {
      return NextResponse.json({ error: "Request body is too large." }, { status: 413 });
    }
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Request body must be an object." }, { status: 400 });
  }

  const query = validateSearchQuery((body as Record<string, unknown>).query);
  if (!query) {
    return NextResponse.json(
      { error: "Enter a valid search query (2–200 characters)." },
      { status: 400 },
    );
  }

  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const research = await searchWeb(query);
    return NextResponse.json(research, { status: 200 });
  } catch (error) {
    if (error instanceof ResearchError) {
      const status = error.message.startsWith("Enter a valid") ? 400 : 502;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json({ error: "Could not complete web research." }, { status: 500 });
  }
}

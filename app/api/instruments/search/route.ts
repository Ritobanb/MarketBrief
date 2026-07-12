import { NextRequest, NextResponse } from "next/server";
import { getCatalogueStore } from "../../../../db/catalogue";
import { ensureCatalogue } from "../../../../services/catalogue-init";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const startedAt = performance.now();
  const query = request.nextUrl.searchParams.get("q")?.trim() || "";
  if (query.length < 1) return NextResponse.json({ instruments: [], durationMs: 0 });
  await ensureCatalogue();
  const instruments = getCatalogueStore().search(query, 15);
  return NextResponse.json({ instruments, durationMs: Math.round((performance.now() - startedAt) * 100) / 100 }, {
    headers: { "Cache-Control": "private, max-age=30" },
  });
}

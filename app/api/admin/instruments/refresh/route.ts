import { NextResponse } from "next/server";
import { getCatalogueStore } from "../../../../../db/catalogue";
import { createInstrumentProvider } from "../../../../../providers";
import { refreshCatalogue } from "../../../../../services/catalogue-refresh";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const configuredSecret = process.env.CATALOGUE_REFRESH_SECRET;
  if (configuredSecret && request.headers.get("authorization") !== `Bearer ${configuredSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json(await refreshCatalogue(getCatalogueStore(), createInstrumentProvider()));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Refresh failed", status: getCatalogueStore().getStatus() }, { status: 422 });
  }
}

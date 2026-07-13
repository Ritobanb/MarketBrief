import { NextResponse } from "next/server";
import { getCatalogueStore, RefreshInProgressError } from "../../../../../db/catalogue";
import { createInstrumentProvider } from "../../../../../providers";
import { refreshCatalogue } from "../../../../../services/catalogue-refresh";
import { isSameOrigin, requireAdmin } from "../../../../../lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const configuredSecret = process.env.CATALOGUE_REFRESH_SECRET;
  const cronAuthorized = Boolean(configuredSecret && request.headers.get("authorization") === `Bearer ${configuredSecret}`);
  if (!cronAuthorized) {
    const denied = await requireAdmin(request); if (denied) return denied;
    if (!isSameOrigin(request)) return NextResponse.json({ error: "Cross-origin requests are not allowed." }, { status: 403 });
  }
  try {
    return NextResponse.json(await refreshCatalogue(getCatalogueStore(), createInstrumentProvider()));
  } catch (error) {
    const statusCode = error instanceof RefreshInProgressError ? 409 : 422;
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Refresh failed",
      status: await getCatalogueStore().getStatus(),
    }, { status: statusCode });
  }
}

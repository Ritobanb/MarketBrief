import { NextResponse } from "next/server";
import { getCatalogueStore } from "../../../../../db/catalogue";
import { ensureCatalogue } from "../../../../../services/catalogue-init";
import { requireAdmin } from "../../../../../lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = await requireAdmin(request); if (denied) return denied;
  await ensureCatalogue();
  return NextResponse.json(await getCatalogueStore().getStatus());
}

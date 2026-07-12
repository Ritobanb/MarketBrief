import { NextResponse } from "next/server";
import { getCatalogueStore } from "../../../../../db/catalogue";
import { ensureCatalogue } from "../../../../../services/catalogue-init";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await ensureCatalogue();
  return NextResponse.json(getCatalogueStore().getStatus());
}

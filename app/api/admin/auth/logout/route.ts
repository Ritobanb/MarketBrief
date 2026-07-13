import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, clearAdminCookie, getAdminSession, isSameOrigin } from "../../../../../lib/admin-auth";
import { getPrisma } from "../../../../../db/prisma";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Cross-origin requests are not allowed." }, { status: 403 });
  const session = await getAdminSession(request);
  if (session) await getPrisma().adminSession.delete({ where: { id: session.id } }).catch(() => undefined);
  const response = new NextResponse(null, { status: 204, headers: { "Set-Cookie": clearAdminCookie() } });
  response.cookies.delete(ADMIN_SESSION_COOKIE);
  return response;
}

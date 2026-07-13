import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "../../../../../lib/admin-auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await getAdminSession(request);
  return session
    ? NextResponse.json({ authenticated: true, user: { email: session.user.email, role: session.user.role } }, { headers: { "Cache-Control": "no-store" } })
    : NextResponse.json({ authenticated: false }, { status: 401, headers: { "Cache-Control": "no-store" } });
}

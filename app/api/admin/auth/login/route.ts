import { NextRequest, NextResponse } from "next/server";
import { adminCookie, createAdminSession, isSameOrigin, verifyAdminPassword } from "../../../../../lib/admin-auth";
import { getPrisma } from "../../../../../db/prisma";
import { normalizeEmail } from "../../../../../lib/subscriptions";

export const runtime = "nodejs";
const FAILURE_LIMIT = 5;
const LOCK_MINUTES = 15;

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Cross-origin requests are not allowed." }, { status: 403 });
  const body = await request.json().catch(() => null) as { email?: unknown; password?: unknown } | null;
  const email = normalizeEmail(typeof body?.email === "string" ? body.email : "");
  const password = typeof body?.password === "string" ? body.password : "";
  if (!email || password.length > 256) return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });

  const prisma = getPrisma();
  const user = await prisma.adminUser.findUnique({ where: { email } });
  const now = new Date();
  if (!user || !user.isActive || (user.lockedUntil && user.lockedUntil > now) || !(await verifyAdminPassword(password, user.passwordHash))) {
    if (user && (!user.lockedUntil || user.lockedUntil <= now)) {
      const attempts = user.failedLoginAttempts + 1;
      await prisma.adminUser.update({ where: { id: user.id }, data: { failedLoginAttempts: attempts, lockedUntil: attempts >= FAILURE_LIMIT ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null } });
    }
    await new Promise(resolve => setTimeout(resolve, 250));
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  await prisma.adminUser.update({ where: { id: user.id }, data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: now } });
  await prisma.adminSession.deleteMany({ where: { OR: [{ expiresAt: { lte: now } }, { userId: user.id }] } });
  const session = await createAdminSession(user.id);
  return NextResponse.json({ user: { email: user.email, role: user.role } }, { headers: { "Set-Cookie": adminCookie(session.token, session.expiresAt), "Cache-Control": "no-store" } });
}

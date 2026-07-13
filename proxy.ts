import { NextRequest, NextResponse } from "next/server";

const ADMIN_SESSION_COOKIE = "mb_admin_session";

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/admin/login") return NextResponse.next();
  if (!request.cookies.get(ADMIN_SESSION_COOKIE)?.value) {
    const login = new URL("/admin/login", request.url);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*"] };

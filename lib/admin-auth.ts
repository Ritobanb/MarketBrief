import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { NextResponse } from "next/server";
import { getPrisma } from "../db/prisma";

const scrypt = promisify(scryptCallback);
export const ADMIN_SESSION_COOKIE = "mb_admin_session";
export const ADMIN_SESSION_TTL_SECONDS = 8 * 60 * 60;

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function hashAdminPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, 64) as Buffer;
  return `scrypt-v1$${salt}$${derived.toString("hex")}`;
}

export async function verifyAdminPassword(password: string, stored: string) {
  const [version, salt, expectedHex] = stored.split("$");
  if (version !== "scrypt-v1" || !salt || !expectedHex) return false;
  const actual = await scrypt(password, salt, 64) as Buffer;
  const expected = Buffer.from(expectedHex, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function createAdminSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + ADMIN_SESSION_TTL_SECONDS * 1000);
  await getPrisma().adminSession.create({ data: { userId, tokenHash: tokenHash(token), expiresAt } });
  return { token, expiresAt };
}

function readCookie(request: Request, name: string) {
  const cookies = request.headers.get("cookie") || "";
  return cookies.split(";").map(value => value.trim()).find(value => value.startsWith(`${name}=`))?.slice(name.length + 1) || "";
}

export async function getAdminSession(request: Request) {
  const token = readCookie(request, ADMIN_SESSION_COOKIE);
  if (!token) return null;
  const session = await getPrisma().adminSession.findUnique({ where: { tokenHash: tokenHash(token) }, include: { user: true } });
  if (!session || session.expiresAt <= new Date() || !session.user.isActive) {
    if (session) await getPrisma().adminSession.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  return session;
}

export async function requireAdmin(request: Request) {
  return await getAdminSession(request) ? null : NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try { return new URL(origin).host === new URL(request.url).host; } catch { return false; }
}

export function adminCookie(token: string, expiresAt: Date) {
  return `${ADMIN_SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Expires=${expiresAt.toUTCString()}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
}

export function clearAdminCookie() {
  return `${ADMIN_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
}

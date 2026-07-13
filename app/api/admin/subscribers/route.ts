import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "../../../../db/prisma";
import { isSameOrigin, requireAdmin } from "../../../../lib/admin-auth";
import { validateSubscriptionInput } from "../../../../lib/subscriptions";
import { InvalidWatchlistError, saveSubscription } from "../../../../services/subscriptions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request); if (denied) return denied;
  const page = Math.max(1, Number(request.nextUrl.searchParams.get("page")) || 1);
  const pageSize = 25;
  const query = request.nextUrl.searchParams.get("q")?.trim().slice(0, 100) || "";
  const active = request.nextUrl.searchParams.get("active");
  const where = {
    ...(query ? { OR: [{ email: { contains: query, mode: "insensitive" as const } }, { name: { contains: query, mode: "insensitive" as const } }] } : {}),
    ...(active === "true" || active === "false" ? { isActive: active === "true" } : {}),
  };
  const prisma = getPrisma();
  const [total, subscribers] = await prisma.$transaction([
    prisma.communicationProfile.count({ where }),
    prisma.communicationProfile.findMany({
      where, orderBy: { updatedAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize,
      include: { notifications: true, watchlist: { include: { instrument: { select: { stableInstrumentId: true, symbol: true, exchange: true } } } } },
    }),
  ]);
  return NextResponse.json({
    page, pageSize, total,
    subscribers: subscribers.map(item => ({
      id: item.id, email: item.email, name: item.name, markets: item.markets, briefingStyle: item.briefingStyle,
      experienceLevel: item.experienceLevel, contentToggles: item.contentToggles, timeZone: item.timeZone,
      isActive: item.isActive, createdAt: item.createdAt, updatedAt: item.updatedAt,
      notifications: Object.fromEntries(item.notifications.map(notification => [notification.cycleType, notification.enabled])),
      watchlist: item.watchlist.map(entry => entry.instrument),
    })),
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const denied = await requireAdmin(request); if (denied) return denied;
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Cross-origin requests are not allowed." }, { status: 403 });
  try {
    const validation = validateSubscriptionInput(await request.json());
    if (!validation.success) return NextResponse.json({ error: "Check the highlighted fields.", fields: validation.errors }, { status: 422 });
    const result = await saveSubscription({ ...validation.data, source: "personalized" });
    return NextResponse.json(result, { status: result.created ? 201 : 200 });
  } catch (error) {
    if (error instanceof InvalidWatchlistError) return NextResponse.json({ error: error.message }, { status: 422 });
    return NextResponse.json({ error: "Unable to save subscriber." }, { status: 500 });
  }
}

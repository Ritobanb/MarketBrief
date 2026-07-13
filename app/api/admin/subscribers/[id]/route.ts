import { Prisma } from "../../../../../generated/prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "../../../../../db/prisma";
import { isSameOrigin, requireAdmin } from "../../../../../lib/admin-auth";
import { validateSubscriptionInput } from "../../../../../lib/subscriptions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, context: RouteContext) {
  const denied = await requireAdmin(request); if (denied) return denied;
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Cross-origin requests are not allowed." }, { status: 403 });
  const validation = validateSubscriptionInput(await request.json().catch(() => null));
  if (!validation.success) return NextResponse.json({ error: "Check the highlighted fields.", fields: validation.errors }, { status: 422 });
  const { id } = await context.params;
  const input = validation.data;
  try {
    const result = await getPrisma().$transaction(async transaction => {
      const instruments = input.watchlistInstrumentIds.length ? await transaction.instrument.findMany({ where: { stableInstrumentId: { in: input.watchlistInstrumentIds }, isActive: true }, select: { id: true } }) : [];
      if (instruments.length !== input.watchlistInstrumentIds.length) throw new Error("INVALID_WATCHLIST");
      const profile = await transaction.communicationProfile.update({ where: { id }, data: { email: input.email, name: input.name ?? null, markets: input.markets, briefingStyle: input.briefingStyle, experienceLevel: input.experienceLevel, contentToggles: input.contentToggles, timeZone: input.timeZone } });
      await transaction.profileWatchlist.deleteMany({ where: { profileId: id } });
      if (instruments.length) await transaction.profileWatchlist.createMany({ data: instruments.map(item => ({ profileId: id, instrumentId: item.id })) });
      await transaction.profileNotification.deleteMany({ where: { profileId: id } });
      await transaction.profileNotification.createMany({ data: Object.entries(input.notifications).map(([cycleType, enabled]) => ({ profileId: id, cycleType, enabled: enabled === true })) });
      return profile;
    });
    return NextResponse.json({ id: result.id });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") return NextResponse.json({ error: "Subscriber not found." }, { status: 404 });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return NextResponse.json({ error: "That email address is already in use." }, { status: 409 });
    if (error instanceof Error && error.message === "INVALID_WATCHLIST") return NextResponse.json({ error: "One or more watchlist instruments are unavailable." }, { status: 422 });
    return NextResponse.json({ error: "Unable to update subscriber." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const denied = await requireAdmin(request); if (denied) return denied;
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Cross-origin requests are not allowed." }, { status: 403 });
  const body = await request.json().catch(() => null) as { isActive?: unknown } | null;
  if (typeof body?.isActive !== "boolean") return NextResponse.json({ error: "isActive must be a boolean." }, { status: 422 });
  const { id } = await context.params;
  try {
    const profile = await getPrisma().communicationProfile.update({ where: { id }, data: { isActive: body.isActive }, select: { id: true, isActive: true } });
    return NextResponse.json(profile);
  } catch { return NextResponse.json({ error: "Subscriber not found." }, { status: 404 }); }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const denied = await requireAdmin(request); if (denied) return denied;
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Cross-origin requests are not allowed." }, { status: 403 });
  const { id } = await context.params;
  try {
    await getPrisma().communicationProfile.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch { return NextResponse.json({ error: "Subscriber not found." }, { status: 404 }); }
}

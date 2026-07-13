import { NextRequest, NextResponse } from "next/server";
import { validateSubscriptionInput } from "../../../lib/subscriptions";
import { InvalidWatchlistError, saveSubscription } from "../../../services/subscriptions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== request.nextUrl.host) {
    return NextResponse.json({ error: "Cross-origin requests are not allowed." }, { status: 403 });
  }
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ error: "Content-Type must be application/json." }, { status: 415 });
  }
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 32_000) return NextResponse.json({ error: "Request is too large." }, { status: 413 });

  try {
    const validation = validateSubscriptionInput(await request.json());
    if (!validation.success) return NextResponse.json({ error: "Check the highlighted fields.", fields: validation.errors }, { status: 422 });
    const result = await saveSubscription(validation.data);
    return NextResponse.json({ profileId: result.id, message: "Your preferences have been saved." }, { status: result.created ? 201 : 200, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof InvalidWatchlistError) return NextResponse.json({ error: error.message, fields: { watchlist: error.message } }, { status: 422 });
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Invalid JSON request." }, { status: 400 });
    console.error("Failed to save subscription", error);
    return NextResponse.json({ error: "We couldn’t save your preferences. Please try again." }, { status: 500 });
  }
}

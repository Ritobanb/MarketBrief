import type { CycleType } from "../lib/briefing";
import type { SubscriptionInput } from "../lib/subscriptions";
import { getPrisma } from "../db/prisma";

export class InvalidWatchlistError extends Error {
  constructor() {
    super("One or more watchlist instruments are unavailable.");
    this.name = "InvalidWatchlistError";
  }
}

export async function saveSubscription(input: SubscriptionInput) {
  const prisma = getPrisma();
  return prisma.$transaction(async transaction => {
    const existing = await transaction.communicationProfile.findUnique({ where: { email: input.email }, select: { id: true } });
    if (input.source === "homepage" && existing) {
      await transaction.profileNotification.upsert({
        where: { profileId_cycleType: { profileId: existing.id, cycleType: "daily" } },
        create: { profileId: existing.id, cycleType: "daily", enabled: true },
        update: { enabled: true },
      });
      await transaction.communicationProfile.update({ where: { id: existing.id }, data: { isActive: true } });
      return { id: existing.id, created: false };
    }
    const instruments = input.watchlistInstrumentIds.length
      ? await transaction.instrument.findMany({
          where: { stableInstrumentId: { in: input.watchlistInstrumentIds }, isActive: true },
          select: { id: true, stableInstrumentId: true },
        })
      : [];
    if (instruments.length !== input.watchlistInstrumentIds.length) throw new InvalidWatchlistError();

    const profile = await transaction.communicationProfile.upsert({
      where: { email: input.email },
      create: {
        email: input.email,
        name: input.name,
        markets: input.markets,
        briefingStyle: input.briefingStyle,
        experienceLevel: input.experienceLevel,
        contentToggles: input.contentToggles,
        timeZone: input.timeZone,
      },
      update: {
        name: input.name ?? null,
        markets: input.markets,
        briefingStyle: input.briefingStyle,
        experienceLevel: input.experienceLevel,
        contentToggles: input.contentToggles,
        timeZone: input.timeZone,
        isActive: true,
      },
      select: { id: true, createdAt: true, updatedAt: true },
    });

    await transaction.profileWatchlist.deleteMany({ where: { profileId: profile.id } });
    if (instruments.length) {
      await transaction.profileWatchlist.createMany({ data: instruments.map(instrument => ({ profileId: profile.id, instrumentId: instrument.id })), skipDuplicates: true });
    }
    await transaction.profileNotification.deleteMany({ where: { profileId: profile.id } });
    await transaction.profileNotification.createMany({
      data: Object.entries(input.notifications).map(([cycleType, enabled]) => ({ profileId: profile.id, cycleType: cycleType as CycleType, enabled: enabled === true })),
    });
    return { id: profile.id, created: !existing };
  });
}

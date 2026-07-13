import { randomUUID } from "node:crypto";
import type { PrismaClient } from "../../generated/prisma/client";
import { Prisma } from "../../generated/prisma/client";
import { CYCLE_TYPES, FIXED_NOTIFICATION_SCHEDULES, type CycleType, type MarketSnapshotPayload, type MasterBriefContent, type SnapshotInstrument } from "../../lib/briefing";
import type { BriefGenerationAdapter, MarketDataAdapter } from "./adapters";
import { renderPersonalizedBrief } from "./render";

export class BriefCycleInProgressError extends Error {
  constructor() {
    super("This brief cycle is already running or has used its single generation call.");
    this.name = "BriefCycleInProgressError";
  }
}

function stringArray(value: Prisma.JsonValue): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function validateSnapshot(snapshot: MarketSnapshotPayload, expectedIds: Set<string>) {
  if (!CYCLE_TYPES.includes(snapshot.cycleType) || Number.isNaN(Date.parse(snapshot.asOf))) throw new Error("The market-data adapter returned an invalid snapshot.");
  const receivedIds = new Set(snapshot.instruments.map(instrument => instrument.stableInstrumentId));
  if (receivedIds.size !== snapshot.instruments.length) throw new Error("The market snapshot contains duplicate instruments.");
  if ([...expectedIds].some(id => !receivedIds.has(id))) throw new Error("The market snapshot is missing a watched instrument.");
}

function validateGeneratedBrief(content: MasterBriefContent, expectedIds: Set<string>, cycleType: CycleType) {
  if (!content.subject.trim() || !content.previewText.trim() || !content.marketOverview.trim()) throw new Error("The generated brief is missing required content.");
  if ([...expectedIds].some(id => !content.tickerSummaries[id])) throw new Error("The generated brief is missing a watched ticker summary.");
  if (cycleType === "daily") {
    const daily = content.dailyMarketBrief;
    const statuses = new Set(["Watch", "Stable", "Elevated risk", "Positive momentum"]);
    if (!daily || daily.overnight.length !== 3 || daily.etfs.length < 3 || daily.etfs.length > 5 || daily.stocks.length > 5 || daily.marketBriefView.length > 3) {
      throw new Error("The generated daily brief does not match the required compact structure.");
    }
    if (daily.etfs.some(etf => !statuses.has(etf.status))) throw new Error("The generated daily brief contains an invalid ETF status.");
  }
  if (cycleType === "premarket") {
    const brief = content.premarketBrief;
    const risks = new Set(["Low", "Medium", "High", "Extreme"]);
    if (!brief || brief.snapshot.length !== 8 || brief.catalysts.length > 5 || brief.openingStrategyNotes.length > 4 || brief.marketBriefView.length > 3) {
      throw new Error("The generated premarket brief does not match the required compact structure.");
    }
    if (brief.movers.some(item => !risks.has(item.risk))) throw new Error("The generated premarket brief contains an invalid risk value.");
    if (brief.watchlistImpact.some(item => !expectedIds.has(item.stableInstrumentId))) throw new Error("The generated premarket brief contains an unsubscribed instrument.");
  }
  if (cycleType === "close") {
    const brief = content.marketCloseSummary;
    if (!brief || brief.snapshot.length !== 8 || brief.drivers.length > 3 || brief.corporateNews.length > 5 || brief.marketBriefView.length > 3) {
      throw new Error("The generated market close summary does not match the required compact structure.");
    }
    if (brief.movers.some(item => item.category === "Watchlist" && (!item.stableInstrumentId || !expectedIds.has(item.stableInstrumentId)))) {
      throw new Error("The generated market close summary contains an unsubscribed watchlist instrument.");
    }
  }
  if (cycleType === "weekly") {
    const brief = content.weeklyMarketRecap;
    const statuses = new Set(["Stable", "Positive momentum", "Elevated risk", "Needs attention"]);
    if (!brief || brief.scorecard.length !== 8 || brief.weekInFive.length !== 5 || brief.marketBriefView.length > 4) {
      throw new Error("The generated weekly recap does not match the required compact structure.");
    }
    if (brief.watchlistSummary.some(item => !expectedIds.has(item.stableInstrumentId) || !statuses.has(item.status))) {
      throw new Error("The generated weekly recap contains an invalid watchlist summary.");
    }
  }
}

export class BriefCycleRunner {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly marketData: MarketDataAdapter,
    private readonly generator: BriefGenerationAdapter,
  ) {}

  async run(cycleType: CycleType, scheduledFor: Date) {
    if (!CYCLE_TYPES.includes(cycleType) || Number.isNaN(scheduledFor.valueOf())) throw new Error("Invalid brief cycle schedule.");

    const cycle = await this.prisma.briefCycle.upsert({
      where: { cycleType_scheduledFor: { cycleType, scheduledFor } },
      create: { cycleType, scheduledFor, status: "pending" },
      update: {},
    });
    if (cycle.status === "complete" || cycle.status === "skipped") return cycle;

    const claimed = await this.prisma.briefCycle.updateMany({
      where: { id: cycle.id, status: { in: ["pending", "failed"] }, llmCallCount: 0 },
      data: { status: "collecting", startedAt: new Date(), error: null },
    });
    if (claimed.count !== 1) throw new BriefCycleInProgressError();

    try {
      const profiles = await this.prisma.communicationProfile.findMany({
        where: { isActive: true, notifications: { some: { cycleType, enabled: true } } },
        include: { watchlist: { include: { instrument: true } } },
      });
      if (profiles.length === 0) {
        return await this.prisma.briefCycle.update({ where: { id: cycle.id }, data: { status: "skipped", completedAt: new Date() } });
      }

      const instrumentsById = new Map<string, SnapshotInstrument>();
      for (const profile of profiles) {
        for (const entry of profile.watchlist) {
          if (!entry.instrument.isActive) continue;
          instrumentsById.set(entry.instrument.stableInstrumentId, {
            stableInstrumentId: entry.instrument.stableInstrumentId,
            symbol: entry.instrument.symbol,
            name: entry.instrument.name,
            exchange: entry.instrument.exchange,
            assetType: entry.instrument.assetType as SnapshotInstrument["assetType"],
            currency: entry.instrument.currency,
            data: {},
          });
        }
      }
      const expectedIds = new Set(instrumentsById.keys());
      const snapshot = await this.marketData.collect(cycleType, [...instrumentsById.values()]);
      validateSnapshot(snapshot.payload, expectedIds);

      await this.prisma.marketSnapshot.upsert({
        where: { cycleId: cycle.id },
        create: {
          cycleId: cycle.id,
          payload: snapshot.payload as unknown as Prisma.InputJsonValue,
          sources: snapshot.sources,
          warnings: snapshot.warnings,
        },
        update: {
          payload: snapshot.payload as unknown as Prisma.InputJsonValue,
          sources: snapshot.sources,
          warnings: snapshot.warnings,
          collectedAt: new Date(),
        },
      });

      const reserved = await this.prisma.briefCycle.updateMany({
        where: { id: cycle.id, status: "collecting", llmCallCount: 0 },
        data: { status: "generating", llmCallCount: { increment: 1 } },
      });
      if (reserved.count !== 1) throw new BriefCycleInProgressError();

      // This is the only model invocation in a cycle. Everything below is deterministic.
      const generated = await this.generator.generate(snapshot.payload);
      validateGeneratedBrief(generated.content, expectedIds, cycleType);

      await this.prisma.$transaction(async transaction => {
        await transaction.generatedBrief.create({
          data: {
            cycleId: cycle.id,
            model: this.generator.model,
            promptVersion: this.generator.promptVersion,
            content: generated.content as unknown as Prisma.InputJsonValue,
          },
        });

        for (const profile of profiles) {
          const rendered = renderPersonalizedBrief(generated.content, {
            name: profile.name,
            markets: stringArray(profile.markets),
            briefingStyle: profile.briefingStyle,
            experienceLevel: profile.experienceLevel,
            contentToggles: stringArray(profile.contentToggles),
            watchlist: profile.watchlist.filter(entry => entry.instrument.isActive).map(entry => ({
              stableInstrumentId: entry.instrument.stableInstrumentId,
              symbol: entry.instrument.symbol,
              exchange: entry.instrument.exchange,
            })),
          }, {
            cycleType,
            scheduledFor,
            dataTimestamp: snapshot.payload.asOf,
            timeZone: profile.timeZone,
            sources: snapshot.sources,
            warnings: snapshot.warnings,
            managePreferencesUrl: `${process.env.APP_BASE_URL || "http://localhost:3000"}/preferences?profile=${encodeURIComponent(profile.id)}`,
            unsubscribeUrl: `${process.env.APP_BASE_URL || "http://localhost:3000"}/unsubscribe?profile=${encodeURIComponent(profile.id)}`,
          });
          await transaction.recipientDelivery.upsert({
            where: { cycleId_profileId_channel: { cycleId: cycle.id, profileId: profile.id, channel: "email" } },
            create: {
              id: randomUUID(),
              cycleId: cycle.id,
              profileId: profile.id,
              idempotencyKey: `${cycle.id}:${profile.id}:email`,
              subject: rendered.subject,
              previewText: rendered.previewText,
              body: rendered.text,
              htmlBody: rendered.html,
              deliveryTime: FIXED_NOTIFICATION_SCHEDULES[cycleType].time,
              timeZone: profile.timeZone,
            },
            update: {},
          });
        }

        await transaction.briefCycle.update({
          where: { id: cycle.id },
          data: {
            status: "complete",
            inputTokens: generated.usage.inputTokens,
            outputTokens: generated.usage.outputTokens,
            estimatedCostUsd: generated.usage.estimatedCostUsd,
            completedAt: new Date(),
            error: null,
          },
        });
      });

      return this.prisma.briefCycle.findUniqueOrThrow({ where: { id: cycle.id } });
    } catch (error) {
      await this.prisma.briefCycle.update({
        where: { id: cycle.id },
        data: { status: "failed", error: error instanceof Error ? error.message : "Unknown brief-cycle error" },
      });
      throw error;
    }
  }
}

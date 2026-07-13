import type { AssetType } from "./instruments";

export const CYCLE_TYPES = ["daily", "premarket", "close", "weekly"] as const;
export type CycleType = typeof CYCLE_TYPES[number];

export const FIXED_NOTIFICATION_SCHEDULES: Record<CycleType, { time: string; label: string; cadence: string }> = {
  daily: { time: "07:00", label: "7:00 AM", cadence: "Weekday morning" },
  premarket: { time: "08:00", label: "8:00 AM", cadence: "Before markets open" },
  close: { time: "16:30", label: "4:30 PM", cadence: "After markets close" },
  weekly: { time: "18:00", label: "6:00 PM", cadence: "Sunday evening" },
};

export const BRIEFING_TIME_ZONE = "America/New_York";

const WEEKDAY_CYCLES = new Set<CycleType>(["daily", "premarket", "close"]);

/** Ensures costly generation can only start at the fixed Eastern Time schedule. */
export function isEasternBriefSchedule(cycleType: CycleType, scheduledFor: Date) {
  if (Number.isNaN(scheduledFor.valueOf())) return false;
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: BRIEFING_TIME_ZONE,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(scheduledFor).map(part => [part.type, part.value]));
  const [expectedHour, expectedMinute] = FIXED_NOTIFICATION_SCHEDULES[cycleType].time.split(":");
  const correctDay = cycleType === "weekly"
    ? parts.weekday === "Sun"
    : !WEEKDAY_CYCLES.has(cycleType) || !["Sat", "Sun"].includes(parts.weekday);
  return correctDay && parts.hour === expectedHour && parts.minute === expectedMinute;
}

export type SnapshotInstrument = {
  stableInstrumentId: string;
  symbol: string;
  name: string;
  exchange: string;
  assetType: AssetType;
  currency: string;
  data: Record<string, string | number | boolean | null>;
};

export type MarketSnapshotPayload = {
  cycleType: CycleType;
  asOf: string;
  markets: Record<string, string>;
  instruments: SnapshotInstrument[];
};

export type MarketDirection = "Bullish" | "Neutral" | "Bearish";
export type GlobalRiskLevel = "Low" | "Medium" | "High";
export type WatchStatus = "Watch" | "Stable" | "Elevated risk" | "Positive momentum";

export type DailyMarketBriefContent = {
  mood: {
    us: { status: MarketDirection; reason: string };
    canada: { status: MarketDirection; reason: string };
    globalRisk: { status: GlobalRiskLevel; reason: string };
  };
  overnight: Array<{ headline: string; whyItMatters: string }>;
  watchToday: {
    economic: string;
    earnings: string;
    macroRisk: string;
  };
  etfs: Array<{ ticker: string; theme: string; reason: string; status: WatchStatus }>;
  stocks: Array<{ ticker: string; move: string; catalyst: string; watch: string }>;
  marketBriefView: string[];
};

export type PremarketRisk = "Low" | "Medium" | "High" | "Extreme";

export type PremarketBriefContent = {
  snapshot: Array<{ label: string; value: string; move: string }>;
  movers: Array<{ ticker: string; move: string; volumeSignal: string; catalyst: string; risk: PremarketRisk }>;
  catalysts: Array<{ headline: string; affected: string; openImpact: string }>;
  earnings: Array<{ ticker: string; result: string; reaction: string; takeaway: string }>;
  watchlistImpact: Array<{
    stableInstrumentId: string;
    ticker: string;
    move: string;
    reason: string;
    monitor: string;
  }>;
  openingStrategyNotes: string[];
  marketBriefView: string[];
};

export type MarketCloseSummaryContent = {
  snapshot: Array<{ label: string; value: string; move: string }>;
  drivers: Array<{ happened: string; marketReason: string; sectors: string }>;
  sectors: Array<{ sector: string; move: string; driver: string }>;
  movers: Array<{
    ticker: string;
    move: string;
    catalyst: string;
    assessment: string;
    category: "Top gainer" | "Top decliner" | "Watchlist";
    stableInstrumentId?: string;
  }>;
  corporateNews: Array<{ headline: string; affected: string; takeaway: string }>;
  watchTomorrow: { economic: string; earnings: string; macroRisk: string };
  marketBriefView: string[];
};

export type WeeklyWatchlistStatus = "Stable" | "Positive momentum" | "Elevated risk" | "Needs attention";

export type WeeklyMarketRecapContent = {
  scorecard: Array<{ label: string; weeklyMove: string; monthToDate: string; driver: string }>;
  weekInFive: string[];
  sectors: Array<{ sector: string; move: string; reason: string }>;
  importantMoves: Array<{
    ticker: string;
    move: string;
    catalyst: string;
    outlookRisk: string;
    stableInstrumentId?: string;
  }>;
  economicReview: Array<{ topic: string; development: string; impact: string }>;
  nextWeek: Array<{ date: string; event: string; importance: string }>;
  marketBriefView: string[];
  watchlistSummary: Array<{
    stableInstrumentId: string;
    ticker: string;
    move: string;
    development: string;
    status: WeeklyWatchlistStatus;
  }>;
};

export type MasterBriefContent = {
  subject: string;
  previewText: string;
  marketOverview: string;
  regionalSummaries: Record<string, string>;
  stylePerspectives: Record<string, string>;
  experienceExplanations: Record<string, string>;
  optionalSections: Record<string, string>;
  tickerSummaries: Record<string, { headline: string; summary: string }>;
  dailyMarketBrief?: DailyMarketBriefContent;
  premarketBrief?: PremarketBriefContent;
  marketCloseSummary?: MarketCloseSummaryContent;
  weeklyMarketRecap?: WeeklyMarketRecapContent;
};

export type GenerationUsage = {
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
};

export type BriefSource = {
  label: string;
  url?: string;
};

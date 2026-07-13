import { describe, expect, it } from "vitest";
import type { MasterBriefContent } from "../lib/briefing";
import { renderDailyMarketBrief, renderMarketCloseSummary, renderPremarketBrief, renderWeeklyMarketRecap } from "../services/email/templates";

const content: MasterBriefContent = {
  subject: "Your MarketBrief update",
  previewText: "Markets are steady while investors review company results.",
  marketOverview: "US and Canadian markets are mixed in early trading. Bond yields are little changed.",
  regionalSummaries: {
    "Canadian markets": "The TSX is steady, supported by energy shares.",
    "US markets": "The S&P 500 is little changed as investors review earnings.",
  },
  stylePerspectives: { Balanced: "The current moves are modest. Keep short-term changes in context." },
  experienceExplanations: { "Beginner-friendly": "Mixed markets mean some sectors are rising while others are falling." },
  optionalSections: { "Top market-moving news": "Large technology companies remain the main contributors to index movement." },
  tickerSummaries: {
    inst_tcs: { headline: "TCS on NSE", summary: "TCS is steady as investors watch technology spending trends." },
    inst_voo: { headline: "VOO on NYSE Arca", summary: "VOO is tracking a broadly unchanged S&P 500 session." },
  },
  dailyMarketBrief: {
    mood: {
      us: { status: "Neutral", reason: "Futures are little changed before the open." },
      canada: { status: "Bullish", reason: "Energy shares have positive momentum." },
      globalRisk: { status: "Medium", reason: "Rates and geopolitical headlines remain active risks." },
    },
    overnight: [
      { headline: "US futures hold steady", whyItMatters: "Investors are waiting for fresh earnings and economic data." },
      { headline: "Oil prices move higher", whyItMatters: "The move may support Canadian energy producers." },
      { headline: "Bond yields are little changed", whyItMatters: "Stable yields limit immediate pressure on equity valuations." },
    ],
    watchToday: {
      economic: "Watch the inflation release and central-bank remarks.",
      earnings: "Review results and guidance from large technology companies.",
      macroRisk: "Monitor energy prices and geopolitical headlines.",
    },
    etfs: [
      { ticker: "VFV", theme: "US large caps", reason: "Canadian-listed S&P 500 exposure.", status: "Stable" },
      { ticker: "XIU", theme: "Canadian large caps", reason: "Tracks banks and energy leaders.", status: "Positive momentum" },
      { ticker: "ZSP", theme: "US large caps", reason: "A second Canadian-listed S&P 500 reference.", status: "Watch" },
    ],
    stocks: [
      { ticker: "TCS", move: "+0.4%", catalyst: "Technology spending", watch: "Sector commentary" },
      { ticker: "SHOP", move: "-0.3%", catalyst: "E-commerce data", watch: "Opening volume" },
    ],
    marketBriefView: [
      "Overall tone: balanced ahead of new information.",
      "Main opportunity: relative strength in Canadian energy.",
      "Main risk: an unexpected move in rates.",
    ],
  },
  premarketBrief: {
    snapshot: [
      { label: "S&P 500 futures", value: "5,640", move: "+0.2%" },
      { label: "Nasdaq futures", value: "20,360", move: "+0.3%" },
      { label: "Dow futures", value: "41,120", move: "+0.1%" },
      { label: "TSX indicator", value: "22,710", move: "+0.2%" },
      { label: "VIX", value: "14.8", move: "+0.4" },
      { label: "Oil", value: "US$81.20", move: "+0.7%" },
      { label: "Gold", value: "US$2,410", move: "-0.1%" },
      { label: "USD/CAD", value: "1.362", move: "+0.1%" },
    ],
    movers: [
      { ticker: "NVDA", move: "+2.4%", volumeSignal: "Above average", catalyst: "Sector demand update", risk: "High" },
      { ticker: "SHOP", move: "+1.3%", volumeSignal: "Moderate", catalyst: "Analyst commentary", risk: "Medium" },
    ],
    catalysts: [
      { headline: "Technology futures firm", affected: "Semiconductors", openImpact: "Technology may lead early index movement." },
      { headline: "Oil prices move higher", affected: "Canadian energy", openImpact: "Energy shares may receive support." },
    ],
    earnings: [{ ticker: "ABC", result: "Revenue above estimates", reaction: "+3.1%", takeaway: "Guidance remains the focus." }],
    watchlistImpact: [
      { stableInstrumentId: "inst_tcs", ticker: "TCS", move: "+0.4%", reason: "Technology sector strength", monitor: "Opening volume" },
      { stableInstrumentId: "inst_other", ticker: "OTHER", move: "+9.0%", reason: "Not subscribed", monitor: "Should not render" },
    ],
    openingStrategyNotes: [
      "Avoid chasing large opening gaps.",
      "Wait for volume confirmation.",
      "Watch support and resistance.",
      "Note elevated volatility.",
    ],
    marketBriefView: [
      "Strongest setup: technology shows relative strength.",
      "Highest risk: large gaps without volume confirmation.",
      "Overall opening bias: cautiously positive.",
    ],
  },
  marketCloseSummary: {
    snapshot: [
      { label: "S&P 500", value: "5,655", move: "+0.4%" },
      { label: "Nasdaq", value: "18,420", move: "+0.6%" },
      { label: "Dow", value: "41,180", move: "+0.2%" },
      { label: "TSX", value: "22,745", move: "+0.3%" },
      { label: "VIX", value: "14.5", move: "-2.0%" },
      { label: "Oil", value: "US$81.40", move: "+0.9%" },
      { label: "Gold", value: "US$2,405", move: "-0.3%" },
      { label: "USD/CAD", value: "1.361", move: "-0.1%" },
    ],
    drivers: [
      { happened: "Technology shares led indexes higher.", marketReason: "Stable yields supported growth shares.", sectors: "Technology, communication services" },
      { happened: "Oil finished higher.", marketReason: "Supply expectations supported crude prices.", sectors: "Canadian energy" },
    ],
    sectors: [
      { sector: "Technology", move: "+1.1%", driver: "Semiconductor strength" },
      { sector: "Real estate", move: "-0.7%", driver: "Interest-rate sensitivity" },
    ],
    movers: [
      { ticker: "NVDA", move: "+2.5%", catalyst: "Semiconductor strength", assessment: "Closed near the daily high.", category: "Top gainer" },
      { ticker: "XYZ", move: "-4.1%", catalyst: "Lower guidance", assessment: "Selling remained elevated.", category: "Top decliner" },
      { ticker: "TCS", move: "+0.4%", catalyst: "Watchlist relevance", assessment: "Closed in the upper half of its range.", category: "Watchlist", stableInstrumentId: "inst_tcs" },
      { ticker: "OTHER", move: "+9.0%", catalyst: "Not subscribed", assessment: "Should not render.", category: "Watchlist", stableInstrumentId: "inst_other" },
    ],
    corporateNews: [
      { headline: "A software company raised annual guidance.", affected: "Software", takeaway: "The update supported the sector." },
      { headline: "An industrial company reported softer orders.", affected: "Industrials", takeaway: "Demand commentary was the focus." },
    ],
    watchTomorrow: {
      economic: "Watch inflation data and central-bank remarks.",
      earnings: "Review results from major banks and technology companies.",
      macroRisk: "Monitor bond yields, oil, and geopolitical headlines.",
    },
    marketBriefView: [
      "Day’s market character: constructive, led by growth and energy.",
      "Market breadth: gains were concentrated in a few leading sectors.",
      "Main next-session risk: unexpected changes in rates or guidance may shift sentiment.",
    ],
  },
  weeklyMarketRecap: {
    scorecard: [
      { label: "S&P 500", weeklyMove: "+1.2%", monthToDate: "+2.1%", driver: "Technology strength" },
      { label: "Nasdaq", weeklyMove: "+1.8%", monthToDate: "+3.0%", driver: "Semiconductors" },
      { label: "Dow", weeklyMove: "+0.5%", monthToDate: "+1.0%", driver: "Industrials" },
      { label: "TSX", weeklyMove: "+0.9%", monthToDate: "+1.6%", driver: "Energy and banks" },
      { label: "VIX", weeklyMove: "-5.0%", monthToDate: "-7.2%", driver: "Lower volatility" },
      { label: "Oil", weeklyMove: "+2.4%", monthToDate: "+4.1%", driver: "Supply expectations" },
      { label: "Gold", weeklyMove: "-0.6%", monthToDate: "+0.8%", driver: "Stable real yields" },
      { label: "USD/CAD", weeklyMove: "-0.3%", monthToDate: "-0.5%", driver: "Firm Canadian dollar" },
    ],
    weekInFive: [
      "Technology led US equities.",
      "Canadian energy benefited from higher oil.",
      "Bond yields stayed contained.",
      "Central-bank guidance remained cautious.",
      "Volatility eased despite narrow market leadership.",
    ],
    sectors: [
      { sector: "Technology", move: "+2.6%", reason: "Semiconductor strength" },
      { sector: "Real estate", move: "-1.1%", reason: "Financing-cost concerns" },
    ],
    importantMoves: [
      { ticker: "NVDA", move: "+5.2%", catalyst: "Semiconductor demand", outlookRisk: "Expectations remain elevated." },
      { ticker: "TCS", move: "+1.0%", catalyst: "Watchlist relevance", outlookRisk: "Monitor technology spending.", stableInstrumentId: "inst_tcs" },
      { ticker: "OTHER", move: "+9.0%", catalyst: "Not subscribed", outlookRisk: "Should not render.", stableInstrumentId: "inst_other" },
    ],
    economicReview: [
      { topic: "Inflation", development: "Readings moderated gradually.", impact: "Rate expectations changed modestly." },
      { topic: "Employment", development: "Labour data remained resilient.", impact: "Growth concerns stayed contained." },
      { topic: "Federal Reserve", development: "Guidance remained data-dependent.", impact: "Markets retained a cautious outlook." },
      { topic: "Bank of Canada", development: "Officials noted inflation progress.", impact: "Canadian yields were orderly." },
      { topic: "Global central banks", development: "Major banks stayed cautious.", impact: "Currency moves were limited." },
    ],
    nextWeek: [
      { date: "Tuesday", event: "US inflation report", importance: "May influence rate expectations." },
      { date: "Wednesday", event: "Bank of Canada remarks", importance: "May clarify the policy outlook." },
      { date: "Thursday", event: "Major bank earnings", importance: "May show credit and consumer trends." },
    ],
    marketBriefView: [
      "Current market regime: constructive but rate-sensitive.",
      "Strongest theme: technology and energy.",
      "Weakest theme: real estate and utilities.",
      "Main next-week risk: policy surprises may increase volatility.",
    ],
    watchlistSummary: [
      { stableInstrumentId: "inst_tcs", ticker: "TCS", move: "+1.0%", development: "Technology spending remained the focus.", status: "Stable" },
      { stableInstrumentId: "inst_other", ticker: "OTHER", move: "+9.0%", development: "Not subscribed.", status: "Needs attention" },
    ],
  },
};

const profile = {
  name: "Ritoban",
  markets: ["Canadian markets", "US markets"],
  briefingStyle: "Balanced",
  experienceLevel: "Beginner-friendly",
  contentToggles: ["Top market-moving news"],
  watchlist: [
    { stableInstrumentId: "inst_tcs", symbol: "TCS", exchange: "NSE" },
    { stableInstrumentId: "inst_voo", symbol: "VOO", exchange: "NYSE Arca" },
  ],
};

const context = {
  scheduledFor: new Date("2026-07-13T11:00:00.000Z"),
  dataTimestamp: "2026-07-13T10:55:00.000Z",
  timeZone: "America/Toronto",
  sources: [{ label: "Official market data", url: "https://example.com/market-data" }],
  warnings: ["Some international prices may be delayed."],
  managePreferencesUrl: "https://marketbrief.example/preferences",
  unsubscribeUrl: "https://marketbrief.example/unsubscribe",
};

const templates = [
  ["Daily Market Brief", renderDailyMarketBrief],
  ["Premarket Brief", renderPremarketBrief],
  ["Market Close Summary", renderMarketCloseSummary],
  ["Weekly Market Recap", renderWeeklyMarketRecap],
] as const;

describe.each(templates)("%s email template", (title, render) => {
  it("renders email-safe HTML and a plain-text fallback", () => {
    const result = render(content, profile, context);
    expect(result.html).toContain(`>${title}<`);
    expect(result.html).toContain("max-width:680px");
    expect(result.html).toContain('role="presentation"');
    expect(result.html).toContain("Market information only. Not investment advice.");
    expect(result.html).toContain("Manage preferences");
    expect(result.html).toContain("Unsubscribe");
    expect(result.html).toContain("Data timestamp:");
    expect(result.html).toContain("Official market data");
    expect(result.html).not.toContain("<script");
    expect(result.text).toContain(title);
    expect(result.text).toContain("Hi Ritoban,");
    expect(result.text).toContain("FACTS");
    expect(result.text).toContain("INTERPRETATION");
    expect(result.text).toContain("Market information only. Not investment advice.");
    if (title === "Daily Market Brief") {
      expect(result.text).toContain("TCS | +0.4%");
      expect(result.subject).toBe("Daily Market Brief — July 13, 2026");
      expect(result.previewText).toBe("What changed overnight, today’s market mood, and what to watch.");
      expect(result.html).toContain("1. Market Mood");
      expect(result.html).toContain("2. What Changed Overnight");
      expect(result.html).toContain("3. Key Things to Watch Today");
      expect(result.html).toContain("4. ETFs to Watch");
      expect(result.html).toContain("5. Stocks to Watch");
      expect(result.html).toContain("MarketBrief View");
      expect(result.text).not.toMatch(/\b(buy|sell)\b/i);
    } else if (title === "Premarket Brief") {
      expect(result.subject).toBe("Premarket Brief — July 13, 2026");
      expect(result.previewText).toBe("Top gaps, catalysts, risk levels, and what may move at the open.");
      expect(result.html).toContain("1. Premarket Snapshot");
      expect(result.html).toContain("2. Top Premarket Movers");
      expect(result.html).toContain("3. Major News Catalysts");
      expect(result.html).toContain("4. Earnings Movers");
      expect(result.html).toContain("5. Watchlist Impact");
      expect(result.html).toContain("6. Opening Strategy Notes");
      expect(result.html).toContain("7. MarketBrief View");
      expect(result.text).toContain("TCS | +0.4%");
      expect(result.text).not.toContain("OTHER | +9.0%");
      expect(result.text).toContain("Premarket prices may change rapidly");
      expect(result.text).not.toMatch(/\b(buy|sell|short)\b/i);
    } else if (title === "Market Close Summary") {
      expect(result.subject).toBe("Market Close Summary — July 13, 2026");
      expect(result.previewText).toBe("Today’s market performance, key movers, and tomorrow’s focus.");
      expect(result.html).toContain("1. Closing Snapshot");
      expect(result.html).toContain("2. What Drove the Market");
      expect(result.html).toContain("3. Sector Performance");
      expect(result.html).toContain("4. Major Stock and ETF Movers");
      expect(result.html).toContain("5. Earnings and Corporate News");
      expect(result.html).toContain("6. What to Watch Tomorrow");
      expect(result.html).toContain("7. MarketBrief View");
      expect(result.text).toContain("TCS | +0.4%");
      expect(result.text).not.toContain("OTHER | +9.0%");
      expect(result.text).not.toMatch(/\bwill certainly\b/i);
    } else if (title === "Weekly Market Recap") {
      expect(result.subject).toBe("Weekly Market Recap — Week Ending July 13, 2026");
      expect(result.previewText).toBe("What moved markets this week and what matters next week.");
      expect(result.html).toContain("1. Weekly Scorecard");
      expect(result.html).toContain("2. The Week in 5 Points");
      expect(result.html).toContain("3. Best and Worst Performing Sectors");
      expect(result.html).toContain("4. Important Stock and ETF Moves");
      expect(result.html).toContain("5. Economic and Central Bank Review");
      expect(result.html).toContain("6. Next Week’s Calendar");
      expect(result.html).toContain("7. MarketBrief View");
      expect(result.html).toContain("8. Watchlist Summary");
      const fivePointSection = result.text.match(/2\. THE WEEK IN 5 POINTS\n([\s\S]*?)\n\n3\. BEST/);
      expect(fivePointSection?.[1].match(/^\d\. /gm)).toHaveLength(5);
      expect(result.text).toContain("TCS | +1.0%");
      expect(result.text).not.toContain("OTHER | +9.0%");
    } else {
      expect(result.text).toContain("TCS · NSE");
    }
    expect({ html: result.html, text: result.text }).toMatchSnapshot();
  });
});

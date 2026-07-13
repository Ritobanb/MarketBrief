import type { CycleType, MarketSnapshotPayload, MasterBriefContent, SnapshotInstrument } from "../../lib/briefing";
import type { BriefGenerationAdapter, MarketDataAdapter } from "./adapters";

export class MockMarketDataAdapter implements MarketDataAdapter {
  readonly name = "mock-market-data";

  async collect(cycleType: CycleType, instruments: SnapshotInstrument[]) {
    return {
      payload: {
        cycleType,
        asOf: new Date().toISOString(),
        markets: {
          "Canadian markets": "Canadian equities are mixed in the current mock snapshot.",
          "US markets": "US equities are steady in the current mock snapshot.",
          "European markets": "European markets are mixed in the current mock snapshot.",
          "Asia-Pacific markets": "Asia-Pacific markets are steady in the current mock snapshot.",
        },
        instruments,
      },
      sources: [{ label: this.name }],
      warnings: ["Development data only. Connect a market-data adapter before production use."],
    };
  }
}

export class MockBriefGenerationAdapter implements BriefGenerationAdapter {
  readonly model = "mock-no-cost-generator";
  readonly promptVersion = "brief-v1";
  calls = 0;

  async generate(snapshot: MarketSnapshotPayload) {
    this.calls += 1;
    const tickerSummaries = Object.fromEntries(snapshot.instruments.map(instrument => [instrument.stableInstrumentId, {
      headline: `${instrument.symbol} on ${instrument.exchange}`,
      summary: `${instrument.name} is included because it appears on the reader’s watchlist.`,
    }]));
    const content: MasterBriefContent = {
      subject: "Your market brief is ready",
      previewText: "The markets and watchlist names relevant to you.",
      marketOverview: "Markets are mixed as investors assess the latest developments.",
      regionalSummaries: snapshot.markets,
      stylePerspectives: {
        Balanced: "Focus on the main market drivers while keeping short-term moves in context.",
        "Long-term investor": "Consider today’s moves against long-term fundamentals.",
        "Active investor": "Watch momentum and upcoming catalysts.",
        "Day trader": "Monitor volatility and liquidity closely.",
      },
      experienceExplanations: {
        "Beginner-friendly": "Market moves can be temporary; focus on what changed and why it matters.",
        Intermediate: "Compare price action with macroeconomic and company-specific catalysts.",
        Advanced: "Assess cross-asset signals, positioning, and event risk.",
      },
      optionalSections: {
        "General market overview": "The broad market remains mixed.",
        "Top market-moving news": "Investors are weighing the latest economic and company updates.",
        "ETF ideas to watch": "Review diversified exposures before considering any position.",
        "Day-trading opportunities": "Short-term trading carries elevated risk.",
      },
      tickerSummaries,
      dailyMarketBrief: {
        mood: {
          us: { status: "Neutral", reason: "Futures are little changed before the open." },
          canada: { status: "Neutral", reason: "Energy strength is balanced by mixed financial shares." },
          globalRisk: { status: "Medium", reason: "Rates and geopolitical headlines remain the main risks." },
        },
        overnight: [
          { headline: "US futures hold near unchanged", whyItMatters: "Investors are waiting for fresh economic and earnings signals." },
          { headline: "Oil prices edge higher", whyItMatters: "The move may support Canadian energy producers at the open." },
          { headline: "Bond yields remain steady", whyItMatters: "Stable yields reduce immediate pressure on equity valuations." },
        ],
        watchToday: {
          economic: "Review scheduled economic releases and central-bank remarks.",
          earnings: "Watch major company results and updated guidance.",
          macroRisk: "Monitor changes in energy prices and geopolitical headlines.",
        },
        etfs: [
          { ticker: "VFV", theme: "US large caps", reason: "Tracks the S&P 500 in Canadian dollars.", status: "Stable" },
          { ticker: "XIU", theme: "Canadian large caps", reason: "Useful gauge of banks and energy shares.", status: "Watch" },
          { ticker: "ZSP", theme: "US large caps", reason: "Another Canadian-listed S&P 500 reference.", status: "Stable" },
        ],
        stocks: snapshot.instruments.slice(0, 5).map(instrument => ({
          ticker: instrument.symbol,
          move: "Steady",
          catalyst: "Watchlist relevance",
          watch: `Updates from ${instrument.name}`,
        })),
        marketBriefView: [
          "Overall tone: balanced ahead of new information.",
          "Main opportunity: relative strength in selected energy and technology names.",
          "Main risk: a sharp move in rates or geopolitical sentiment.",
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
          { ticker: "CNQ", move: "+0.8%", volumeSignal: "Normal", catalyst: "Higher oil prices", risk: "Low" },
        ],
        catalysts: [
          { headline: "Technology futures firm before the open", affected: "Semiconductors", openImpact: "Large technology names may lead early index movement." },
          { headline: "Oil prices move higher", affected: "Canadian energy", openImpact: "Energy shares may receive support at the open." },
          { headline: "Bond yields hold steady", affected: "Growth stocks", openImpact: "Stable yields limit a fresh valuation headwind." },
        ],
        earnings: [
          { ticker: "ABC", result: "Revenue above estimates", reaction: "+3.1%", takeaway: "Guidance remains the key focus." },
          { ticker: "XYZ", result: "Profit below estimates", reaction: "-2.6%", takeaway: "Margins weakened during the quarter." },
        ],
        watchlistImpact: snapshot.instruments.map(instrument => ({
          stableInstrumentId: instrument.stableInstrumentId,
          ticker: instrument.symbol,
          move: "Steady",
          reason: "No major company-specific catalyst in the cached snapshot.",
          monitor: "Opening volume and the first price range.",
        })),
        openingStrategyNotes: [
          "Avoid chasing large opening gaps; early moves can reverse quickly.",
          "Wait for volume confirmation before interpreting a price move.",
          "Watch established support and resistance levels.",
          "Note elevated volatility and use appropriate risk controls.",
        ],
        marketBriefView: [
          "Strongest setup: technology futures show modest relative strength.",
          "Highest risk: large gaps with weak volume confirmation.",
          "Overall opening bias: cautiously positive, with event risk still active.",
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
          { happened: "Technology shares led major US indexes higher.", marketReason: "Stable yields and firm demand supported large growth companies.", sectors: "Technology, communication services" },
          { happened: "Oil finished higher during the session.", marketReason: "Tighter supply expectations supported crude prices and producers.", sectors: "Canadian energy" },
          { happened: "Volatility eased into the close.", marketReason: "Orderly index gains reduced near-term demand for protection.", sectors: "Broad market" },
        ],
        sectors: [
          { sector: "Technology", move: "+1.1%", driver: "Semiconductor and software strength" },
          { sector: "Energy", move: "+0.8%", driver: "Higher crude-oil prices" },
          { sector: "Utilities", move: "-0.5%", driver: "Rate-sensitive shares lagged" },
          { sector: "Real estate", move: "-0.7%", driver: "Interest-rate sensitivity" },
        ],
        movers: [
          { ticker: "NVDA", move: "+2.5%", catalyst: "Semiconductor strength", assessment: "Closed near the upper part of its daily range.", category: "Top gainer" },
          { ticker: "XYZ", move: "-4.1%", catalyst: "Lower company guidance", assessment: "Selling remained elevated into the close.", category: "Top decliner" },
          ...snapshot.instruments.map(instrument => ({
            ticker: instrument.symbol,
            move: "Steady",
            catalyst: "Watchlist relevance",
            assessment: `Review the closing trend for ${instrument.name}.`,
            category: "Watchlist" as const,
            stableInstrumentId: instrument.stableInstrumentId,
          })),
        ],
        corporateNews: [
          { headline: "A major software company raised annual guidance.", affected: "Software", takeaway: "The update supported the broader technology group." },
          { headline: "An industrial company reported softer orders.", affected: "Industrials", takeaway: "Investors focused on demand commentary for the next quarter." },
        ],
        watchTomorrow: {
          economic: "Watch scheduled inflation data and central-bank remarks.",
          earnings: "Review results from major banks and technology companies.",
          macroRisk: "Monitor changes in bond yields, oil prices, and geopolitical headlines.",
        },
        marketBriefView: [
          "Day’s market character: a constructive session led by growth and energy shares.",
          "Market breadth: gains were positive but concentrated in a few leading sectors.",
          "Main next-session risk: an unexpected change in rates or company guidance could shift sentiment.",
        ],
      },
      weeklyMarketRecap: {
        scorecard: [
          { label: "S&P 500", weeklyMove: "+1.2%", monthToDate: "+2.1%", driver: "Technology strength" },
          { label: "Nasdaq", weeklyMove: "+1.8%", monthToDate: "+3.0%", driver: "Semiconductor gains" },
          { label: "Dow", weeklyMove: "+0.5%", monthToDate: "+1.0%", driver: "Industrials improved" },
          { label: "TSX", weeklyMove: "+0.9%", monthToDate: "+1.6%", driver: "Energy and banks" },
          { label: "VIX", weeklyMove: "-5.0%", monthToDate: "-7.2%", driver: "Lower equity volatility" },
          { label: "Oil", weeklyMove: "+2.4%", monthToDate: "+4.1%", driver: "Supply expectations" },
          { label: "Gold", weeklyMove: "-0.6%", monthToDate: "+0.8%", driver: "Stable real yields" },
          { label: "USD/CAD", weeklyMove: "-0.3%", monthToDate: "-0.5%", driver: "Firm Canadian dollar" },
        ],
        weekInFive: [
          "Technology led US equities as semiconductor shares advanced.",
          "Canadian energy stocks benefited from higher oil prices.",
          "Bond yields stayed contained after mixed economic data.",
          "Central-bank guidance remained cautious and data-dependent.",
          "Market volatility eased, although gains remained concentrated.",
        ],
        sectors: [
          { sector: "Technology", move: "+2.6%", reason: "Semiconductor and software strength" },
          { sector: "Energy", move: "+2.1%", reason: "Higher crude-oil prices" },
          { sector: "Utilities", move: "-0.8%", reason: "Rate sensitivity" },
          { sector: "Real estate", move: "-1.1%", reason: "Financing-cost concerns" },
        ],
        importantMoves: [
          { ticker: "NVDA", move: "+5.2%", catalyst: "Semiconductor demand", outlookRisk: "High expectations increase sensitivity to guidance." },
          { ticker: "XIU", move: "+0.9%", catalyst: "Energy and bank strength", outlookRisk: "Commodity and rate changes remain relevant." },
          ...snapshot.instruments.map(instrument => ({
            ticker: instrument.symbol,
            move: "Steady",
            catalyst: "Watchlist relevance",
            outlookRisk: `Monitor material updates from ${instrument.name}.`,
            stableInstrumentId: instrument.stableInstrumentId,
          })),
        ],
        economicReview: [
          { topic: "Inflation", development: "The latest readings showed gradual moderation.", impact: "Rate expectations changed only modestly." },
          { topic: "Employment", development: "Labour data remained resilient but mixed.", impact: "Growth concerns stayed contained." },
          { topic: "Federal Reserve", development: "Officials repeated a data-dependent approach.", impact: "Markets kept a cautious rate outlook." },
          { topic: "Bank of Canada", development: "Policy guidance emphasized inflation progress.", impact: "Canadian bond yields remained orderly." },
          { topic: "Global central banks", development: "Major banks maintained cautious guidance.", impact: "Currency moves were limited." },
        ],
        nextWeek: [
          { date: "Tuesday", event: "US inflation report", importance: "May influence interest-rate expectations." },
          { date: "Wednesday", event: "Bank of Canada remarks", importance: "Could clarify the Canadian policy outlook." },
          { date: "Thursday", event: "Major bank earnings", importance: "Results may show credit and consumer trends." },
        ],
        marketBriefView: [
          "Current market regime: constructive but still sensitive to rates.",
          "Strongest theme: technology and selected energy shares.",
          "Weakest theme: rate-sensitive real estate and utilities.",
          "Main next-week risk: inflation or policy surprises could increase volatility.",
        ],
        watchlistSummary: snapshot.instruments.map(instrument => ({
          stableInstrumentId: instrument.stableInstrumentId,
          ticker: instrument.symbol,
          move: "Steady",
          development: `${instrument.name} had no major company-specific event in the cached weekly snapshot.`,
          status: "Stable" as const,
        })),
      },
    };
    return { content, usage: { inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0 } };
  }
}

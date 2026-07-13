import type { BriefSource, CycleType, MasterBriefContent } from "../../lib/briefing";
import { AlertBanner, CompactTable, EMAIL_COLORS, Footer, Header, MarketMoodCard, MetricCards, MetricRow, PlainTextFallback, RiskBadge, SectionHeading, SourceLink, WatchlistTable, escapeHtml, type WatchlistEmailRow } from "./components";
import type { RenderProfile } from "../briefing/render";

export type EmailRenderContext = {
  cycleType: CycleType;
  scheduledFor: Date;
  dataTimestamp: string;
  timeZone: string;
  sources: BriefSource[];
  warnings: string[];
  managePreferencesUrl: string;
  unsubscribeUrl: string;
};

const TITLES: Record<CycleType, string> = {
  daily: "Daily Market Brief",
  premarket: "Premarket Brief",
  close: "Market Close Summary",
  weekly: "Weekly Market Recap",
};

function compactText(value: string, maximum = 420) {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= maximum) return clean;
  const clipped = clean.slice(0, maximum);
  const sentence = clipped.lastIndexOf(". ");
  return `${clipped.slice(0, sentence > maximum / 2 ? sentence + 1 : maximum).trim()}…`;
}

function formatDate(value: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone }).format(value);
}

function formatTimestamp(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone, timeZoneName: "short",
  }).format(new Date(value));
}

function paragraph(value: string) {
  return `<p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:${EMAIL_COLORS.navy};">${escapeHtml(compactText(value))}</p>`;
}

function renderDailyTemplate(content: MasterBriefContent, profile: RenderProfile, context: EmailRenderContext) {
  const daily = content.dailyMarketBrief!;
  const title = "Daily Market Brief";
  const date = formatDate(context.scheduledFor, context.timeZone);
  const subjectDate = new Intl.DateTimeFormat("en-CA", { month: "long", day: "numeric", year: "numeric", timeZone: context.timeZone }).format(context.scheduledFor);
  const subject = `Daily Market Brief — ${subjectDate}`;
  const preheader = "What changed overnight, today’s market mood, and what to watch.";
  const greeting = profile.name?.trim() ? `Hi ${profile.name.trim()},` : "Hi,";
  const dataTimestamp = formatTimestamp(context.dataTimestamp, context.timeZone);
  const sources = context.sources.length ? `<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:18px;color:${EMAIL_COLORS.muted};">Sources: ${context.sources.map(SourceLink).join(" · ")}</p>` : "";
  const overnight = daily.overnight.slice(0, 3).map((item, index) => `<tr><td valign="top" style="width:24px;padding:8px 10px 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;font-weight:700;color:${EMAIL_COLORS.blue};">${index + 1}.</td><td valign="top" style="padding:8px 0;border-bottom:1px solid ${EMAIL_COLORS.border};font-family:Arial,Helvetica,sans-serif;"><strong style="display:block;font-size:13px;line-height:19px;color:${EMAIL_COLORS.navy};">${escapeHtml(compactText(item.headline, 120))}</strong><span style="display:block;margin-top:2px;font-size:12px;line-height:18px;color:${EMAIL_COLORS.muted};">${escapeHtml(compactText(item.whyItMatters, 240))}</span></td></tr>`).join("");
  const etfs = daily.etfs.slice(0, 5);
  const stocks = daily.stocks.slice(0, 5);
  const view = daily.marketBriefView.slice(0, 3);
  const viewHtml = view.map(item => `<tr><td valign="top" style="width:16px;padding:5px 8px 5px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:18px;color:${EMAIL_COLORS.blue};">•</td><td style="padding:5px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:${EMAIL_COLORS.navy};">${escapeHtml(compactText(item, 220))}</td></tr>`).join("");

  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting"><title>${escapeHtml(subject)}</title></head><body style="margin:0;padding:0;background:${EMAIL_COLORS.white};"><div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background:${EMAIL_COLORS.white};"><tr><td align="center" style="padding:0 18px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:680px;margin:0 auto;"><tr><td>${Header()}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:24px 0 14px;"><h1 style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:30px;color:${EMAIL_COLORS.navy};">${title}</h1><p style="margin:5px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:${EMAIL_COLORS.muted};">${escapeHtml(date)}</p></td></tr></table><p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:21px;color:${EMAIL_COLORS.navy};">${escapeHtml(greeting)}</p><p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:${EMAIL_COLORS.muted};">${escapeHtml(preheader)}</p>${context.warnings.length ? AlertBanner(compactText(context.warnings[0], 220)) : ""}${SectionHeading("1. Market Mood")}${MarketMoodCard(`US market · ${daily.mood.us.status}`, compactText(daily.mood.us.reason, 160))}${MarketMoodCard(`Canada market · ${daily.mood.canada.status}`, compactText(daily.mood.canada.reason, 160))}${MarketMoodCard(`Global risk · ${daily.mood.globalRisk.status}`, compactText(daily.mood.globalRisk.reason, 160))}${SectionHeading("2. What Changed Overnight")}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px;">${overnight}</table>${SectionHeading("3. Key Things to Watch Today")}${CompactTable(["Area", "What to watch"], [["Economic data / central banks", compactText(daily.watchToday.economic, 180)], ["Earnings / company news", compactText(daily.watchToday.earnings, 180)], ["Geopolitical / macro risk", compactText(daily.watchToday.macroRisk, 180)]])}${SectionHeading("4. ETFs to Watch")}${CompactTable(["ETF", "Theme", "Why watch today", "Status"], etfs.map(etf => [etf.ticker, etf.theme, compactText(etf.reason, 150), etf.status]))}${stocks.length ? `${SectionHeading("5. Stocks to Watch")}${CompactTable(["Ticker", "Move", "Catalyst", "What to watch"], stocks.map(stock => [stock.ticker, stock.move, compactText(stock.catalyst, 120), compactText(stock.watch, 150)]))}` : ""}${SectionHeading("MarketBrief View")}<p style="margin:0 0 6px;">${RiskBadge("Interpretation")}</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px;">${viewHtml}</table><p style="margin:0 0 5px;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:18px;color:${EMAIL_COLORS.muted};"><strong>Data timestamp:</strong> ${escapeHtml(dataTimestamp)}</p>${sources}${Footer(context.managePreferencesUrl, context.unsubscribeUrl)}</td></tr></table></td></tr></table></body></html>`;

  const text = PlainTextFallback({
    brand: "MarketBrief", title, date, greeting, summary: preheader,
    sections: [
      { title: "1. Market Mood — facts", body: `US market — ${daily.mood.us.status}: ${daily.mood.us.reason}\nCanada market — ${daily.mood.canada.status}: ${daily.mood.canada.reason}\nGlobal risk — ${daily.mood.globalRisk.status}: ${daily.mood.globalRisk.reason}` },
      { title: "2. What Changed Overnight", body: daily.overnight.slice(0, 3).map((item, index) => `${index + 1}. ${item.headline}\n${item.whyItMatters}`).join("\n") },
      { title: "3. Key Things to Watch Today", body: `Economic data / central banks: ${daily.watchToday.economic}\nEarnings / company news: ${daily.watchToday.earnings}\nGeopolitical / macro risk: ${daily.watchToday.macroRisk}` },
      { title: "4. ETFs to Watch", body: etfs.map(etf => `${etf.ticker} | ${etf.theme} | ${etf.reason} | ${etf.status}`).join("\n") },
      ...(stocks.length ? [{ title: "5. Stocks to Watch", body: stocks.map(stock => `${stock.ticker} | ${stock.move} | ${stock.catalyst} | ${stock.watch}`).join("\n") }] : []),
      { title: "MarketBrief View — interpretation", body: view.map(item => `• ${item}`).join("\n") },
    ],
    watchlist: [], dataTimestamp, sources: context.sources,
    managePreferencesUrl: context.managePreferencesUrl, unsubscribeUrl: context.unsubscribeUrl,
  });
  return { subject, previewText: preheader, html, text };
}

function renderPremarketTemplate(content: MasterBriefContent, profile: RenderProfile, context: EmailRenderContext) {
  const brief = content.premarketBrief!;
  const title = "Premarket Brief";
  const date = formatDate(context.scheduledFor, context.timeZone);
  const subjectDate = new Intl.DateTimeFormat("en-CA", { month: "long", day: "numeric", year: "numeric", timeZone: context.timeZone }).format(context.scheduledFor);
  const subject = `Premarket Brief — ${subjectDate}`;
  const preheader = "Top gaps, catalysts, risk levels, and what may move at the open.";
  const greeting = profile.name?.trim() ? `Hi ${profile.name.trim()},` : "Hi,";
  const dataTimestamp = formatTimestamp(context.dataTimestamp, context.timeZone);
  const subscribedIds = new Set(profile.watchlist.map(item => item.stableInstrumentId));
  const watchlist = brief.watchlistImpact.filter(item => subscribedIds.has(item.stableInstrumentId));
  const sources = context.sources.length ? `<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:18px;color:${EMAIL_COLORS.muted};">Sources: ${context.sources.map(SourceLink).join(" · ")}</p>` : "";
  const catalysts = brief.catalysts.slice(0, 5).map((item, index) => `<tr><td valign="top" style="width:22px;padding:8px 8px 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;font-weight:700;color:${EMAIL_COLORS.blue};">${index + 1}.</td><td valign="top" style="padding:8px 0;border-bottom:1px solid ${EMAIL_COLORS.border};font-family:Arial,Helvetica,sans-serif;"><strong style="display:block;font-size:13px;line-height:18px;color:${EMAIL_COLORS.navy};">${escapeHtml(compactText(item.headline, 120))}</strong><span style="display:block;margin-top:2px;font-size:11px;line-height:17px;color:${EMAIL_COLORS.muted};">${escapeHtml(item.affected)} · ${escapeHtml(compactText(item.openImpact, 180))}</span></td></tr>`).join("");
  const bullets = (items: string[]) => items.map(item => `<tr><td valign="top" style="width:16px;padding:4px 7px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:18px;color:${EMAIL_COLORS.blue};">•</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:${EMAIL_COLORS.navy};">${escapeHtml(compactText(item, 190))}</td></tr>`).join("");

  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting"><title>${escapeHtml(subject)}</title></head><body style="margin:0;padding:0;background:${EMAIL_COLORS.white};"><div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background:${EMAIL_COLORS.white};"><tr><td align="center" style="padding:0 18px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:680px;margin:0 auto;"><tr><td>${Header()}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:24px 0 14px;"><h1 style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:30px;color:${EMAIL_COLORS.navy};">${title}</h1><p style="margin:5px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:${EMAIL_COLORS.muted};">${escapeHtml(date)}</p></td></tr></table><p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:21px;color:${EMAIL_COLORS.navy};">${escapeHtml(greeting)}</p><p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:${EMAIL_COLORS.muted};">${escapeHtml(preheader)}</p>${context.warnings.length ? AlertBanner(compactText(context.warnings[0], 220)) : ""}${SectionHeading("1. Premarket Snapshot")}${MetricCards(brief.snapshot)}${SectionHeading("2. Top Premarket Movers")}${CompactTable(["Ticker", "Premarket move", "Volume signal", "Catalyst", "Risk"], brief.movers.map(item => [item.ticker, item.move, item.volumeSignal, compactText(item.catalyst, 100), item.risk]))}${SectionHeading("3. Major News Catalysts")}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px;">${catalysts}</table>${SectionHeading("4. Earnings Movers")}${CompactTable(["Ticker", "Result", "Market reaction", "Key takeaway"], brief.earnings.map(item => [item.ticker, compactText(item.result, 100), item.reaction, compactText(item.takeaway, 130)]))}${watchlist.length ? `${SectionHeading("5. Watchlist Impact")}${CompactTable(["Ticker", "Premarket move", "Reason", "What to monitor"], watchlist.map(item => [item.ticker, item.move, compactText(item.reason, 120), compactText(item.monitor, 120)]))}` : ""}${SectionHeading("6. Opening Strategy Notes")}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px;">${bullets(brief.openingStrategyNotes.slice(0, 4))}</table>${SectionHeading("7. MarketBrief View")}<p style="margin:0 0 6px;">${RiskBadge("Interpretation")}</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px;">${bullets(brief.marketBriefView.slice(0, 3))}</table><p style="margin:0 0 5px;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:18px;color:${EMAIL_COLORS.muted};"><strong>Data timestamp:</strong> ${escapeHtml(dataTimestamp)}</p><p style="margin:0 0 10px;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:18px;color:${EMAIL_COLORS.muted};">Premarket prices may change rapidly before the opening bell.</p>${sources}${Footer(context.managePreferencesUrl, context.unsubscribeUrl)}</td></tr></table></td></tr></table></body></html>`;

  const text = PlainTextFallback({ brand: "MarketBrief", title, date, greeting, summary: preheader, sections: [
    { title: "1. Premarket Snapshot — facts", body: brief.snapshot.map(item => `${item.label}: ${item.value} (${item.move})`).join("\n") },
    { title: "2. Top Premarket Movers", body: brief.movers.map(item => `${item.ticker} | ${item.move} | ${item.volumeSignal} | ${item.catalyst} | ${item.risk}`).join("\n") },
    { title: "3. Major News Catalysts", body: brief.catalysts.slice(0, 5).map((item, index) => `${index + 1}. ${item.headline}\n${item.affected}: ${item.openImpact}`).join("\n") },
    { title: "4. Earnings Movers", body: brief.earnings.map(item => `${item.ticker} | ${item.result} | ${item.reaction} | ${item.takeaway}`).join("\n") },
    ...(watchlist.length ? [{ title: "5. Watchlist Impact", body: watchlist.map(item => `${item.ticker} | ${item.move} | ${item.reason} | ${item.monitor}`).join("\n") }] : []),
    { title: "6. Opening Strategy Notes", body: brief.openingStrategyNotes.slice(0, 4).map(item => `• ${item}`).join("\n") },
    { title: "7. MarketBrief View — interpretation", body: brief.marketBriefView.slice(0, 3).map(item => `• ${item}`).join("\n") },
    { title: "Premarket data note", body: "Premarket prices may change rapidly before the opening bell." },
  ], watchlist: [], dataTimestamp, sources: context.sources, managePreferencesUrl: context.managePreferencesUrl, unsubscribeUrl: context.unsubscribeUrl });
  return { subject, previewText: preheader, html, text };
}

function renderMarketCloseTemplate(content: MasterBriefContent, profile: RenderProfile, context: EmailRenderContext) {
  const brief = content.marketCloseSummary!;
  const title = "Market Close Summary";
  const date = formatDate(context.scheduledFor, context.timeZone);
  const subjectDate = new Intl.DateTimeFormat("en-CA", { month: "long", day: "numeric", year: "numeric", timeZone: context.timeZone }).format(context.scheduledFor);
  const subject = `Market Close Summary — ${subjectDate}`;
  const preheader = "Today’s market performance, key movers, and tomorrow’s focus.";
  const greeting = profile.name?.trim() ? `Hi ${profile.name.trim()},` : "Hi,";
  const dataTimestamp = formatTimestamp(context.dataTimestamp, context.timeZone);
  const subscribedIds = new Set(profile.watchlist.map(item => item.stableInstrumentId));
  const movers = brief.movers.filter(item => item.category !== "Watchlist" || (item.stableInstrumentId && subscribedIds.has(item.stableInstrumentId)));
  const sources = context.sources.length ? `<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:18px;color:${EMAIL_COLORS.muted};">Sources: ${context.sources.map(SourceLink).join(" · ")}</p>` : "";
  const drivers = brief.drivers.slice(0, 3).map((item, index) => `<tr><td valign="top" style="width:22px;padding:8px 8px 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;font-weight:700;color:${EMAIL_COLORS.blue};">${index + 1}.</td><td valign="top" style="padding:8px 0;border-bottom:1px solid ${EMAIL_COLORS.border};font-family:Arial,Helvetica,sans-serif;"><strong style="display:block;font-size:13px;line-height:18px;color:${EMAIL_COLORS.navy};">${escapeHtml(compactText(item.happened, 130))}</strong><span style="display:block;margin-top:2px;font-size:11px;line-height:17px;color:${EMAIL_COLORS.muted};">${escapeHtml(compactText(item.marketReason, 180))}</span><span style="display:block;margin-top:2px;font-size:11px;line-height:17px;color:${EMAIL_COLORS.blue};">Affected: ${escapeHtml(item.sectors)}</span></td></tr>`).join("");
  const news = brief.corporateNews.slice(0, 5).map((item, index) => `<tr><td valign="top" style="width:22px;padding:8px 8px 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;font-weight:700;color:${EMAIL_COLORS.blue};">${index + 1}.</td><td valign="top" style="padding:8px 0;border-bottom:1px solid ${EMAIL_COLORS.border};font-family:Arial,Helvetica,sans-serif;"><strong style="display:block;font-size:13px;line-height:18px;color:${EMAIL_COLORS.navy};">${escapeHtml(compactText(item.headline, 130))}</strong><span style="display:block;margin-top:2px;font-size:11px;line-height:17px;color:${EMAIL_COLORS.muted};">${escapeHtml(item.affected)} · ${escapeHtml(compactText(item.takeaway, 180))}</span></td></tr>`).join("");
  const view = brief.marketBriefView.slice(0, 3).map(item => `<tr><td valign="top" style="width:16px;padding:4px 7px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:18px;color:${EMAIL_COLORS.blue};">•</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:${EMAIL_COLORS.navy};">${escapeHtml(compactText(item, 190))}</td></tr>`).join("");

  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting"><title>${escapeHtml(subject)}</title></head><body style="margin:0;padding:0;background:${EMAIL_COLORS.white};"><div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background:${EMAIL_COLORS.white};"><tr><td align="center" style="padding:0 18px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:680px;margin:0 auto;"><tr><td>${Header()}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:24px 0 14px;"><h1 style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:30px;color:${EMAIL_COLORS.navy};">${title}</h1><p style="margin:5px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:${EMAIL_COLORS.muted};">${escapeHtml(date)}</p></td></tr></table><p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:21px;color:${EMAIL_COLORS.navy};">${escapeHtml(greeting)}</p><p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:${EMAIL_COLORS.muted};">${escapeHtml(preheader)}</p>${context.warnings.length ? AlertBanner(compactText(context.warnings[0], 220)) : ""}${SectionHeading("1. Closing Snapshot")}${MetricCards(brief.snapshot)}${SectionHeading("2. What Drove the Market")}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px;">${drivers}</table>${SectionHeading("3. Sector Performance")}${CompactTable(["Sector", "Daily move", "Main driver"], brief.sectors.map(item => [item.sector, item.move, compactText(item.driver, 140)]))}${SectionHeading("4. Major Stock and ETF Movers")}${CompactTable(["Ticker", "Daily move", "Catalyst", "Closing assessment"], movers.map(item => [item.ticker, item.move, compactText(item.catalyst, 110), compactText(item.assessment, 130)]))}${SectionHeading("5. Earnings and Corporate News")}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px;">${news}</table>${SectionHeading("6. What to Watch Tomorrow")}${CompactTable(["Area", "What to watch"], [["Economic events", compactText(brief.watchTomorrow.economic, 180)], ["Major earnings", compactText(brief.watchTomorrow.earnings, 180)], ["Geopolitical / macro risks", compactText(brief.watchTomorrow.macroRisk, 180)]])}${SectionHeading("7. MarketBrief View")}<p style="margin:0 0 6px;">${RiskBadge("Interpretation")}</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px;">${view}</table><p style="margin:0 0 5px;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:18px;color:${EMAIL_COLORS.muted};"><strong>Data timestamp:</strong> ${escapeHtml(dataTimestamp)}</p>${sources}${Footer(context.managePreferencesUrl, context.unsubscribeUrl)}</td></tr></table></td></tr></table></body></html>`;

  const text = PlainTextFallback({ brand: "MarketBrief", title, date, greeting, summary: preheader, sections: [
    { title: "1. Closing Snapshot — facts", body: brief.snapshot.map(item => `${item.label}: ${item.value} (${item.move})`).join("\n") },
    { title: "2. What Drove the Market", body: brief.drivers.slice(0, 3).map((item, index) => `${index + 1}. ${item.happened}\n${item.marketReason}\nAffected: ${item.sectors}`).join("\n") },
    { title: "3. Sector Performance", body: brief.sectors.map(item => `${item.sector} | ${item.move} | ${item.driver}`).join("\n") },
    { title: "4. Major Stock and ETF Movers", body: movers.map(item => `${item.ticker} | ${item.move} | ${item.catalyst} | ${item.assessment}`).join("\n") },
    { title: "5. Earnings and Corporate News", body: brief.corporateNews.slice(0, 5).map((item, index) => `${index + 1}. ${item.headline}\n${item.affected}: ${item.takeaway}`).join("\n") },
    { title: "6. What to Watch Tomorrow", body: `Economic events: ${brief.watchTomorrow.economic}\nMajor earnings: ${brief.watchTomorrow.earnings}\nGeopolitical / macro risks: ${brief.watchTomorrow.macroRisk}` },
    { title: "7. MarketBrief View — interpretation", body: brief.marketBriefView.slice(0, 3).map(item => `• ${item}`).join("\n") },
  ], watchlist: [], dataTimestamp, sources: context.sources, managePreferencesUrl: context.managePreferencesUrl, unsubscribeUrl: context.unsubscribeUrl });
  return { subject, previewText: preheader, html, text };
}

function renderWeeklyTemplate(content: MasterBriefContent, profile: RenderProfile, context: EmailRenderContext) {
  const brief = content.weeklyMarketRecap!;
  const title = "Weekly Market Recap";
  const date = formatDate(context.scheduledFor, context.timeZone);
  const subjectDate = new Intl.DateTimeFormat("en-CA", { month: "long", day: "numeric", year: "numeric", timeZone: context.timeZone }).format(context.scheduledFor);
  const subject = `Weekly Market Recap — Week Ending ${subjectDate}`;
  const preheader = "What moved markets this week and what matters next week.";
  const greeting = profile.name?.trim() ? `Hi ${profile.name.trim()},` : "Hi,";
  const dataTimestamp = formatTimestamp(context.dataTimestamp, context.timeZone);
  const subscribedIds = new Set(profile.watchlist.map(item => item.stableInstrumentId));
  const watchlist = brief.watchlistSummary.filter(item => subscribedIds.has(item.stableInstrumentId));
  const importantMoves = brief.importantMoves.filter(item => !item.stableInstrumentId || subscribedIds.has(item.stableInstrumentId));
  const sources = context.sources.length ? `<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:18px;color:${EMAIL_COLORS.muted};">Sources: ${context.sources.map(SourceLink).join(" · ")}</p>` : "";
  const fivePoints = brief.weekInFive.map((item, index) => `<tr><td valign="top" style="width:22px;padding:7px 8px 7px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;font-weight:700;color:${EMAIL_COLORS.blue};">${index + 1}.</td><td style="padding:7px 0;border-bottom:1px solid ${EMAIL_COLORS.border};font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:${EMAIL_COLORS.navy};">${escapeHtml(compactText(item, 200))}</td></tr>`).join("");
  const view = brief.marketBriefView.slice(0, 4).map(item => `<tr><td valign="top" style="width:16px;padding:4px 7px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:18px;color:${EMAIL_COLORS.blue};">•</td><td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:${EMAIL_COLORS.navy};">${escapeHtml(compactText(item, 190))}</td></tr>`).join("");

  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting"><title>${escapeHtml(subject)}</title></head><body style="margin:0;padding:0;background:${EMAIL_COLORS.white};"><div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background:${EMAIL_COLORS.white};"><tr><td align="center" style="padding:0 18px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:680px;margin:0 auto;"><tr><td>${Header()}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:24px 0 14px;"><h1 style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:30px;color:${EMAIL_COLORS.navy};">${title}</h1><p style="margin:5px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:${EMAIL_COLORS.muted};">Week ending ${escapeHtml(date)}</p></td></tr></table><p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:21px;color:${EMAIL_COLORS.navy};">${escapeHtml(greeting)}</p><p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:${EMAIL_COLORS.muted};">${escapeHtml(preheader)}</p>${context.warnings.length ? AlertBanner(compactText(context.warnings[0], 220)) : ""}${SectionHeading("1. Weekly Scorecard")}${CompactTable(["Index / Asset", "Weekly move", "Month-to-date", "Main driver"], brief.scorecard.map(item => [item.label, item.weeklyMove, item.monthToDate, compactText(item.driver, 120)]))}${SectionHeading("2. The Week in 5 Points")}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px;">${fivePoints}</table>${SectionHeading("3. Best and Worst Performing Sectors")}${CompactTable(["Sector", "Weekly move", "Why"], brief.sectors.map(item => [item.sector, item.move, compactText(item.reason, 140)]))}${SectionHeading("4. Important Stock and ETF Moves")}${CompactTable(["Ticker", "Weekly move", "Main catalyst", "Outlook risk"], importantMoves.map(item => [item.ticker, item.move, compactText(item.catalyst, 110), compactText(item.outlookRisk, 130)]))}${SectionHeading("5. Economic and Central Bank Review")}${CompactTable(["Topic", "What mattered", "Market impact"], brief.economicReview.map(item => [item.topic, compactText(item.development, 140), compactText(item.impact, 130)]))}${SectionHeading("6. Next Week’s Calendar")}${CompactTable(["Date", "Event", "Why it matters"], brief.nextWeek.map(item => [item.date, compactText(item.event, 120), compactText(item.importance, 140)]))}${SectionHeading("7. MarketBrief View")}<p style="margin:0 0 6px;">${RiskBadge("Interpretation")}</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px;">${view}</table>${watchlist.length ? `${SectionHeading("8. Watchlist Summary")}${CompactTable(["Ticker", "Weekly move", "Key development", "Status"], watchlist.map(item => [item.ticker, item.move, compactText(item.development, 140), item.status]))}` : ""}<p style="margin:0 0 5px;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:18px;color:${EMAIL_COLORS.muted};"><strong>Data timestamp:</strong> ${escapeHtml(dataTimestamp)}</p>${sources}${Footer(context.managePreferencesUrl, context.unsubscribeUrl)}</td></tr></table></td></tr></table></body></html>`;

  const text = PlainTextFallback({ brand: "MarketBrief", title, date: `Week ending ${date}`, greeting, summary: preheader, sections: [
    { title: "1. Weekly Scorecard — facts", body: brief.scorecard.map(item => `${item.label} | ${item.weeklyMove} | ${item.monthToDate} | ${item.driver}`).join("\n") },
    { title: "2. The Week in 5 Points", body: brief.weekInFive.map((item, index) => `${index + 1}. ${item}`).join("\n") },
    { title: "3. Best and Worst Performing Sectors", body: brief.sectors.map(item => `${item.sector} | ${item.move} | ${item.reason}`).join("\n") },
    { title: "4. Important Stock and ETF Moves", body: importantMoves.map(item => `${item.ticker} | ${item.move} | ${item.catalyst} | ${item.outlookRisk}`).join("\n") },
    { title: "5. Economic and Central Bank Review", body: brief.economicReview.map(item => `${item.topic} | ${item.development} | ${item.impact}`).join("\n") },
    { title: "6. Next Week’s Calendar", body: brief.nextWeek.map(item => `${item.date} | ${item.event} | ${item.importance}`).join("\n") },
    { title: "7. MarketBrief View — interpretation", body: brief.marketBriefView.slice(0, 4).map(item => `• ${item}`).join("\n") },
    ...(watchlist.length ? [{ title: "8. Watchlist Summary", body: watchlist.map(item => `${item.ticker} | ${item.move} | ${item.development} | ${item.status}`).join("\n") }] : []),
  ], watchlist: [], dataTimestamp, sources: context.sources, managePreferencesUrl: context.managePreferencesUrl, unsubscribeUrl: context.unsubscribeUrl });
  return { subject, previewText: preheader, html, text };
}

export function renderEmailTemplate(content: MasterBriefContent, profile: RenderProfile, context: EmailRenderContext) {
  if (context.cycleType === "daily" && content.dailyMarketBrief) return renderDailyTemplate(content, profile, context);
  if (context.cycleType === "premarket" && content.premarketBrief) return renderPremarketTemplate(content, profile, context);
  if (context.cycleType === "close" && content.marketCloseSummary) return renderMarketCloseTemplate(content, profile, context);
  if (context.cycleType === "weekly" && content.weeklyMarketRecap) return renderWeeklyTemplate(content, profile, context);
  const title = TITLES[context.cycleType];
  const date = formatDate(context.scheduledFor, context.timeZone);
  const dataTimestamp = formatTimestamp(context.dataTimestamp, context.timeZone);
  const greeting = profile.name?.trim() ? `Hi ${profile.name.trim()},` : "Hi,";
  const watchlist: WatchlistEmailRow[] = profile.watchlist.flatMap(instrument => {
    const summary = content.tickerSummaries[instrument.stableInstrumentId];
    return summary ? [{ symbol: instrument.symbol, exchange: instrument.exchange, summary: compactText(summary.summary, 220) }] : [];
  });
  const marketRows = profile.markets.flatMap(market => content.regionalSummaries[market] ? [MetricRow(market, compactText(content.regionalSummaries[market], 180))] : []);
  const interpretation = [content.stylePerspectives[profile.briefingStyle], content.experienceExplanations[profile.experienceLevel]].filter(Boolean).map(value => compactText(value)).join(" ");
  const optionalSections = profile.contentToggles.flatMap(section => content.optionalSections[section] ? [{ title: section, body: compactText(content.optionalSections[section]) }] : []);
  const sources = context.sources.length ? `<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:18px;color:${EMAIL_COLORS.muted};">Sources: ${context.sources.map(SourceLink).join(" · ")}</p>` : "";
  const warning = context.warnings.length ? AlertBanner(compactText(context.warnings[0], 240)) : "";

  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting"><title>${escapeHtml(title)}</title></head><body style="margin:0;padding:0;background:${EMAIL_COLORS.white};"><div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(compactText(content.previewText, 140))}</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background:${EMAIL_COLORS.white};"><tr><td align="center" style="padding:0 18px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:680px;margin:0 auto;"> <tr><td>${Header()}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:24px 0 14px;"><h1 style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:30px;color:${EMAIL_COLORS.navy};">${escapeHtml(title)}</h1><p style="margin:5px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:${EMAIL_COLORS.muted};">${escapeHtml(date)}</p></td></tr></table><p style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:21px;color:${EMAIL_COLORS.navy};">${escapeHtml(greeting)}</p>${AlertBanner(compactText(content.previewText, 180))}${warning}${SectionHeading("Market mood")}${MarketMoodCard("Facts", compactText(content.marketOverview, 240))}${marketRows.length ? `${SectionHeading("Market snapshot")}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px;">${marketRows.join("")}</table>` : ""}${interpretation ? `${SectionHeading("Interpretation")}<p style="margin:0 0 18px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:${EMAIL_COLORS.navy};">${RiskBadge("Interpretation")}<span style="display:inline-block;margin-left:7px;">${escapeHtml(interpretation)}</span></p>` : ""}${optionalSections.map(section => `${SectionHeading(section.title)}${paragraph(section.body)}`).join("")}${WatchlistTable(watchlist)}<p style="margin:0 0 5px;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:18px;color:${EMAIL_COLORS.muted};"><strong>Data timestamp:</strong> ${escapeHtml(dataTimestamp)}</p>${sources}${Footer(context.managePreferencesUrl, context.unsubscribeUrl)}</td></tr></table></td></tr></table></body></html>`;

  const textSections = [
    ...context.warnings.slice(0, 1).map(note => ({ title: "Data note", body: compactText(note, 240) })),
    { title: "Market mood — facts", body: compactText(content.marketOverview) },
    ...profile.markets.flatMap(market => content.regionalSummaries[market] ? [{ title: market, body: compactText(content.regionalSummaries[market]) }] : []),
    ...(interpretation ? [{ title: "Interpretation", body: interpretation }] : []),
    ...optionalSections,
  ];
  const text = PlainTextFallback({
    brand: "MarketBrief", title, date, greeting, summary: compactText(content.previewText), sections: textSections,
    watchlist, dataTimestamp, sources: context.sources,
    managePreferencesUrl: context.managePreferencesUrl, unsubscribeUrl: context.unsubscribeUrl,
  });

  return { subject: content.subject, previewText: compactText(content.previewText, 140), html, text };
}

export const renderDailyMarketBrief = (content: MasterBriefContent, profile: RenderProfile, context: Omit<EmailRenderContext, "cycleType">) => renderEmailTemplate(content, profile, { ...context, cycleType: "daily" });
export const renderPremarketBrief = (content: MasterBriefContent, profile: RenderProfile, context: Omit<EmailRenderContext, "cycleType">) => renderEmailTemplate(content, profile, { ...context, cycleType: "premarket" });
export const renderMarketCloseSummary = (content: MasterBriefContent, profile: RenderProfile, context: Omit<EmailRenderContext, "cycleType">) => renderEmailTemplate(content, profile, { ...context, cycleType: "close" });
export const renderWeeklyMarketRecap = (content: MasterBriefContent, profile: RenderProfile, context: Omit<EmailRenderContext, "cycleType">) => renderEmailTemplate(content, profile, { ...context, cycleType: "weekly" });

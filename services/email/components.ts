import type { BriefSource } from "../../lib/briefing";

export const EMAIL_COLORS = {
  navy: "#10243e",
  blue: "#2563eb",
  paleBlue: "#eff6ff",
  border: "#dbe3ee",
  muted: "#5f6f82",
  white: "#ffffff",
} as const;

export type EmailSource = BriefSource;
export type WatchlistEmailRow = { symbol: string; exchange: string; summary: string };

export function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function safeUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? escapeHtml(url.toString()) : "#";
  } catch {
    return "#";
  }
}

export function Header() {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:20px 0 14px;border-bottom:1px solid ${EMAIL_COLORS.border};font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:20px;font-weight:700;color:${EMAIL_COLORS.navy};">Market<span style="color:${EMAIL_COLORS.blue};">Brief</span></td></tr></table>`;
}

export function SectionHeading(title: string) {
  return `<h2 style="margin:0 0 10px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:21px;color:${EMAIL_COLORS.navy};">${escapeHtml(title)}</h2>`;
}

export function MarketMoodCard(label: string, value: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 14px;border:1px solid ${EMAIL_COLORS.border};"><tr><td style="padding:12px 14px;font-family:Arial,Helvetica,sans-serif;"><div style="font-size:11px;line-height:16px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:${EMAIL_COLORS.blue};">${escapeHtml(label)}</div><div style="margin-top:3px;font-size:14px;line-height:20px;color:${EMAIL_COLORS.navy};">${escapeHtml(value)}</div></td></tr></table>`;
}

export function MetricRow(label: string, value: string) {
  return `<tr><td valign="top" style="padding:8px 10px 8px 0;border-bottom:1px solid ${EMAIL_COLORS.border};font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:${EMAIL_COLORS.muted};">${escapeHtml(label)}</td><td valign="top" align="right" style="padding:8px 0 8px 10px;border-bottom:1px solid ${EMAIL_COLORS.border};font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;font-weight:700;color:${EMAIL_COLORS.navy};">${escapeHtml(value)}</td></tr>`;
}

export function MetricCards(rows: Array<{ label: string; value: string; move: string }>) {
  if (!rows.length) return "";
  const cards = rows.map(row => `<td valign="top" width="25%" style="padding:0 6px 12px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${EMAIL_COLORS.border};"><tr><td style="padding:10px;font-family:Arial,Helvetica,sans-serif;"><div style="font-size:10px;line-height:14px;font-weight:700;text-transform:uppercase;letter-spacing:.3px;color:${EMAIL_COLORS.muted};">${escapeHtml(row.label)}</div><div style="margin-top:3px;font-size:14px;line-height:18px;font-weight:700;color:${EMAIL_COLORS.navy};">${escapeHtml(row.value)}</div><div style="margin-top:2px;font-size:11px;line-height:15px;color:${EMAIL_COLORS.blue};">${escapeHtml(row.move)}</div></td></tr></table></td>`);
  const tableRows = Array.from({ length: Math.ceil(cards.length / 4) }, (_, index) => `<tr>${cards.slice(index * 4, index * 4 + 4).join("")}</tr>`).join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 6px;table-layout:fixed;">${tableRows}</table>`;
}

export function CompactTable(headers: string[], rows: string[][]) {
  if (!rows.length) return "";
  const header = headers.map((value, index) => `<th align="left" style="padding:7px ${index === headers.length - 1 ? "0" : "8px"} 7px ${index === 0 ? "0" : "8px"};background:${EMAIL_COLORS.paleBlue};font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:14px;text-transform:uppercase;letter-spacing:.3px;color:${EMAIL_COLORS.muted};">${escapeHtml(value)}</th>`).join("");
  const body = rows.map(row => `<tr>${row.map((value, index) => `<td valign="top" style="padding:9px ${index === row.length - 1 ? "0" : "8px"} 9px ${index === 0 ? "0" : "8px"};border-bottom:1px solid ${EMAIL_COLORS.border};font-family:Arial,Helvetica,sans-serif;font-size:${index === 0 ? "12px" : "11px"};line-height:17px;${index === 0 ? `font-weight:700;` : ""}color:${EMAIL_COLORS.navy};">${escapeHtml(value)}</td>`).join("")}</tr>`).join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px;table-layout:auto;"><tr>${header}</tr>${body}</table>`;
}

export function WatchlistTable(rows: WatchlistEmailRow[]) {
  if (!rows.length) return "";
  const body = rows.map(row => `<tr><td valign="top" style="padding:10px 8px 10px 0;border-bottom:1px solid ${EMAIL_COLORS.border};font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:18px;font-weight:700;color:${EMAIL_COLORS.navy};white-space:nowrap;">${escapeHtml(row.symbol)}</td><td valign="top" style="padding:10px 8px;border-bottom:1px solid ${EMAIL_COLORS.border};font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:18px;color:${EMAIL_COLORS.muted};white-space:nowrap;">${escapeHtml(row.exchange)}</td><td valign="top" style="padding:10px 0 10px 8px;border-bottom:1px solid ${EMAIL_COLORS.border};font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:${EMAIL_COLORS.navy};">${escapeHtml(row.summary)}</td></tr>`).join("");
  return `${SectionHeading("Your watchlist")}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px;"><tr><th align="left" style="padding:7px 8px 7px 0;background:${EMAIL_COLORS.paleBlue};font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:14px;text-transform:uppercase;letter-spacing:.4px;color:${EMAIL_COLORS.muted};">Ticker</th><th align="left" style="padding:7px 8px;background:${EMAIL_COLORS.paleBlue};font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:14px;text-transform:uppercase;letter-spacing:.4px;color:${EMAIL_COLORS.muted};">Exchange</th><th align="left" style="padding:7px 0 7px 8px;background:${EMAIL_COLORS.paleBlue};font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:14px;text-transform:uppercase;letter-spacing:.4px;color:${EMAIL_COLORS.muted};">Update</th></tr>${body}</table>`;
}

export function AlertBanner(text: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px;background:${EMAIL_COLORS.paleBlue};border-left:3px solid ${EMAIL_COLORS.blue};"><tr><td style="padding:10px 12px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:${EMAIL_COLORS.navy};">${escapeHtml(text)}</td></tr></table>`;
}

export function RiskBadge(label: string) {
  return `<span style="display:inline-block;padding:3px 7px;border:1px solid ${EMAIL_COLORS.blue};border-radius:12px;font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:14px;font-weight:700;color:${EMAIL_COLORS.blue};">${escapeHtml(label)}</span>`;
}

export function SourceLink(source: EmailSource) {
  return source.url
    ? `<a href="${safeUrl(source.url)}" style="color:${EMAIL_COLORS.blue};text-decoration:underline;">${escapeHtml(source.label)}</a>`
    : escapeHtml(source.label);
}

export function Footer(managePreferencesUrl: string, unsubscribeUrl: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:18px 0 24px;border-top:1px solid ${EMAIL_COLORS.border};font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:18px;color:${EMAIL_COLORS.muted};"><a href="${safeUrl(managePreferencesUrl)}" style="color:${EMAIL_COLORS.blue};text-decoration:underline;">Manage preferences</a>&nbsp;&nbsp;·&nbsp;&nbsp;<a href="${safeUrl(unsubscribeUrl)}" style="color:${EMAIL_COLORS.blue};text-decoration:underline;">Unsubscribe</a><br><span style="display:inline-block;margin-top:8px;">Market information only. Not investment advice.</span></td></tr></table>`;
}

export function PlainTextFallback(parts: {
  brand: string;
  title: string;
  date: string;
  greeting: string;
  summary: string;
  sections: Array<{ title: string; body: string }>;
  watchlist: WatchlistEmailRow[];
  dataTimestamp: string;
  sources: EmailSource[];
  managePreferencesUrl: string;
  unsubscribeUrl: string;
}) {
  const lines = [parts.brand.toUpperCase(), parts.title, parts.date, "", parts.greeting, "", parts.summary];
  for (const section of parts.sections) lines.push("", section.title.toUpperCase(), section.body);
  if (parts.watchlist.length) {
    lines.push("", "YOUR WATCHLIST");
    for (const row of parts.watchlist) lines.push(`${row.symbol} · ${row.exchange}\n${row.summary}`);
  }
  lines.push("", `Data timestamp: ${parts.dataTimestamp}`);
  if (parts.sources.length) lines.push(`Sources: ${parts.sources.map(source => source.url ? `${source.label} (${source.url})` : source.label).join(", ")}`);
  lines.push("", `Manage preferences: ${parts.managePreferencesUrl}`, `Unsubscribe: ${parts.unsubscribeUrl}`, "", "Market information only. Not investment advice.");
  return lines.join("\n");
}

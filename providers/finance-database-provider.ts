import type { ProviderInstrument } from "../lib/instruments";
import { parseCsv } from "./csv";
import { InstrumentProvider, uniqueInstruments } from "./instrument-provider";

const BASE_URL = "https://raw.githubusercontent.com/JerBouma/FinanceDatabase/main/database/equities";

export type MarketConfig = {
  file: "TOR" | "LSE" | "ASX" | "NSE" | "NSI";
  exchange: "TSX" | "LSE" | "ASX" | "NSE";
  country: "CA" | "GB" | "AU" | "IN";
  currency: "CAD" | "GBP" | "AUD" | "INR";
  suffix: string;
};

const MARKETS: MarketConfig[] = [
  { file: "TOR", exchange: "TSX", country: "CA", currency: "CAD", suffix: ".TO" },
  { file: "LSE", exchange: "LSE", country: "GB", currency: "GBP", suffix: ".L" },
  { file: "ASX", exchange: "ASX", country: "AU", currency: "AUD", suffix: ".AX" },
  { file: "NSE", exchange: "NSE", country: "IN", currency: "INR", suffix: ".NS" },
  { file: "NSI", exchange: "NSE", country: "IN", currency: "INR", suffix: ".NS" },
];

function normalizeCurrency(value: string, fallback: MarketConfig["currency"]) {
  const currency = value.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(currency) ? currency : fallback;
}

export function parseFinanceDatabaseEquities(text: string, market: MarketConfig): ProviderInstrument[] {
  const instruments: ProviderInstrument[] = [];
  for (const row of parseCsv(text)) {
    const rawSymbol = row.symbol?.trim();
    const name = row.name?.trim();
    if (!rawSymbol || !name || name.toLowerCase() === "nan") continue;

    const symbol = rawSymbol.endsWith(market.suffix) ? rawSymbol.slice(0, -market.suffix.length) : rawSymbol;
    instruments.push({
      symbol,
      name,
      exchange: market.exchange,
      country: market.country,
      assetType: "Stock" as const,
      currency: normalizeCurrency(row.currency || "", market.currency),
      isActive: row.delisted?.trim().toLowerCase() !== "true",
      providerSymbol: `${market.exchange}:${symbol}`,
    });
  }
  return instruments;
}

async function downloadMarket(market: MarketConfig) {
  const response = await fetch(`${BASE_URL}/${market.file}.csv`, {
    headers: { "User-Agent": "MorningLedger-Catalogue/1.0" },
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw new Error(`Global catalogue download for ${market.file} failed with HTTP ${response.status}.`);
  return parseFinanceDatabaseEquities(await response.text(), market);
}

export class FinanceDatabaseProvider implements InstrumentProvider {
  readonly name = "finance-database-free-global-exchanges";
  readonly minimumExpectedRecords = 5_000;

  async fetchCatalogue(): Promise<ProviderInstrument[]> {
    const marketRecords = await Promise.all(MARKETS.map(downloadMarket));
    return uniqueInstruments(marketRecords.flat());
  }
}

import { ProviderInstrument } from "../lib/instruments";
import { InstrumentProvider } from "./instrument-provider";

const NASDAQ_URL = "https://www.nasdaqtrader.com/dynamic/SymDir/nasdaqlisted.txt";
const OTHER_URL = "https://www.nasdaqtrader.com/dynamic/SymDir/otherlisted.txt";

const EXCHANGES: Record<string, string> = {
  A: "NYSE American",
  N: "NYSE",
  P: "NYSE Arca",
  Z: "Cboe BZX",
  V: "IEX",
};

function rows(text: string) {
  return text.replace(/\r/g, "").split("\n").slice(1).map(line => line.split("|")).filter(fields => fields.length > 2 && fields[0] !== "File Creation Time");
}

export function parseNasdaqListed(text: string): ProviderInstrument[] {
  return rows(text).filter(fields => fields[3] === "N").map(fields => ({
    symbol: fields[0].trim(),
    name: fields[1].trim(),
    exchange: "NASDAQ",
    country: "US",
    assetType: fields[6] === "Y" ? "ETF" : "Stock",
    currency: "USD",
    isActive: true,
    providerSymbol: `NASDAQ:${fields[0].trim()}`,
  }));
}

export function parseOtherListed(text: string): ProviderInstrument[] {
  return rows(text).filter(fields => fields[6] === "N" && Boolean(EXCHANGES[fields[2]])).map(fields => ({
    symbol: fields[0].trim(),
    name: fields[1].trim(),
    exchange: EXCHANGES[fields[2]],
    country: "US",
    assetType: fields[4] === "Y" ? "ETF" : "Stock",
    currency: "USD",
    isActive: true,
    providerSymbol: `${EXCHANGES[fields[2]].replaceAll(" ", "").toUpperCase()}:${fields[0].trim()}`,
  }));
}

async function download(url: string) {
  const response = await fetch(url, { headers: { "User-Agent": "MorningLedger-Catalogue/1.0" }, signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Nasdaq Trader download failed with HTTP ${response.status}.`);
  return response.text();
}

export class NasdaqTraderProvider implements InstrumentProvider {
  readonly name = "nasdaq-trader-free-symbol-directory";
  readonly minimumExpectedRecords = 5_000;

  async fetchCatalogue(): Promise<ProviderInstrument[]> {
    const [nasdaq, other] = await Promise.all([download(NASDAQ_URL), download(OTHER_URL)]);
    return [...parseNasdaqListed(nasdaq), ...parseOtherListed(other)];
  }
}

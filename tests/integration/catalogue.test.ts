import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CatalogueStore } from "../../db/catalogue";
import { ProviderInstrument } from "../../lib/instruments";
import { InstrumentProvider } from "../../providers/instrument-provider";
import { refreshCatalogue } from "../../services/catalogue-refresh";
import { parseNasdaqListed, parseOtherListed } from "../../providers/nasdaq-trader-provider";
import { parseFinanceDatabaseEquities } from "../../providers/finance-database-provider";
import type { MarketConfig } from "../../providers/finance-database-provider";

const initial: ProviderInstrument[] = [
  { symbol: "NVDA", name: "NVIDIA Corporation", exchange: "NASDAQ", country: "US", assetType: "Stock", currency: "USD", isActive: true, providerSymbol: "NASDAQ:NVDA" },
  { symbol: "SHOP", name: "Shopify Inc.", exchange: "TSX", country: "CA", assetType: "Stock", currency: "CAD", isActive: true, providerSymbol: "TSX:SHOP" },
  { symbol: "SHOP", name: "Shopify Inc.", exchange: "NASDAQ", country: "US", assetType: "Stock", currency: "USD", isActive: true, providerSymbol: "NASDAQ:SHOP" },
  { symbol: "VFV", name: "Vanguard S&P 500 Index ETF", exchange: "TSX", country: "CA", assetType: "ETF", currency: "CAD", isActive: true, providerSymbol: "TSX:VFV" },
];

class FixtureProvider implements InstrumentProvider {
  readonly name = "fixture";
  readonly minimumExpectedRecords = 1;
  constructor(private readonly records: ProviderInstrument[] | Error) {}
  async fetchCatalogue() { if (this.records instanceof Error) throw this.records; return structuredClone(this.records); }
}

describe("instrument catalogue integration", () => {
  let store: CatalogueStore;
  beforeEach(async () => { store = new CatalogueStore(":memory:"); await refreshCatalogue(store, new FixtureProvider(initial)); });
  afterEach(() => store.close());

  it("searches by ticker, company name, ETF name, and partial text", () => {
    expect(store.search("nvda").map(item => item.symbol)).toEqual(["NVDA"]);
    expect(store.search("nvidia")[0].name).toBe("NVIDIA Corporation");
    expect(store.search("guard s&p")[0].symbol).toBe("VFV");
    expect(store.search("nasd").map(item => item.exchange)).toEqual(["NASDAQ", "NASDAQ"]);
  });

  it("distinguishes the same ticker on different exchanges", () => {
    const matches = store.search("shop");
    expect(matches.map(item => `${item.symbol}:${item.exchange}`)).toEqual(["SHOP:NASDAQ", "SHOP:TSX"]);
    expect(new Set(matches.map(item => item.instrumentId)).size).toBe(2);
  });

  it("marks missing instruments inactive and excludes them from search", async () => {
    await refreshCatalogue(store, new FixtureProvider(initial.filter(item => item.symbol !== "NVDA")));
    expect(store.all().find(item => item.symbol === "NVDA")?.isActive).toBe(false);
    expect(store.search("nvda")).toEqual([]);
  });

  it("preserves stable IDs while updating metadata", async () => {
    const before = store.all().find(item => item.providerSymbol === "NASDAQ:NVDA")!;
    const changed = initial.map(item => item.providerSymbol === "NASDAQ:NVDA" ? { ...item, name: "NVIDIA Corp." } : item);
    await refreshCatalogue(store, new FixtureProvider(changed));
    const after = store.all().find(item => item.providerSymbol === "NASDAQ:NVDA")!;
    expect(after.instrumentId).toBe(before.instrumentId);
    expect(after.name).toBe("NVIDIA Corp.");
  });

  it("keeps the previous valid catalogue when refresh validation fails", async () => {
    const before = store.all();
    await expect(refreshCatalogue(store, new FixtureProvider([{ ...initial[0], providerSymbol: "" }]))).rejects.toThrow();
    expect(store.all()).toEqual(before);
    expect(store.getStatus().status).toBe("failed");
  });

  it("returns local search results quickly", () => {
    const started = performance.now();
    for (let index = 0; index < 100; index++) store.search("shop");
    expect(performance.now() - started).toBeLessThan(100);
  });

  it("parses the free Nasdaq Trader bulk files and excludes test issues", () => {
    const nasdaq = "Symbol|Security Name|Market Category|Test Issue|Financial Status|Round Lot Size|ETF|NextShares\nNVDA|NVIDIA Corporation|Q|N|N|100|N|N\nTEST|Test Issue|Q|Y|N|100|N|N\nFile Creation Time: 01012026|||||||";
    const other = "ACT Symbol|Security Name|Exchange|CQS Symbol|ETF|Round Lot Size|Test Issue|NASDAQ Symbol\nSPY|SPDR S&P 500 ETF Trust|P|SPY|Y|100|N|SPY\n";
    expect(parseNasdaqListed(nasdaq)).toMatchObject([{ symbol: "NVDA", exchange: "NASDAQ", assetType: "Stock" }]);
    expect(parseOtherListed(other)).toMatchObject([{ symbol: "SPY", exchange: "NYSE Arca", assetType: "ETF" }]);
  });

  it("maps free exchange files for Canada, the UK, Australia, and India", () => {
    const csv = 'symbol,name,currency,delisted\n"SHOP.TO","Shopify, Inc.",CAD,False\n';
    expect(parseFinanceDatabaseEquities(csv, { file: "TOR", exchange: "TSX", country: "CA", currency: "CAD", suffix: ".TO" })).toMatchObject([
      { symbol: "SHOP", name: "Shopify, Inc.", exchange: "TSX", country: "CA", providerSymbol: "TSX:SHOP", isActive: true },
    ]);

    const mappings: Array<[MarketConfig, string, string]> = [
      [{ file: "LSE", exchange: "LSE", country: "GB", currency: "GBP", suffix: ".L" } as const, "HSBA.L", "LSE:HSBA"],
      [{ file: "ASX", exchange: "ASX", country: "AU", currency: "AUD", suffix: ".AX" } as const, "BHP.AX", "ASX:BHP"],
      [{ file: "NSE", exchange: "NSE", country: "IN", currency: "INR", suffix: ".NS" } as const, "RELIANCE.NS", "NSE:RELIANCE"],
    ];
    for (const [market, symbol, providerSymbol] of mappings) {
      expect(parseFinanceDatabaseEquities(`symbol,name,currency,delisted\n${symbol},Example,,False\n`, market)[0]).toMatchObject({ exchange: market.exchange, country: market.country, providerSymbol });
    }
  });
});

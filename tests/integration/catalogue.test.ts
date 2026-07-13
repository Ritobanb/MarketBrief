import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { CATALOGUE_REFRESH_LOCK_ID, CatalogueStore, RefreshInProgressError } from "../../db/catalogue";
import { createPrismaClient } from "../../db/prisma";
import type { ProviderInstrument } from "../../lib/instruments";
import { parseFinanceDatabaseEquities } from "../../providers/finance-database-provider";
import type { MarketConfig } from "../../providers/finance-database-provider";
import type { InstrumentProvider } from "../../providers/instrument-provider";
import { parseNasdaqListed, parseOtherListed } from "../../providers/nasdaq-trader-provider";
import { importSqliteCatalogue } from "../../scripts/import-sqlite-catalogue";
import { refreshCatalogue } from "../../services/catalogue-refresh";
import { BriefCycleRunner } from "../../services/briefing/cycle-runner";
import { MockBriefGenerationAdapter, MockMarketDataAdapter } from "../../services/briefing/mock-adapters";
import { saveSubscription } from "../../services/subscriptions";
import { createHomepageSubscription } from "../../lib/subscriptions";

const initial: ProviderInstrument[] = [
  { symbol: "NVDA", name: "NVIDIA Corporation", exchange: "NASDAQ", country: "US", assetType: "Stock", currency: "USD", isActive: true, providerSymbol: "NASDAQ:NVDA" },
  { symbol: "SHOP", name: "Shopify Inc.", exchange: "TSX", country: "CA", assetType: "Stock", currency: "CAD", isActive: true, providerSymbol: "TSX:SHOP" },
  { symbol: "SHOP", name: "Shopify Inc.", exchange: "NASDAQ", country: "US", assetType: "Stock", currency: "USD", isActive: true, providerSymbol: "NASDAQ:SHOP" },
  { symbol: "VFV", name: "Vanguard S&P 500 Index ETF", exchange: "TSX", country: "CA", assetType: "ETF", currency: "CAD", isActive: true, providerSymbol: "TSX:VFV" },
  { symbol: "OLD", name: "Inactive Company", exchange: "TSX", country: "CA", assetType: "Stock", currency: "CAD", isActive: false, providerSymbol: "TSX:OLD" },
];

class FixtureProvider implements InstrumentProvider {
  readonly name = "fixture";
  readonly minimumExpectedRecords = 1;
  constructor(private readonly records: ProviderInstrument[] | Error) {}
  async fetchCatalogue() {
    if (this.records instanceof Error) throw this.records;
    return structuredClone(this.records);
  }
}

const prisma = createPrismaClient();
const store = new CatalogueStore(prisma);

describe("PostgreSQL instrument catalogue", () => {
  beforeEach(async () => {
    await prisma.recipientDelivery.deleteMany();
    await prisma.generatedBrief.deleteMany();
    await prisma.marketSnapshot.deleteMany();
    await prisma.briefCycle.deleteMany();
    await prisma.profileWatchlist.deleteMany();
    await prisma.profileNotification.deleteMany();
    await prisma.communicationProfile.deleteMany();
    await prisma.instrument.deleteMany();
    await prisma.catalogueRefreshStatus.deleteMany();
    await refreshCatalogue(store, new FixtureProvider(initial));
  });
  afterAll(async () => store.close());

  it("ranks exact tickers before ticker prefixes and name matches", async () => {
    await refreshCatalogue(store, new FixtureProvider([
      ...initial,
      { symbol: "NVDAX", name: "Ticker Prefix", exchange: "NASDAQ", country: "US", assetType: "Fund", currency: "USD", isActive: true, providerSymbol: "NASDAQ:NVDAX" },
      { symbol: "OTHER", name: "NVDA Name Match", exchange: "NYSE", country: "US", assetType: "Stock", currency: "USD", isActive: true, providerSymbol: "NYSE:OTHER" },
    ]));
    expect((await store.search("nvda")).map(item => item.symbol).slice(0, 3)).toEqual(["NVDA", "NVDAX", "OTHER"]);
  });

  it("saves and safely updates subscription profiles", async () => {
    const nvda = await prisma.instrument.findUniqueOrThrow({ where: { providerSymbol: "NASDAQ:NVDA" } });
    await saveSubscription({
      source: "personalized", email: "reader@example.com", name: "Reader", markets: ["Canadian markets", "US markets"],
      briefingStyle: "Balanced", experienceLevel: "Beginner-friendly", contentToggles: ["General market overview"],
      timeZone: "America/Toronto", watchlistInstrumentIds: [nvda.stableInstrumentId], notifications: { daily: true, weekly: true },
    });
    await saveSubscription(createHomepageSubscription("READER@example.com"));
    const profile = await prisma.communicationProfile.findUniqueOrThrow({
      where: { email: "reader@example.com" }, include: { watchlist: true, notifications: true },
    });
    expect(profile.name).toBe("Reader");
    expect(profile.watchlist).toHaveLength(1);
    expect(profile.notifications.find(item => item.cycleType === "weekly")?.enabled).toBe(true);
    expect(profile.notifications.find(item => item.cycleType === "daily")?.enabled).toBe(true);
  });

  it("searches partial tickers, company names, exchanges, and asset types", async () => {
    expect((await store.search("nvd"))[0].symbol).toBe("NVDA");
    expect((await store.search("nvidia"))[0].name).toBe("NVIDIA Corporation");
    expect((await store.search("nasd")).map(item => item.exchange)).toEqual(["NASDAQ", "NASDAQ"]);
    expect((await store.search("etf"))[0].symbol).toBe("VFV");
  });

  it("keeps identical tickers on different exchanges separate", async () => {
    const matches = await store.search("shop");
    expect(matches.map(item => `${item.symbol}:${item.exchange}`)).toEqual(["SHOP:NASDAQ", "SHOP:TSX"]);
    expect(new Set(matches.map(item => item.instrumentId)).size).toBe(2);
  });

  it("excludes inactive instruments", async () => {
    expect(await store.search("inactive")).toEqual([]);
    expect((await store.all()).find(item => item.symbol === "OLD")?.isActive).toBe(false);
  });

  it("preserves stable IDs and marks missing instruments inactive", async () => {
    const before = (await store.all()).find(item => item.providerSymbol === "NASDAQ:NVDA")!;
    const changed = initial.filter(item => item.providerSymbol !== "TSX:VFV").map(item => item.providerSymbol === "NASDAQ:NVDA" ? { ...item, name: "NVIDIA Corp." } : item);
    await refreshCatalogue(store, new FixtureProvider(changed));
    const after = (await store.all()).find(item => item.providerSymbol === "NASDAQ:NVDA")!;
    expect(after.instrumentId).toBe(before.instrumentId);
    expect(after.name).toBe("NVIDIA Corp.");
    expect((await store.all()).find(item => item.providerSymbol === "TSX:VFV")?.isActive).toBe(false);
  });

  it("keeps the previous catalogue when validation fails", async () => {
    const before = await store.all();
    await expect(refreshCatalogue(store, new FixtureProvider([{ ...initial[0], providerSymbol: "" }]))).rejects.toThrow();
    expect(await store.all()).toEqual(before);
    expect((await store.getStatus()).status).toBe("failed");
  });

  it("rolls back database failures without publishing partial data", async () => {
    await prisma.$executeRawUnsafe(`CREATE FUNCTION reject_catalogue_update() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'forced failure'; END; $$ LANGUAGE plpgsql`);
    await prisma.$executeRawUnsafe(`CREATE TRIGGER reject_catalogue_update BEFORE INSERT OR UPDATE ON instruments FOR EACH ROW EXECUTE FUNCTION reject_catalogue_update()`);
    const before = await store.all();
    try {
      await expect(refreshCatalogue(store, new FixtureProvider([...initial, { ...initial[0], symbol: "NEW", providerSymbol: "NASDAQ:NEW" }]))).rejects.toThrow("forced failure");
      expect(await store.all()).toEqual(before);
    } finally {
      await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS reject_catalogue_update ON instruments`);
      await prisma.$executeRawUnsafe(`DROP FUNCTION IF EXISTS reject_catalogue_update()`);
    }
  });

  it("rejects a concurrent refresh", async () => {
    const [database] = await prisma.$queryRaw<Array<{ version: string }>>`SELECT version()`;
    // The local WASM test server serializes connections; CI's PostgreSQL service exercises contention.
    if (database.version.includes("wasm32")) return;

    const lockClient = createPrismaClient();
    let signalLocked!: () => void;
    let releaseLock!: () => void;
    const locked = new Promise<void>(resolve => { signalLocked = resolve; });
    const release = new Promise<void>(resolve => { releaseLock = resolve; });
    const holding = lockClient.$transaction(async transaction => {
      await transaction.$queryRaw`SELECT pg_advisory_xact_lock(${CATALOGUE_REFRESH_LOCK_ID})`;
      signalLocked();
      await release;
    }, { timeout: 10_000 });
    try {
      await locked;
      await expect(refreshCatalogue(store, new FixtureProvider(initial))).rejects.toBeInstanceOf(RefreshInProgressError);
    } finally {
      releaseLock();
      await holding;
      await lockClient.$disconnect();
    }
  });

  it("returns no more than 20 results", async () => {
    const many = Array.from({ length: 25 }, (_, index): ProviderInstrument => ({
      symbol: `TEST${index}`, name: `Test Company ${index}`, exchange: "TSX", country: "CA",
      assetType: "Stock", currency: "CAD", isActive: true, providerSymbol: `TSX:TEST${index}`,
    }));
    await refreshCatalogue(store, new FixtureProvider(many));
    expect(await store.search("test", 100)).toHaveLength(20);
  });

  it("imports SQLite rows into PostgreSQL while preserving stable IDs", async () => {
    await prisma.instrument.deleteMany();
    const directory = await mkdtemp(path.join(tmpdir(), "marketbrief-sqlite-"));
    const sqlitePath = path.join(directory, "instruments.db");
    const sqlite = new DatabaseSync(sqlitePath);
    sqlite.exec(`CREATE TABLE instruments (
      instrument_id TEXT PRIMARY KEY, symbol TEXT, name TEXT, exchange TEXT, country TEXT,
      asset_type TEXT, currency TEXT, is_active INTEGER, provider_symbol TEXT UNIQUE, last_updated_at TEXT
    )`);
    sqlite.prepare("INSERT INTO instruments VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
      "inst_existing_123", "NVDA", "NVIDIA Corporation", "NASDAQ", "US", "Stock", "USD", 1, "NASDAQ:NVDA", new Date().toISOString(),
    );
    sqlite.close();
    try {
      const result = await importSqliteCatalogue(sqlitePath, prisma);
      expect(result).toMatchObject({ sourceCount: 1, matchedCount: 1, destinationCount: 1 });
      expect((await store.search("nvda"))[0].instrumentId).toBe("inst_existing_123");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("parses the free provider files", () => {
    const nasdaq = "Symbol|Security Name|Market Category|Test Issue|Financial Status|Round Lot Size|ETF|NextShares\nNVDA|NVIDIA Corporation|Q|N|N|100|N|N\nTEST|Test Issue|Q|Y|N|100|N|N";
    const other = "ACT Symbol|Security Name|Exchange|CQS Symbol|ETF|Round Lot Size|Test Issue|NASDAQ Symbol\nSPY|SPDR S&P 500 ETF Trust|P|SPY|Y|100|N|SPY\n";
    expect(parseNasdaqListed(nasdaq)).toMatchObject([{ symbol: "NVDA", exchange: "NASDAQ", assetType: "Stock" }]);
    expect(parseOtherListed(other)).toMatchObject([{ symbol: "SPY", exchange: "NYSE Arca", assetType: "ETF" }]);

    const mappings: Array<[MarketConfig, string, string]> = [
      [{ file: "TOR", exchange: "TSX", country: "CA", currency: "CAD", suffix: ".TO" }, "SHOP.TO", "TSX:SHOP"],
      [{ file: "LSE", exchange: "LSE", country: "GB", currency: "GBP", suffix: ".L" }, "HSBA.L", "LSE:HSBA"],
      [{ file: "ASX", exchange: "ASX", country: "AU", currency: "AUD", suffix: ".AX" }, "BHP.AX", "ASX:BHP"],
      [{ file: "NSE", exchange: "NSE", country: "IN", currency: "INR", suffix: ".NS" }, "RELIANCE.NS", "NSE:RELIANCE"],
    ];
    for (const [market, symbol, providerSymbol] of mappings) {
      expect(parseFinanceDatabaseEquities(`symbol,name,currency,delisted\n${symbol},Example,,False\n`, market)[0]).toMatchObject({ exchange: market.exchange, country: market.country, providerSymbol });
    }
  });

  it("uses one generation call to create personalized deliveries for a cycle", async () => {
    const nvda = await prisma.instrument.findUniqueOrThrow({ where: { providerSymbol: "NASDAQ:NVDA" } });
    for (const [email, name] of [["one@example.com", "One"], ["two@example.com", "Two"]]) {
      await prisma.communicationProfile.create({
        data: {
          email, name, markets: ["US markets"], briefingStyle: "Balanced", experienceLevel: "Beginner-friendly",
          contentToggles: ["General market overview"],
          notifications: { create: { cycleType: "daily", enabled: true } },
          watchlist: { create: { instrumentId: nvda.id } },
        },
      });
    }
    const generator = new MockBriefGenerationAdapter();
    const runner = new BriefCycleRunner(prisma, new MockMarketDataAdapter(), generator);
    const scheduledFor = new Date("2026-07-13T11:00:00.000Z");
    const cycle = await runner.run("daily", scheduledFor);
    expect(cycle.status).toBe("complete");
    expect(cycle.llmCallCount).toBe(1);
    expect(generator.calls).toBe(1);
    const deliveries = await prisma.recipientDelivery.findMany({ orderBy: { subject: "asc" } });
    expect(deliveries).toHaveLength(2);
    expect(deliveries[0].body).toContain("NVDA | Steady");
    expect(deliveries[0].htmlBody).toContain("max-width:680px");
    expect(deliveries[0].htmlBody).toContain("Market information only. Not investment advice.");

    await runner.run("daily", scheduledFor);
    expect(generator.calls).toBe(1);
    expect(await prisma.recipientDelivery.count()).toBe(2);
  });

  it("does not retry an expensive generation call after it fails", async () => {
    await prisma.communicationProfile.create({
      data: {
        email: "failure@example.com", markets: ["US markets"], briefingStyle: "Balanced",
        experienceLevel: "Beginner-friendly", contentToggles: [],
        notifications: { create: { cycleType: "daily", enabled: true } },
      },
    });
    let calls = 0;
    const failingGenerator = {
      model: "failing-test-model", promptVersion: "test-v1",
      async generate() { calls += 1; throw new Error("generation failed"); },
    };
    const runner = new BriefCycleRunner(prisma, new MockMarketDataAdapter(), failingGenerator);
    const scheduledFor = new Date("2026-07-14T11:00:00.000Z");
    await expect(runner.run("daily", scheduledFor)).rejects.toThrow("generation failed");
    await expect(runner.run("daily", scheduledFor)).rejects.toThrow(/already running|single generation call/i);
    expect(calls).toBe(1);
    expect((await prisma.briefCycle.findFirstOrThrow({ where: { scheduledFor } })).llmCallCount).toBe(1);
  });
});

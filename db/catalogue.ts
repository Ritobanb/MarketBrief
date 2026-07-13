import { randomUUID } from "node:crypto";
import type { PrismaClient } from "../generated/prisma/client";
import { Prisma } from "../generated/prisma/client";
import type { CatalogueRefreshStatus, Instrument, ProviderInstrument } from "../lib/instruments";
import { getPrisma } from "./prisma";

export const CATALOGUE_REFRESH_LOCK_ID = 4_621_337_701;
const INSERT_BATCH_SIZE = 500;

type InstrumentRecord = {
  stableInstrumentId: string;
  symbol: string;
  name: string;
  exchange: string;
  country: string;
  assetType: string;
  currency: string;
  isActive: boolean;
  providerSymbol: string;
  updatedAt: Date;
};

type RefreshCounts = {
  added: bigint;
  updated: bigint;
  deactivated: bigint;
};

export class RefreshInProgressError extends Error {
  constructor() {
    super("An instrument catalogue refresh is already running.");
    this.name = "RefreshInProgressError";
  }
}

export function normalizeSearchText(value: string) {
  return value.trim().toLocaleLowerCase("en-US");
}

function toInstrument(record: InstrumentRecord): Instrument {
  return {
    instrumentId: record.stableInstrumentId,
    symbol: record.symbol,
    name: record.name,
    exchange: record.exchange,
    country: record.country,
    assetType: record.assetType as Instrument["assetType"],
    currency: record.currency,
    isActive: record.isActive,
    providerSymbol: record.providerSymbol,
    lastUpdatedAt: record.updatedAt.toISOString(),
  };
}

function configuredInstrumentTable() {
  const schema = process.env.DATABASE_URL
    ? new URL(process.env.DATABASE_URL).searchParams.get("schema") || "public"
    : "public";
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(schema)) throw new Error("DATABASE_URL contains an invalid PostgreSQL schema name.");
  return Prisma.raw(`"${schema}"."instruments"`);
}

export class CatalogueStore {
  private readonly instrumentTable = configuredInstrumentTable();

  constructor(readonly prisma: PrismaClient = getPrisma()) {}

  async close() {
    await this.prisma.$disconnect();
  }

  async count() {
    return this.prisma.instrument.count();
  }

  async all(): Promise<Instrument[]> {
    const records = await this.prisma.instrument.findMany({ orderBy: { providerSymbol: "asc" } });
    return records.map(toInstrument);
  }

  async search(query: string, limit = 15): Promise<Instrument[]> {
    const clean = normalizeSearchText(query);
    if (!clean) return [];
    const contains = `%${clean}%`;
    const starts = `${clean}%`;
    const safeLimit = Math.min(20, Math.max(10, limit));
    const records = await this.prisma.$queryRaw<InstrumentRecord[]>(Prisma.sql`
      SELECT
        "stableInstrumentId", "symbol", "name", "exchange", "country",
        "assetType", "currency", "isActive", "providerSymbol", "updatedAt"
      FROM ${this.instrumentTable}
      WHERE "isActive" = true AND (
        "normalizedSymbol" LIKE ${contains} OR
        "normalizedName" LIKE ${contains} OR
        lower("exchange") LIKE ${contains} OR
        lower("assetType") LIKE ${contains} OR
        lower("providerSymbol") LIKE ${contains}
      )
      ORDER BY
        CASE
          WHEN "normalizedSymbol" = ${clean} THEN 0
          WHEN "normalizedSymbol" LIKE ${starts} THEN 1
          WHEN "normalizedName" LIKE ${contains} THEN 2
          ELSE 3
        END,
        "symbol", "exchange"
      LIMIT ${safeLimit}
    `);
    return records.map(toInstrument);
  }

  async getStatus(): Promise<CatalogueRefreshStatus> {
    const status = await this.prisma.catalogueRefreshStatus.findUnique({ where: { id: 1 } });
    if (!status) {
      return { status: "never", lastAttemptedAt: null, lastSuccessfulRefreshAt: null, lastError: null, activeCount: 0, inactiveCount: 0 };
    }
    return {
      status: status.status as CatalogueRefreshStatus["status"],
      lastAttemptedAt: status.lastAttemptedAt?.toISOString() || null,
      lastSuccessfulRefreshAt: status.lastSuccessfulRefreshAt?.toISOString() || null,
      lastError: status.lastError,
      activeCount: status.activeCount,
      inactiveCount: status.inactiveCount,
    };
  }

  async recordFailure(message: string, attemptedAt = new Date()) {
    await this.prisma.catalogueRefreshStatus.upsert({
      where: { id: 1 },
      create: { id: 1, status: "failed", lastAttemptedAt: attemptedAt, lastError: message },
      update: { status: "failed", lastAttemptedAt: attemptedAt, lastError: message },
    });
  }

  async replaceFromProvider(records: ProviderInstrument[], refreshedAt = new Date()) {
    await this.prisma.$transaction(async transaction => {
      const [lock] = await transaction.$queryRaw<Array<{ acquired: boolean }>>`
        SELECT pg_try_advisory_xact_lock(${CATALOGUE_REFRESH_LOCK_ID}) AS acquired
      `;
      if (!lock?.acquired) throw new RefreshInProgressError();

      await transaction.$executeRaw`
        CREATE TEMPORARY TABLE "instrument_refresh_stage" (
          "stableInstrumentId" TEXT NOT NULL,
          "symbol" TEXT NOT NULL,
          "normalizedSymbol" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "normalizedName" TEXT NOT NULL,
          "exchange" TEXT NOT NULL,
          "country" TEXT NOT NULL,
          "assetType" TEXT NOT NULL,
          "currency" TEXT NOT NULL,
          "providerSymbol" TEXT PRIMARY KEY,
          "isActive" BOOLEAN NOT NULL,
          "lastProviderSyncAt" TIMESTAMPTZ NOT NULL
        ) ON COMMIT DROP
      `;

      for (let index = 0; index < records.length; index += INSERT_BATCH_SIZE) {
        const values = records.slice(index, index + INSERT_BATCH_SIZE).map(record => Prisma.sql`(
          ${`inst_${randomUUID()}`}, ${record.symbol}, ${normalizeSearchText(record.symbol)},
          ${record.name}, ${normalizeSearchText(record.name)}, ${record.exchange}, ${record.country},
          ${record.assetType}, ${record.currency}, ${record.providerSymbol}, ${record.isActive}, ${refreshedAt}
        )`);
        await transaction.$executeRaw(Prisma.sql`
          INSERT INTO "instrument_refresh_stage" (
            "stableInstrumentId", "symbol", "normalizedSymbol", "name", "normalizedName",
            "exchange", "country", "assetType", "currency", "providerSymbol", "isActive", "lastProviderSyncAt"
          ) VALUES ${Prisma.join(values)}
        `);
      }

      const [counts] = await transaction.$queryRaw<RefreshCounts[]>`
        SELECT
          count(*) FILTER (WHERE target."id" IS NULL) AS added,
          count(*) FILTER (WHERE target."id" IS NOT NULL AND (
            target."symbol", target."name", target."exchange", target."country",
            target."assetType", target."currency", target."isActive"
          ) IS DISTINCT FROM (
            stage."symbol", stage."name", stage."exchange", stage."country",
            stage."assetType", stage."currency", stage."isActive"
          )) AS updated,
          (SELECT count(*) FROM ${this.instrumentTable} current
            WHERE current."isActive" = true AND NOT EXISTS (
              SELECT 1 FROM "instrument_refresh_stage" incoming
              WHERE incoming."providerSymbol" = current."providerSymbol"
            )) AS deactivated
        FROM "instrument_refresh_stage" stage
        LEFT JOIN ${this.instrumentTable} target ON target."providerSymbol" = stage."providerSymbol"
      `;

      await transaction.$executeRaw`
        INSERT INTO ${this.instrumentTable} (
          "stableInstrumentId", "symbol", "normalizedSymbol", "name", "normalizedName",
          "exchange", "country", "assetType", "currency", "providerSymbol", "isActive", "lastProviderSyncAt"
        )
        SELECT
          "stableInstrumentId", "symbol", "normalizedSymbol", "name", "normalizedName",
          "exchange", "country", "assetType", "currency", "providerSymbol", "isActive", "lastProviderSyncAt"
        FROM "instrument_refresh_stage"
        ON CONFLICT ("providerSymbol") DO UPDATE SET
          "symbol" = EXCLUDED."symbol",
          "normalizedSymbol" = EXCLUDED."normalizedSymbol",
          "name" = EXCLUDED."name",
          "normalizedName" = EXCLUDED."normalizedName",
          "exchange" = EXCLUDED."exchange",
          "country" = EXCLUDED."country",
          "assetType" = EXCLUDED."assetType",
          "currency" = EXCLUDED."currency",
          "isActive" = EXCLUDED."isActive",
          "updatedAt" = CURRENT_TIMESTAMP,
          "lastProviderSyncAt" = EXCLUDED."lastProviderSyncAt"
        WHERE (
          "instruments"."symbol", "instruments"."normalizedSymbol", "instruments"."name", "instruments"."normalizedName",
          "instruments"."exchange", "instruments"."country", "instruments"."assetType", "instruments"."currency", "instruments"."isActive"
        ) IS DISTINCT FROM (
          EXCLUDED."symbol", EXCLUDED."normalizedSymbol", EXCLUDED."name", EXCLUDED."normalizedName",
          EXCLUDED."exchange", EXCLUDED."country", EXCLUDED."assetType", EXCLUDED."currency", EXCLUDED."isActive"
        )
      `;

      await transaction.$executeRaw`
        UPDATE ${this.instrumentTable} current
        SET "isActive" = false, "updatedAt" = CURRENT_TIMESTAMP, "lastProviderSyncAt" = ${refreshedAt}
        WHERE current."isActive" = true AND NOT EXISTS (
          SELECT 1 FROM "instrument_refresh_stage" incoming
          WHERE incoming."providerSymbol" = current."providerSymbol"
        )
      `;

      const [activeCount, inactiveCount] = await Promise.all([
        transaction.instrument.count({ where: { isActive: true } }),
        transaction.instrument.count({ where: { isActive: false } }),
      ]);
      await transaction.catalogueRefreshStatus.upsert({
        where: { id: 1 },
        create: {
          id: 1, status: "success", lastAttemptedAt: refreshedAt, lastSuccessfulRefreshAt: refreshedAt,
          activeCount, inactiveCount, recordsReceived: records.length, recordsAdded: Number(counts.added),
          recordsUpdated: Number(counts.updated), recordsDeactivated: Number(counts.deactivated),
        },
        update: {
          status: "success", lastAttemptedAt: refreshedAt, lastSuccessfulRefreshAt: refreshedAt, lastError: null,
          activeCount, inactiveCount, recordsReceived: records.length, recordsAdded: Number(counts.added),
          recordsUpdated: Number(counts.updated), recordsDeactivated: Number(counts.deactivated),
        },
      });
    }, { maxWait: 10_000, timeout: 120_000 });
  }
}

let store: CatalogueStore | undefined;

export function getCatalogueStore() {
  store ??= new CatalogueStore();
  return store;
}

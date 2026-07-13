import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { DatabaseSync } from "node:sqlite";
import type { PrismaClient } from "../generated/prisma/client";
import { Prisma } from "../generated/prisma/client";
import { normalizeSearchText } from "../db/catalogue";
import { createPrismaClient } from "../db/prisma";

const BATCH_SIZE = 500;

type LegacyInstrument = {
  instrument_id: string;
  symbol: string;
  name: string;
  exchange: string;
  country: string;
  asset_type: string;
  currency: string;
  is_active: number;
  provider_symbol: string;
  last_updated_at: string;
};

type LegacyStatus = {
  status: string;
  last_attempted_at: string | null;
  last_successful_refresh_at: string | null;
  last_error: string | null;
};

export type ImportResult = {
  sourceCount: number;
  matchedCount: number;
  destinationCount: number;
};

function findDuplicates(values: string[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) (seen.has(value) ? duplicates : seen).add(value);
  return [...duplicates];
}

export async function importSqliteCatalogue(sourcePath: string, prisma: PrismaClient): Promise<ImportResult> {
  if (!existsSync(sourcePath)) throw new Error(`SQLite source file not found: ${sourcePath}`);

  const sqlite = new DatabaseSync(sourcePath, { readOnly: true });
  try {
    const source = sqlite.prepare("SELECT * FROM instruments ORDER BY provider_symbol").all() as LegacyInstrument[];
    let legacyStatus: LegacyStatus | undefined;
    try {
      legacyStatus = sqlite.prepare("SELECT status, last_attempted_at, last_successful_refresh_at, last_error FROM catalogue_refresh_status WHERE id = 1").get() as LegacyStatus | undefined;
    } catch {
      // Early SQLite catalogues may not contain a refresh-status table.
    }
    const duplicateProviderSymbols = findDuplicates(source.map(row => row.provider_symbol));
    const duplicateStableIds = findDuplicates(source.map(row => row.instrument_id));
    if (duplicateProviderSymbols.length || duplicateStableIds.length) {
      throw new Error(`Duplicate SQLite records detected. Provider symbols: ${duplicateProviderSymbols.join(", ") || "none"}; stable IDs: ${duplicateStableIds.join(", ") || "none"}.`);
    }

    await prisma.$transaction(async transaction => {
      for (let index = 0; index < source.length; index += BATCH_SIZE) {
        const values = source.slice(index, index + BATCH_SIZE).map(row => {
          const syncedAt = new Date(row.last_updated_at);
          if (Number.isNaN(syncedAt.valueOf())) throw new Error(`Invalid SQLite timestamp for ${row.provider_symbol}.`);
          return Prisma.sql`(
            ${row.instrument_id}, ${row.symbol}, ${normalizeSearchText(row.symbol)},
            ${row.name}, ${normalizeSearchText(row.name)}, ${row.exchange}, ${row.country},
            ${row.asset_type}, ${row.currency}, ${row.provider_symbol}, ${row.is_active === 1},
            ${syncedAt}, ${syncedAt}, ${syncedAt}
          )`;
        });
        await transaction.$executeRaw(Prisma.sql`
          INSERT INTO "instruments" (
            "stableInstrumentId", "symbol", "normalizedSymbol", "name", "normalizedName",
            "exchange", "country", "assetType", "currency", "providerSymbol", "isActive",
            "createdAt", "updatedAt", "lastProviderSyncAt"
          ) VALUES ${Prisma.join(values)}
          ON CONFLICT ("providerSymbol") DO UPDATE SET
            "stableInstrumentId" = EXCLUDED."stableInstrumentId",
            "symbol" = EXCLUDED."symbol",
            "normalizedSymbol" = EXCLUDED."normalizedSymbol",
            "name" = EXCLUDED."name",
            "normalizedName" = EXCLUDED."normalizedName",
            "exchange" = EXCLUDED."exchange",
            "country" = EXCLUDED."country",
            "assetType" = EXCLUDED."assetType",
            "currency" = EXCLUDED."currency",
            "isActive" = EXCLUDED."isActive",
            "updatedAt" = EXCLUDED."updatedAt",
            "lastProviderSyncAt" = EXCLUDED."lastProviderSyncAt"
        `);
      }

      const [activeCount, inactiveCount] = await Promise.all([
        transaction.instrument.count({ where: { isActive: true } }),
        transaction.instrument.count({ where: { isActive: false } }),
      ]);
      const attemptedAt = legacyStatus?.last_attempted_at ? new Date(legacyStatus.last_attempted_at) : null;
      const successfulAt = legacyStatus?.last_successful_refresh_at ? new Date(legacyStatus.last_successful_refresh_at) : null;
      await transaction.catalogueRefreshStatus.upsert({
        where: { id: 1 },
        create: {
          id: 1, status: legacyStatus?.status || "success", lastAttemptedAt: attemptedAt,
          lastSuccessfulRefreshAt: successfulAt, lastError: legacyStatus?.last_error || null,
          activeCount, inactiveCount, recordsReceived: source.length, recordsAdded: source.length,
        },
        update: {
          status: legacyStatus?.status || "success", lastAttemptedAt: attemptedAt,
          lastSuccessfulRefreshAt: successfulAt, lastError: legacyStatus?.last_error || null,
          activeCount, inactiveCount, recordsReceived: source.length,
        },
      });
    }, { maxWait: 10_000, timeout: 120_000 });

    let matchedCount = 0;
    for (let index = 0; index < source.length; index += BATCH_SIZE) {
      const batch = source.slice(index, index + BATCH_SIZE);
      const imported = await prisma.instrument.findMany({
        where: { providerSymbol: { in: batch.map(row => row.provider_symbol) } },
        select: { providerSymbol: true, stableInstrumentId: true },
      });
      const stableIds = new Map(imported.map(row => [row.providerSymbol, row.stableInstrumentId]));
      if (batch.some(row => stableIds.get(row.provider_symbol) !== row.instrument_id)) {
        throw new Error("Stable instrument ID verification failed after import.");
      }
      matchedCount += imported.length;
    }

    if (matchedCount !== source.length) throw new Error(`Import verification failed: ${source.length} source rows, ${matchedCount} matched PostgreSQL rows.`);
    return { sourceCount: source.length, matchedCount, destinationCount: await prisma.instrument.count() };
  } finally {
    sqlite.close();
  }
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) {
  const sourcePath = path.resolve(process.argv[2] || "data/instruments.db");
  const prisma = createPrismaClient();
  try {
    const result = await importSqliteCatalogue(sourcePath, prisma);
    console.log(`SQLite import verified: ${result.sourceCount} source, ${result.matchedCount} matched, ${result.destinationCount} total PostgreSQL instruments.`);
  } finally {
    await prisma.$disconnect();
  }
}

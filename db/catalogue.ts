import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { CatalogueRefreshStatus, Instrument, ProviderInstrument } from "../lib/instruments";
import { migrationStatements } from "./schema";

type InstrumentRow = {
  instrument_id: string; symbol: string; name: string; exchange: string; country: string;
  asset_type: string; currency: string; is_active: number; provider_symbol: string; last_updated_at: string;
};

function toInstrument(row: InstrumentRow): Instrument {
  return {
    instrumentId: row.instrument_id,
    symbol: row.symbol,
    name: row.name,
    exchange: row.exchange,
    country: row.country,
    assetType: row.asset_type as Instrument["assetType"],
    currency: row.currency,
    isActive: row.is_active === 1,
    providerSymbol: row.provider_symbol,
    lastUpdatedAt: row.last_updated_at,
  };
}

export class CatalogueStore {
  readonly db: DatabaseSync;

  constructor(databasePath: string) {
    if (databasePath !== ":memory:") mkdirSync(path.dirname(databasePath), { recursive: true });
    this.db = new DatabaseSync(databasePath);
    this.db.exec("PRAGMA journal_mode = WAL");
    this.db.exec("PRAGMA foreign_keys = ON");
    for (const statement of migrationStatements) this.db.prepare(statement).run();
  }

  close() { this.db.close(); }

  count() {
    return Number((this.db.prepare("SELECT COUNT(*) AS count FROM instruments").get() as { count: number }).count);
  }

  all(): Instrument[] {
    return (this.db.prepare("SELECT * FROM instruments ORDER BY provider_symbol").all() as InstrumentRow[]).map(toInstrument);
  }

  search(query: string, limit = 15): Instrument[] {
    const clean = query.trim().toLowerCase();
    if (!clean) return [];
    const starts = `${clean}%`;
    const contains = `%${clean}%`;
    const safeLimit = Math.min(20, Math.max(10, limit));
    const rows = this.db.prepare(`
      SELECT * FROM instruments
      WHERE is_active = 1 AND (
        lower(symbol) LIKE ? OR lower(name) LIKE ? OR lower(exchange) LIKE ? OR
        lower(asset_type) LIKE ? OR lower(provider_symbol) LIKE ?
      )
      ORDER BY
        CASE WHEN lower(symbol) = ? THEN 0 WHEN lower(symbol) LIKE ? THEN 1 WHEN lower(name) LIKE ? THEN 2 ELSE 3 END,
        symbol, exchange
      LIMIT ?
    `).all(contains, contains, contains, contains, contains, clean, starts, starts, safeLimit) as InstrumentRow[];
    return rows.map(toInstrument);
  }

  getStatus(): CatalogueRefreshStatus {
    const row = this.db.prepare("SELECT * FROM catalogue_refresh_status WHERE id = 1").get() as Record<string, string | null>;
    const counts = this.db.prepare("SELECT SUM(is_active) AS active, SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) AS inactive FROM instruments").get() as { active: number | null; inactive: number | null };
    return {
      status: (row.status || "never") as CatalogueRefreshStatus["status"],
      lastAttemptedAt: row.last_attempted_at,
      lastSuccessfulRefreshAt: row.last_successful_refresh_at,
      lastError: row.last_error,
      activeCount: Number(counts.active || 0),
      inactiveCount: Number(counts.inactive || 0),
    };
  }

  recordFailure(message: string, attemptedAt = new Date().toISOString()) {
    this.db.prepare("UPDATE catalogue_refresh_status SET status = 'failed', last_attempted_at = ?, last_error = ? WHERE id = 1").run(attemptedAt, message);
  }

  replaceFromProvider(records: ProviderInstrument[], refreshedAt = new Date().toISOString()) {
    const existing = this.db.prepare("SELECT instrument_id FROM instruments WHERE provider_symbol = ?");
    const insert = this.db.prepare(`INSERT INTO instruments
      (instrument_id, symbol, name, exchange, country, asset_type, currency, is_active, provider_symbol, last_updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const update = this.db.prepare(`UPDATE instruments SET symbol = ?, name = ?, exchange = ?, country = ?, asset_type = ?, currency = ?, is_active = ?, last_updated_at = ? WHERE provider_symbol = ?`);
    const seen = new Set(records.map(record => record.providerSymbol));
    this.db.exec("BEGIN IMMEDIATE");
    try {
      for (const record of records) {
        const row = existing.get(record.providerSymbol) as { instrument_id: string } | undefined;
        if (row) update.run(record.symbol, record.name, record.exchange, record.country, record.assetType, record.currency, record.isActive ? 1 : 0, refreshedAt, record.providerSymbol);
        else insert.run(`inst_${randomUUID()}`, record.symbol, record.name, record.exchange, record.country, record.assetType, record.currency, record.isActive ? 1 : 0, record.providerSymbol, refreshedAt);
      }
      const activeRows = this.db.prepare("SELECT provider_symbol FROM instruments WHERE is_active = 1").all() as Array<{ provider_symbol: string }>;
      const deactivate = this.db.prepare("UPDATE instruments SET is_active = 0, last_updated_at = ? WHERE provider_symbol = ?");
      for (const row of activeRows) if (!seen.has(row.provider_symbol)) deactivate.run(refreshedAt, row.provider_symbol);
      this.db.prepare("UPDATE catalogue_refresh_status SET status = 'success', last_attempted_at = ?, last_successful_refresh_at = ?, last_error = NULL WHERE id = 1").run(refreshedAt, refreshedAt);
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
}

let store: CatalogueStore | undefined;
export function getCatalogueStore() {
  store ??= new CatalogueStore(process.env.INSTRUMENT_DB_PATH || path.join(process.cwd(), "data", "instruments.db"));
  return store;
}

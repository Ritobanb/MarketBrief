CREATE TABLE IF NOT EXISTS instruments (
  instrument_id TEXT PRIMARY KEY,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  exchange TEXT NOT NULL,
  country TEXT NOT NULL,
  asset_type TEXT NOT NULL,
  currency TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  provider_symbol TEXT NOT NULL UNIQUE,
  last_updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS instruments_symbol_idx ON instruments(symbol);
CREATE INDEX IF NOT EXISTS instruments_name_idx ON instruments(name);
CREATE INDEX IF NOT EXISTS instruments_exchange_idx ON instruments(exchange);
CREATE INDEX IF NOT EXISTS instruments_active_idx ON instruments(is_active);

CREATE TABLE IF NOT EXISTS catalogue_refresh_status (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  status TEXT NOT NULL DEFAULT 'never',
  last_attempted_at TEXT,
  last_successful_refresh_at TEXT,
  last_error TEXT
);

INSERT OR IGNORE INTO catalogue_refresh_status (id, status) VALUES (1, 'never');

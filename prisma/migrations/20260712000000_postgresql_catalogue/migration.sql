CREATE EXTENSION IF NOT EXISTS pg_trgm;
SELECT pg_catalog.set_config('search_path', current_schema() || ', public', false);

CREATE TABLE "instruments" (
  "id" BIGSERIAL PRIMARY KEY,
  "stableInstrumentId" TEXT NOT NULL,
  "symbol" TEXT NOT NULL,
  "normalizedSymbol" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "normalizedName" TEXT NOT NULL,
  "exchange" TEXT NOT NULL,
  "country" TEXT NOT NULL,
  "assetType" TEXT NOT NULL,
  "currency" TEXT NOT NULL,
  "providerSymbol" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastProviderSyncAt" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "instruments_stableInstrumentId_key" UNIQUE ("stableInstrumentId"),
  CONSTRAINT "instruments_providerSymbol_key" UNIQUE ("providerSymbol")
);

CREATE TABLE "catalogue_refresh_status" (
  "id" INTEGER PRIMARY KEY DEFAULT 1 CHECK ("id" = 1),
  "status" TEXT NOT NULL DEFAULT 'never',
  "lastAttemptedAt" TIMESTAMPTZ,
  "lastSuccessfulRefreshAt" TIMESTAMPTZ,
  "lastError" TEXT,
  "activeCount" INTEGER NOT NULL DEFAULT 0,
  "inactiveCount" INTEGER NOT NULL DEFAULT 0,
  "recordsReceived" INTEGER NOT NULL DEFAULT 0,
  "recordsAdded" INTEGER NOT NULL DEFAULT 0,
  "recordsUpdated" INTEGER NOT NULL DEFAULT 0,
  "recordsDeactivated" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "instruments_normalizedSymbol_isActive_idx" ON "instruments" ("normalizedSymbol", "isActive");
CREATE INDEX "instruments_exchange_isActive_idx" ON "instruments" ("exchange", "isActive");
CREATE INDEX "instruments_assetType_isActive_idx" ON "instruments" ("assetType", "isActive");
CREATE INDEX "instruments_isActive_idx" ON "instruments" ("isActive");
CREATE INDEX "instruments_normalizedSymbol_trgm_idx" ON "instruments" USING GIN ("normalizedSymbol" gin_trgm_ops);
CREATE INDEX "instruments_normalizedName_trgm_idx" ON "instruments" USING GIN ("normalizedName" gin_trgm_ops);
CREATE INDEX "instruments_exchange_trgm_idx" ON "instruments" USING GIN ((lower("exchange")) gin_trgm_ops);
CREATE INDEX "instruments_assetType_trgm_idx" ON "instruments" USING GIN ((lower("assetType")) gin_trgm_ops);

INSERT INTO "catalogue_refresh_status" ("id") VALUES (1) ON CONFLICT DO NOTHING;

CREATE TABLE "communication_profiles" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT NOT NULL UNIQUE,
  "name" TEXT,
  "markets" JSONB NOT NULL,
  "briefingStyle" TEXT NOT NULL,
  "experienceLevel" TEXT NOT NULL,
  "contentToggles" JSONB NOT NULL,
  "timeZone" TEXT NOT NULL DEFAULT 'America/Toronto',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "profile_watchlists" (
  "id" BIGSERIAL PRIMARY KEY,
  "profileId" TEXT NOT NULL REFERENCES "communication_profiles"("id") ON DELETE CASCADE,
  "instrumentId" BIGINT NOT NULL REFERENCES "instruments"("id"),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "profile_watchlists_profileId_instrumentId_key" UNIQUE ("profileId", "instrumentId")
);

CREATE TABLE "profile_notifications" (
  "id" BIGSERIAL PRIMARY KEY,
  "profileId" TEXT NOT NULL REFERENCES "communication_profiles"("id") ON DELETE CASCADE,
  "cycleType" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "profile_notifications_profileId_cycleType_key" UNIQUE ("profileId", "cycleType")
);

CREATE TABLE "brief_cycles" (
  "id" TEXT PRIMARY KEY,
  "cycleType" TEXT NOT NULL,
  "scheduledFor" TIMESTAMPTZ NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "llmCallCount" INTEGER NOT NULL DEFAULT 0 CHECK ("llmCallCount" BETWEEN 0 AND 1),
  "inputTokens" INTEGER NOT NULL DEFAULT 0,
  "outputTokens" INTEGER NOT NULL DEFAULT 0,
  "estimatedCostUsd" DECIMAL(12,6) NOT NULL DEFAULT 0,
  "error" TEXT,
  "startedAt" TIMESTAMPTZ,
  "completedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "brief_cycles_cycleType_scheduledFor_key" UNIQUE ("cycleType", "scheduledFor")
);

CREATE TABLE "market_snapshots" (
  "id" TEXT PRIMARY KEY,
  "cycleId" TEXT NOT NULL UNIQUE REFERENCES "brief_cycles"("id") ON DELETE CASCADE,
  "payload" JSONB NOT NULL,
  "sources" JSONB NOT NULL,
  "warnings" JSONB NOT NULL,
  "collectedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "generated_briefs" (
  "id" TEXT PRIMARY KEY,
  "cycleId" TEXT NOT NULL UNIQUE REFERENCES "brief_cycles"("id") ON DELETE CASCADE,
  "model" TEXT NOT NULL,
  "promptVersion" TEXT NOT NULL,
  "content" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "recipient_deliveries" (
  "id" TEXT PRIMARY KEY,
  "cycleId" TEXT NOT NULL REFERENCES "brief_cycles"("id") ON DELETE CASCADE,
  "profileId" TEXT NOT NULL REFERENCES "communication_profiles"("id") ON DELETE CASCADE,
  "idempotencyKey" TEXT NOT NULL UNIQUE,
  "channel" TEXT NOT NULL DEFAULT 'email',
  "status" TEXT NOT NULL DEFAULT 'ready',
  "subject" TEXT NOT NULL,
  "previewText" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "error" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentAt" TIMESTAMPTZ,
  CONSTRAINT "recipient_deliveries_cycleId_profileId_channel_key" UNIQUE ("cycleId", "profileId", "channel")
);

CREATE INDEX "profile_watchlists_instrumentId_idx" ON "profile_watchlists" ("instrumentId");
CREATE INDEX "profile_notifications_cycleType_enabled_idx" ON "profile_notifications" ("cycleType", "enabled");
CREATE INDEX "brief_cycles_status_scheduledFor_idx" ON "brief_cycles" ("status", "scheduledFor");
CREATE INDEX "recipient_deliveries_status_createdAt_idx" ON "recipient_deliveries" ("status", "createdAt");

import type { MasterBriefContent } from "../../lib/briefing";
import { renderEmailTemplate, type EmailRenderContext } from "../email/templates";

export type RenderProfile = {
  name: string | null;
  markets: string[];
  briefingStyle: string;
  experienceLevel: string;
  contentToggles: string[];
  watchlist: Array<{ stableInstrumentId: string; symbol: string; exchange: string }>;
};

export function renderPersonalizedBrief(content: MasterBriefContent, profile: RenderProfile, context?: EmailRenderContext) {
  return renderEmailTemplate(content, profile, context || {
    cycleType: "daily",
    scheduledFor: new Date("2026-07-13T11:00:00.000Z"),
    dataTimestamp: "2026-07-13T10:55:00.000Z",
    timeZone: "America/Toronto",
    sources: [],
    warnings: [],
    managePreferencesUrl: "https://marketbrief.example/preferences",
    unsubscribeUrl: "https://marketbrief.example/unsubscribe",
  });
}

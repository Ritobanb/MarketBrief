import { CYCLE_TYPES, type CycleType } from "./briefing";
import { DEFAULT_PREFERENCES } from "./preferences";

export const MARKET_OPTIONS = ["Canadian markets", "US markets", "European markets", "Asia-Pacific markets"] as const;
export const STYLE_OPTIONS = ["Balanced", "Long-term investor", "Active investor", "Day trader"] as const;
export const EXPERIENCE_OPTIONS = ["Beginner-friendly", "Intermediate", "Advanced"] as const;
export const CONTENT_OPTIONS = ["General market overview", "Top market-moving news", "ETF ideas to watch", "Day-trading opportunities"] as const;
// Keep the free-edition dropdown intentionally small. The broader validation
// list preserves existing profiles and makes it easy to expose more zones later.
export const TIME_ZONE_OPTIONS = ["America/Toronto", "America/New_York"] as const;
export const SUPPORTED_TIME_ZONES = [...TIME_ZONE_OPTIONS, "America/Vancouver", "Europe/London", "Asia/Tokyo"] as const;

export type SubscriptionInput = {
  source: "homepage" | "personalized";
  email: string;
  name?: string;
  markets: string[];
  briefingStyle: string;
  experienceLevel: string;
  contentToggles: string[];
  timeZone: string;
  watchlistInstrumentIds: string[];
  notifications: Partial<Record<CycleType, boolean>>;
};

export type ValidationResult = { success: true; data: SubscriptionInput } | { success: false; errors: Record<string, string> };

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string) {
  const email = normalizeEmail(value);
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

function stringArray(value: unknown, allowed: readonly string[], maximum: number) {
  return Array.isArray(value)
    ? [...new Set(value.filter((item): item is string => typeof item === "string" && allowed.includes(item)))].slice(0, maximum)
    : [];
}

export function validateSubscriptionInput(value: unknown): ValidationResult {
  const input = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const source = input.source === "homepage" ? "homepage" : "personalized";
  const email = typeof input.email === "string" ? normalizeEmail(input.email) : "";
  const errors: Record<string, string> = {};
  if (!isValidEmail(email)) errors.email = "Enter a valid email address.";

  const name = typeof input.name === "string" ? input.name.trim().slice(0, 80) : "";
  const markets = stringArray(input.markets, MARKET_OPTIONS, MARKET_OPTIONS.length);
  if (!markets.length) errors.markets = "Choose at least one market.";
  const briefingStyle = typeof input.briefingStyle === "string" && STYLE_OPTIONS.some(option => option === input.briefingStyle) ? input.briefingStyle : "";
  if (!briefingStyle) errors.briefingStyle = "Choose a briefing style.";
  const experienceLevel = typeof input.experienceLevel === "string" && EXPERIENCE_OPTIONS.some(option => option === input.experienceLevel) ? input.experienceLevel : "";
  if (!experienceLevel) errors.experienceLevel = "Choose an experience level.";
  const contentToggles = stringArray(input.contentToggles, CONTENT_OPTIONS, CONTENT_OPTIONS.length);
  const timeZone = typeof input.timeZone === "string" && SUPPORTED_TIME_ZONES.some(option => option === input.timeZone) ? input.timeZone : "";
  if (!timeZone) errors.timeZone = "Choose a supported time zone.";
  const watchlistInstrumentIds = Array.isArray(input.watchlistInstrumentIds)
    ? [...new Set(input.watchlistInstrumentIds.filter((item): item is string => typeof item === "string" && /^[\w:-]{1,120}$/.test(item)))].slice(0, 50)
    : [];
  const rawNotifications = input.notifications && typeof input.notifications === "object" ? input.notifications as Record<string, unknown> : {};
  const notifications = Object.fromEntries(CYCLE_TYPES.map(type => [type, rawNotifications[type] === true])) as Record<CycleType, boolean>;
  if (!Object.values(notifications).some(Boolean)) errors.notifications = "Choose at least one notification.";

  if (Object.keys(errors).length) return { success: false, errors };
  return { success: true, data: { source, email, name: name || undefined, markets, briefingStyle, experienceLevel, contentToggles, timeZone, watchlistInstrumentIds, notifications } };
}

export function createHomepageSubscription(email: string): SubscriptionInput {
  return {
    source: "homepage",
    email,
    markets: [...DEFAULT_PREFERENCES.markets],
    briefingStyle: DEFAULT_PREFERENCES.style,
    experienceLevel: DEFAULT_PREFERENCES.experience,
    contentToggles: [...DEFAULT_PREFERENCES.content],
    timeZone: "America/Toronto",
    watchlistInstrumentIds: [],
    notifications: { daily: true, premarket: false, close: false, weekly: false },
  };
}

import { describe, expect, it } from "vitest";
import { FIXED_NOTIFICATION_SCHEDULES } from "../lib/briefing";
import { createDefaultNotifications, DEFAULT_PREFERENCES, hasEnabledNotification, togglePreference, updateSelection } from "../lib/preferences";
import { renderPersonalizedBrief } from "../services/briefing/render";

describe("updateSelection", () => {
  it("adds and removes choices in a multi-select step", () => {
    const initial = [["US markets"], ["Technology"]];
    expect(updateSelection(initial, 0, "Europe", true)[0]).toEqual(["US markets", "Europe"]);
    expect(updateSelection(initial, 0, "US markets", true)[0]).toEqual([]);
  });

  it("replaces the choice in a single-select step", () => {
    expect(updateSelection([["Quick"]], 0, "Standard", false)).toEqual([["Standard"]]);
  });

  it("starts with Canada, US, balanced, beginner-friendly defaults", () => {
    expect(DEFAULT_PREFERENCES.markets).toEqual(["Canadian markets", "US markets"]);
    expect(DEFAULT_PREFERENCES.style).toBe("Balanced");
    expect(DEFAULT_PREFERENCES.experience).toBe("Beginner-friendly");
  });

  it("toggles optional content without mutating the original", () => {
    const initial = ["General market overview"];
    expect(togglePreference(initial, "ETF ideas to watch")).toEqual(["General market overview", "ETF ideas to watch"]);
    expect(togglePreference(initial, "General market overview")).toEqual([]);
    expect(initial).toEqual(["General market overview"]);
  });

  it("enables daily and weekly notifications by default", () => {
    const notifications = createDefaultNotifications();
    expect(notifications.daily.enabled).toBe(true);
    expect(notifications.weekly.enabled).toBe(true);
    expect(notifications.premarket.enabled).toBe(false);
    expect(notifications.close.enabled).toBe(false);
  });

  it("requires at least one enabled notification", () => {
    const notifications = createDefaultNotifications();
    expect(hasEnabledNotification(notifications)).toBe(true);
    Object.values(notifications).forEach(notification => { notification.enabled = false; });
    expect(hasEnabledNotification(notifications)).toBe(false);
  });

  it("uses fixed free-edition notification times", () => {
    expect(FIXED_NOTIFICATION_SCHEDULES).toMatchObject({
      daily: { time: "07:00" }, premarket: { time: "08:00" }, close: { time: "16:30" }, weekly: { time: "18:00" },
    });
  });

  it("renders personalization without another generation call", () => {
    const rendered = renderPersonalizedBrief({
      subject: "Daily brief", previewText: "Your update", marketOverview: "Markets are mixed.",
      regionalSummaries: { "Canadian markets": "Canada is steady." },
      stylePerspectives: { Balanced: "Keep moves in context." },
      experienceExplanations: { "Beginner-friendly": "Focus on what changed." },
      optionalSections: { "Top market-moving news": "Today’s main story." },
      tickerSummaries: { inst_tcs: { headline: "TCS on NSE", summary: "A watchlist update." } },
    }, {
      name: "Ritoban", markets: ["Canadian markets"], briefingStyle: "Balanced",
      experienceLevel: "Beginner-friendly", contentToggles: ["Top market-moving news"],
      watchlist: [{ stableInstrumentId: "inst_tcs", symbol: "TCS", exchange: "NSE" }],
    });
    expect(rendered.text).toContain("Hi Ritoban,");
    expect(rendered.text).toContain("TCS · NSE");
    expect(rendered.html).toContain("max-width:680px");
  });

  it("uses a simple greeting when the optional name is missing", () => {
    const rendered = renderPersonalizedBrief({
      subject: "Daily brief", previewText: "Your update", marketOverview: "Markets are steady.",
      regionalSummaries: {}, stylePerspectives: {}, experienceExplanations: {}, optionalSections: {}, tickerSummaries: {},
    }, {
      name: null, markets: [], briefingStyle: "Balanced", experienceLevel: "Beginner-friendly", contentToggles: [], watchlist: [],
    });
    expect(rendered.text).toContain("\nHi,\n");
  });
});

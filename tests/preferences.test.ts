import { describe, expect, it } from "vitest";
import { createDefaultNotifications, DEFAULT_PREFERENCES, hasEnabledNotification, togglePreference, updateSelection } from "../lib/preferences";

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
});

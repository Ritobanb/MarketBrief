import { FIXED_NOTIFICATION_SCHEDULES } from "./briefing";

export function updateSelection(
  selections: string[][],
  step: number,
  label: string,
  multiple: boolean,
) {
  return selections.map((values, index) => {
    if (index !== step) return values;
    if (!multiple) return [label];
    return values.includes(label)
      ? values.filter((value) => value !== label)
      : [...values, label];
  });
}

export const DEFAULT_PREFERENCES = {
  markets: ["Canadian markets", "US markets"],
  style: "Balanced",
  experience: "Beginner-friendly",
  content: ["General market overview", "Top market-moving news"],
} as const;

export type NotificationPreference = {
  enabled: boolean;
  readonly time: string;
};

export const NOTIFICATION_OPTIONS = [
  { id: "daily", title: "Daily Market Brief", schedule: FIXED_NOTIFICATION_SCHEDULES.daily.cadence, defaultTime: FIXED_NOTIFICATION_SCHEDULES.daily.time, defaultEnabled: true },
  { id: "premarket", title: "Premarket Brief", schedule: FIXED_NOTIFICATION_SCHEDULES.premarket.cadence, defaultTime: FIXED_NOTIFICATION_SCHEDULES.premarket.time, defaultEnabled: false },
  { id: "close", title: "Market Close Summary", schedule: FIXED_NOTIFICATION_SCHEDULES.close.cadence, defaultTime: FIXED_NOTIFICATION_SCHEDULES.close.time, defaultEnabled: false },
  { id: "weekly", title: "Weekly Market Recap", schedule: FIXED_NOTIFICATION_SCHEDULES.weekly.cadence, defaultTime: FIXED_NOTIFICATION_SCHEDULES.weekly.time, defaultEnabled: true },
] as const;

export function createDefaultNotifications(): Record<string, NotificationPreference> {
  return Object.fromEntries(NOTIFICATION_OPTIONS.map(option => [option.id, {
    enabled: option.defaultEnabled,
    time: option.defaultTime,
  }]));
}

export function hasEnabledNotification(notifications: Record<string, NotificationPreference>) {
  return Object.values(notifications).some(notification => notification.enabled);
}

export function togglePreference(values: string[], label: string) {
  return values.includes(label)
    ? values.filter((value) => value !== label)
    : [...values, label];
}

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
  time: string;
};

export const NOTIFICATION_OPTIONS = [
  { id: "daily", title: "Daily Market Brief", schedule: "Weekday morning", defaultTime: "07:00", defaultEnabled: true },
  { id: "premarket", title: "Premarket Brief", schedule: "Before markets open", defaultTime: "08:00", defaultEnabled: false },
  { id: "close", title: "Market Close Summary", schedule: "After markets close", defaultTime: "16:30", defaultEnabled: false },
  { id: "weekly", title: "Weekly Market Recap", schedule: "Sunday evening", defaultTime: "18:00", defaultEnabled: true },
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

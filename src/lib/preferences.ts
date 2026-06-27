export type UserPreferences = {
  notificationsEnabled: boolean;
  notifyMessages: boolean;
  notifyReactions: boolean;
  quietHoursEnabled: boolean;
  quietStart: string;
  quietEnd: string;
  timeZone: string;
  hideNotificationPreview: boolean;
  profilePublic: boolean;
  readReceipts: boolean;
  reducedMotion: boolean;
};

export const DEFAULT_PREFERENCES: UserPreferences = {
  notificationsEnabled: true,
  notifyMessages: true,
  notifyReactions: true,
  quietHoursEnabled: false,
  quietStart: "22:00",
  quietEnd: "08:00",
  timeZone: "UTC",
  hideNotificationPreview: false,
  profilePublic: true,
  readReceipts: true,
  reducedMotion: false,
};

export function parsePreferences(value: unknown): UserPreferences {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return DEFAULT_PREFERENCES;
  }

  const input = value as Partial<UserPreferences>;
  return {
    ...DEFAULT_PREFERENCES,
    ...input,
    quietStart: validTime(input.quietStart) ? input.quietStart : DEFAULT_PREFERENCES.quietStart,
    quietEnd: validTime(input.quietEnd) ? input.quietEnd : DEFAULT_PREFERENCES.quietEnd,
    timeZone: typeof input.timeZone === "string" ? input.timeZone.slice(0, 64) : "UTC",
  };
}

export function isQuietTime(preferences: UserPreferences, date = new Date()) {
  if (!preferences.quietHoursEnabled) return false;
  let now: number;
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: preferences.timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    now = Number(values.hour) * 60 + Number(values.minute);
  } catch {
    now = date.getUTCHours() * 60 + date.getUTCMinutes();
  }
  const start = toMinutes(preferences.quietStart);
  const end = toMinutes(preferences.quietEnd);
  return start <= end ? now >= start && now < end : now >= start || now < end;
}

function validTime(value: unknown): value is string {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function toMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

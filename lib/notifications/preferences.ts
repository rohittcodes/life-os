export type NotificationCategory =
  | "habits"
  | "routine"
  | "goals"
  | "time"
  | "wellness"
  | "todos"
  | "projects"
  | "finance"
  | "contacts"
  | "jobs"
  | "subscriptions"

export interface NotificationPreferences {
  enabled: boolean
  strict: boolean
  repeatMinutes: number
  categories: Record<NotificationCategory, boolean>
}

export const NOTIFICATION_CATEGORIES: Array<{ id: NotificationCategory; label: string }> = [
  { id: "habits", label: "Habits" },
  { id: "routine", label: "Morning routine" },
  { id: "goals", label: "Goals" },
  { id: "time", label: "Time tracking" },
  { id: "wellness", label: "Wellness" },
  { id: "todos", label: "Todos" },
  { id: "projects", label: "Projects" },
  { id: "finance", label: "Finance" },
  { id: "contacts", label: "Follow-ups" },
  { id: "jobs", label: "Jobs" },
  { id: "subscriptions", label: "Subscriptions" },
]

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  enabled: true,
  strict: true,
  repeatMinutes: 30,
  categories: Object.fromEntries(
    NOTIFICATION_CATEGORIES.map(({ id }) => [id, true])
  ) as Record<NotificationCategory, boolean>,
}

export const NOTIFICATION_PREFS_KEY = "life-os-notification-preferences"

export function readNotificationPreferences(): NotificationPreferences {
  if (typeof window === "undefined") return DEFAULT_NOTIFICATION_PREFERENCES

  try {
    const raw = window.localStorage.getItem(NOTIFICATION_PREFS_KEY)
    if (!raw) return DEFAULT_NOTIFICATION_PREFERENCES
    const parsed = JSON.parse(raw) as Partial<NotificationPreferences>

    return {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      ...parsed,
      categories: {
        ...DEFAULT_NOTIFICATION_PREFERENCES.categories,
        ...parsed.categories,
      },
    }
  } catch {
    return DEFAULT_NOTIFICATION_PREFERENCES
  }
}

export function writeNotificationPreferences(preferences: NotificationPreferences) {
  window.localStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(preferences))
  window.dispatchEvent(new CustomEvent("life-os-notification-preferences-changed"))
}

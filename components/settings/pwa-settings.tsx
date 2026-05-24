"use client"

import { useEffect, useState } from "react"
import { Bell, Download, Loader2, ShieldAlert, Wifi, WifiOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  NOTIFICATION_CATEGORIES,
  type NotificationPreferences,
  readNotificationPreferences,
  writeNotificationPreferences,
} from "@/lib/notifications/preferences"

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
}

function getNotificationStatus() {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported"
  return Notification.permission
}

export function PwaSettings() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [notificationStatus, setNotificationStatus] = useState(getNotificationStatus)
  const [online, setOnline] = useState(() => {
    if (typeof navigator === "undefined") return true
    return navigator.onLine
  })
  const [loading, setLoading] = useState(false)
  const [preferences, setPreferences] = useState<NotificationPreferences>(() => {
    if (typeof window === "undefined") return DEFAULT_NOTIFICATION_PREFERENCES
    return readNotificationPreferences()
  })
  const [installed, setInstalled] = useState(() => {
    if (typeof window === "undefined") return false
    return window.matchMedia("(display-mode: standalone)").matches
  })

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }
    const onAppInstalled = () => {
      setInstalled(true)
      setInstallPrompt(null)
    }
    const onOnline = () => setOnline(true)
    const onOffline = () => setOnline(false)

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt)
    window.addEventListener("appinstalled", onAppInstalled)
    window.addEventListener("online", onOnline)
    window.addEventListener("offline", onOffline)

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt)
      window.removeEventListener("appinstalled", onAppInstalled)
      window.removeEventListener("online", onOnline)
      window.removeEventListener("offline", onOffline)
    }
  }, [])

  async function installApp() {
    if (!installPrompt) return
    await installPrompt.prompt()
    await installPrompt.userChoice
    setInstallPrompt(null)
  }

  async function enableNotifications() {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return
    setLoading(true)

    try {
      const registration = await navigator.serviceWorker.ready
      const permission = await Notification.requestPermission()
      setNotificationStatus(permission)

      if (permission === "granted") {
        registration.active?.postMessage({ type: "SHOW_TEST_NOTIFICATION" })
      }
    } finally {
      setLoading(false)
    }
  }

  function updatePreferences(next: NotificationPreferences) {
    setPreferences(next)
    writeNotificationPreferences(next)
  }

  function setCategory(category: keyof NotificationPreferences["categories"], value: boolean) {
    updatePreferences({
      ...preferences,
      categories: {
        ...preferences.categories,
        [category]: value,
      },
    })
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="font-medium">App install and notifications</h2>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className={cn("inline-flex items-center gap-1", online ? "text-green-600 dark:text-green-400" : "text-yellow-600 dark:text-yellow-400")}>
              {online ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
              {online ? "Online" : "Offline"}
            </span>
            <span>Install: {installed ? "installed" : installPrompt ? "ready" : "available from browser menu"}</span>
            <span>Notifications: {notificationStatus}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={installApp}
            disabled={!installPrompt || installed}
          >
            <Download className="h-4 w-4" />
            Install
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={enableNotifications}
            disabled={loading || notificationStatus === "denied" || notificationStatus === "unsupported"}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
            Enable
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-yellow-500/25 bg-yellow-500/5 p-3">
        <div className="flex items-start gap-2">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600 dark:text-yellow-400" />
          <div className="space-y-1">
            <p className="text-sm font-medium">Strict reminders</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Strict mode repeats overdue reminders until the underlying habit, timer, goal, wellness log, or task is updated. Browser settings can still block notifications.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
          <span>Reminder engine</span>
          <input
            type="checkbox"
            checked={preferences.enabled}
            onChange={(event) => updatePreferences({ ...preferences, enabled: event.target.checked })}
            className="h-4 w-4 accent-foreground"
          />
        </label>
        <label className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
          <span>Strict repeat</span>
          <input
            type="checkbox"
            checked={preferences.strict}
            onChange={(event) => updatePreferences({ ...preferences, strict: event.target.checked })}
            className="h-4 w-4 accent-foreground"
          />
        </label>
        <label className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm">
          <span>Repeat</span>
          <select
            value={preferences.repeatMinutes}
            onChange={(event) => updatePreferences({ ...preferences, repeatMinutes: Number(event.target.value) })}
            className="rounded-md border border-border bg-background px-2 py-1 text-xs"
          >
            <option value={15}>15 min</option>
            <option value={30}>30 min</option>
            <option value={60}>60 min</option>
          </select>
        </label>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Reminder coverage</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {NOTIFICATION_CATEGORIES.map((category) => (
            <label
              key={category.id}
              className="flex items-center justify-between rounded-lg border border-border bg-background/50 px-3 py-2 text-sm"
            >
              <span>{category.label}</span>
              <input
                type="checkbox"
                checked={preferences.categories[category.id]}
                onChange={(event) => setCategory(category.id, event.target.checked)}
                className="h-4 w-4 accent-foreground"
              />
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}

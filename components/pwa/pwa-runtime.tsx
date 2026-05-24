"use client"

import { useEffect } from "react"
import { readNotificationPreferences } from "@/lib/notifications/preferences"
import { sendDueReminders } from "@/lib/notifications/engine"

export function PwaRuntime() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return

    let activeRegistration: ServiceWorkerRegistration | null = null
    let reminderInterval: number | null = null
    let cancelled = false

    async function checkReminders() {
      if (cancelled || document.visibilityState === "hidden") return
      await sendDueReminders(readNotificationPreferences())
    }

    function startReminderLoop() {
      if (reminderInterval) window.clearInterval(reminderInterval)
      const preferences = readNotificationPreferences()
      const intervalMinutes = preferences.strict ? 5 : 30
      reminderInterval = window.setInterval(checkReminders, intervalMinutes * 60 * 1000)
      void checkReminders()
    }

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        activeRegistration = registration
        startReminderLoop()

        registration.addEventListener("updatefound", () => {
          const worker = registration.installing
          if (!worker) return

          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              worker.postMessage({ type: "SKIP_WAITING" })
            }
          })
        })
      })
      .catch(() => {
        activeRegistration = null
      })

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void checkReminders()
    }
    const onPreferencesChanged = () => startReminderLoop()

    document.addEventListener("visibilitychange", onVisibilityChange)
    window.addEventListener("life-os-notification-preferences-changed", onPreferencesChanged)

    return () => {
      cancelled = true
      if (reminderInterval) window.clearInterval(reminderInterval)
      document.removeEventListener("visibilitychange", onVisibilityChange)
      window.removeEventListener("life-os-notification-preferences-changed", onPreferencesChanged)
      activeRegistration?.update()
    }
  }, [])

  return null
}

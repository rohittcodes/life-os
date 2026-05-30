"use client"

import { useEffect } from "react"
import { readNotificationPreferences } from "@/lib/notifications/preferences"
import { sendDueReminders } from "@/lib/notifications/engine"

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  const arr = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i)
  return arr.buffer
}

async function subscribeToPush(registration: ServiceWorkerRegistration) {
  if (!VAPID_PUBLIC_KEY) return
  try {
    const existing = await registration.pushManager.getSubscription()
    const sub = existing ?? await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })
    await fetch("/api/notifications/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: { endpoint: sub.endpoint, keys: { p256dh: btoa(String.fromCharCode(...new Uint8Array(sub.getKey("p256dh")!))), auth: btoa(String.fromCharCode(...new Uint8Array(sub.getKey("auth")!))) } } }),
    })
  } catch {
    // Push subscription failed silently — in-app reminders still work
  }
}

export function PwaRuntime() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return

    let activeRegistration: ServiceWorkerRegistration | null = null
    let reminderInterval: number | null = null
    let cancelled = false

    async function checkReminders() {
      if (cancelled) return
      await sendDueReminders(readNotificationPreferences())
    }

    function startReminderLoop() {
      if (reminderInterval) window.clearInterval(reminderInterval)
      const preferences = readNotificationPreferences()
      // Strict: check every 5 min, normal: every 30 min
      const intervalMinutes = preferences.strict ? 5 : 30
      reminderInterval = window.setInterval(checkReminders, intervalMinutes * 60 * 1000)
      void checkReminders()
    }

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        activeRegistration = registration
        startReminderLoop()

        // Subscribe to Web Push if permission already granted
        if (Notification.permission === "granted") {
          void subscribeToPush(registration)
        }

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
      .catch(() => { activeRegistration = null })

    // Re-subscribe when permission is freshly granted
    const onPushEnabled = async () => {
      if (activeRegistration && Notification.permission === "granted") {
        await subscribeToPush(activeRegistration)
      }
      startReminderLoop()
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void checkReminders()
    }

    document.addEventListener("visibilitychange", onVisibilityChange)
    window.addEventListener("life-os-notification-preferences-changed", onPushEnabled)

    return () => {
      cancelled = true
      if (reminderInterval) window.clearInterval(reminderInterval)
      document.removeEventListener("visibilitychange", onVisibilityChange)
      window.removeEventListener("life-os-notification-preferences-changed", onPushEnabled)
      activeRegistration?.update()
    }
  }, [])

  return null
}

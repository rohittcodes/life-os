"use client"

import { useState, useEffect } from "react"
import { Bell, X } from "lucide-react"

const DISMISSED_KEY = "life-os-notif-prompt-dismissed"

export function NotificationPrompt() {
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return
    if (Notification.permission === "granted") return
    if (Notification.permission === "denied") return
    if (sessionStorage.getItem(DISMISSED_KEY)) return
    // Small delay so it doesn't flash immediately on mount
    const t = setTimeout(() => setShow(true), 1500)
    return () => clearTimeout(t)
  }, [])

  if (!show) return null

  async function enable() {
    setLoading(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission === "granted") {
        const reg = await navigator.serviceWorker.ready
        reg.active?.postMessage({ type: "SHOW_TEST_NOTIFICATION" })
        // Trigger push subscription via pwa-runtime listener
        window.dispatchEvent(new CustomEvent("life-os-notification-preferences-changed"))
      }
    } finally {
      setLoading(false)
      setShow(false)
    }
  }

  function dismiss() {
    sessionStorage.setItem(DISMISSED_KEY, "1")
    setShow(false)
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/8 px-4 py-3">
      <Bell className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">Enable reminders</p>
        <p className="text-xs text-muted-foreground">
          Get pushed notifications for habits, todos &amp; goals — even when the app is closed.
        </p>
      </div>
      <button
        onClick={enable}
        disabled={loading}
        className="shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600 transition-colors disabled:opacity-60"
      >
        {loading ? "…" : "Enable"}
      </button>
      <button onClick={dismiss} className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

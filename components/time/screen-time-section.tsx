"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  RefreshCw, ChevronLeft, ChevronRight, ChevronDown,
  Copy, Check, Smartphone, Monitor, Clock, AlertCircle,
  TrendingUp, TrendingDown, Minus,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface ScreenTimeEntry {
  id: string
  log_date: string
  source: string
  app_name: string
  duration_seconds: number
  category: string
  synced_at: string
}

interface WeekEntry {
  log_date: string
  duration_seconds: number
  category: string
  source: string
}

const AW_PROXY = "/api/activity/aw-proxy"

const CATEGORY_BAR_CSS: Record<string, string> = {
  productivity: "bg-blue-500",
  browser:      "bg-violet-500",
  communication:"bg-emerald-500",
  entertainment:"bg-orange-500",
  system:       "bg-slate-400/60",
  other:        "bg-muted-foreground/30",
}

const CATEGORY_DOT: Record<string, string> = {
  productivity: "bg-blue-500",
  browser:      "bg-violet-500",
  communication:"bg-emerald-500",
  entertainment:"bg-orange-500",
  system:       "bg-slate-400",
  other:        "bg-muted-foreground/40",
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  productivity: ["code", "cursor", "visual studio", "vscode", "intellij", "webstorm", "xcode",
    "android studio", "vim", "neovim", "emacs", "terminal", "iterm", "warp", "hyper",
    "figma", "notion", "obsidian", "linear", "jira", "postman", "insomnia"],
  browser:      ["chrome", "firefox", "safari", "edge", "brave", "arc", "opera", "vivaldi"],
  communication:["slack", "discord", "teams", "zoom", "meet", "skype", "whatsapp", "telegram",
    "mail", "outlook", "gmail"],
  entertainment:["spotify", "youtube", "netflix", "prime video", "vlc", "mpv", "steam", "music", "podcasts"],
  system:       ["finder", "explorer", "spotlight", "alfred", "raycast", "settings",
    "system preferences", "activity monitor", "task manager"],
}

function categorize(app: string): string {
  const lower = app.toLowerCase()
  for (const [cat, keys] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keys.some((k) => lower.includes(k))) return cat
  }
  return "other"
}

function fmtDuration(s: number): string {
  if (s < 60) return `${s}s`
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function isoDate(d: Date): string {
  return d.toISOString().split("T")[0]
}

function addDays(date: string, n: number): string {
  const d = new Date(date + "T12:00:00")
  d.setDate(d.getDate() + n)
  return isoDate(d)
}

function displayDate(date: string): string {
  const today = isoDate(new Date())
  const yesterday = addDays(today, -1)
  if (date === today) return "Today"
  if (date === yesterday) return "Yesterday"
  return new Date(date + "T12:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })
}

export function ScreenTimeSection() {
  const today = isoDate(new Date())
  const [date, setDate] = useState(today)
  const [entries, setEntries] = useState<ScreenTimeEntry[]>([])
  const [weekEntries, setWeekEntries] = useState<WeekEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [syncState, setSyncState] = useState<"idle" | "working" | "done" | "error">("idle")
  const [syncMsg, setSyncMsg] = useState("")
  const [showSetup, setShowSetup] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [tokenLoading, setTokenLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [sourceFilter, setSourceFilter] = useState<"all" | "desktop" | "android">("all")

  const supabase = createClient()

  const fetchEntries = useCallback(async (d: string) => {
    setLoading(true)
    const { data } = await supabase
      .from("screen_time_entries")
      .select("*")
      .eq("log_date", d)
      .order("duration_seconds", { ascending: false })
    setEntries(data ?? [])
    setLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchWeekData = useCallback(async () => {
    const sevenAgo = addDays(today, -6)
    const { data } = await supabase
      .from("screen_time_entries")
      .select("log_date, duration_seconds, category, source")
      .gte("log_date", sevenAgo)
    setWeekEntries(data ?? [])
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchWeekData() }, [fetchWeekData])
  useEffect(() => { fetchEntries(date) }, [date, fetchEntries])

  // ─── AW fetch helper (proxy on desktop, direct on Android) ────────

  const isAndroidDevice = /android/i.test(navigator.userAgent)
  const isHttpsPage = window.location.protocol === "https:"
  // Android HTTPS pages can't fetch http://localhost (mixed content blocked by browser)
  const androidBlockedByHttps = isAndroidDevice && isHttpsPage

  async function awFetch(path: string): Promise<Response> {
    if (androidBlockedByHttps) {
      throw new Error("ANDROID_HTTPS_BLOCKED")
    }
    if (isAndroidDevice) {
      return fetch(`http://localhost:5600/api/0/${path}`)
    }
    return fetch(`${AW_PROXY}?path=${encodeURIComponent(path)}`)
  }

  // ─── Sync ─────────────────────────────────────────────────────────

  async function syncActivityWatch() {
    setSyncState("working")
    setSyncMsg("Connecting to ActivityWatch…")
    try {
      const bucketsRes = await awFetch("buckets/")
      if (!bucketsRes.ok) {
        const body = await bucketsRes.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? "ActivityWatch not running on this device")
      }
      const buckets: Record<string, unknown> = await bucketsRes.json()

      const bucketId = Object.keys(buckets).find(
        (k) => k.toLowerCase().includes("window") || k.toLowerCase().includes("aw.android")
      )
      if (!bucketId) throw new Error("Window watcher bucket not found — is ActivityWatch running?")

      setSyncMsg("Fetching app usage…")
      const start = `${date}T00:00:00`
      const end   = `${date}T23:59:59`
      const evRes = await awFetch(
        `buckets/${encodeURIComponent(bucketId)}/events?start=${start}&end=${end}&limit=200000`
      )
      if (!evRes.ok) {
        const body = await evRes.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? "Failed to fetch events from ActivityWatch")
      }
      const events: Array<{ duration?: number; data?: { app?: string; package?: string; packageName?: string } }> =
        await evRes.json()

      const appMap = new Map<string, number>()
      for (const ev of events) {
        const app = ev.data?.app || ev.data?.package || ev.data?.packageName || "Unknown"
        appMap.set(app, (appMap.get(app) ?? 0) + (ev.duration ?? 0))
      }

      const apps = Array.from(appMap.entries())
        .filter(([, d]) => d >= 10)
        .map(([app_name, duration]) => ({
          app_name,
          duration_seconds: Math.round(duration),
          category: categorize(app_name),
        }))

      if (apps.length === 0) throw new Error("No app usage data found for this date")

      setSyncMsg(`Saving ${apps.length} apps…`)
      const isAndroid = isAndroidDevice
      const res = await fetch("/api/activity/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, source: isAndroid ? "android" : "desktop", apps }),
      })
      if (!res.ok) throw new Error("Failed to save — check your connection")

      setSyncState("done")
      setSyncMsg(`Synced ${apps.length} apps`)
      await Promise.all([fetchEntries(date), fetchWeekData()])
    } catch (err) {
      setSyncState("error")
      const msg = (err as Error).message
      setSyncMsg(
        msg === "ANDROID_HTTPS_BLOCKED"
          ? "Browser sync is blocked on Android HTTPS. Use the Termux script below ↓"
          : msg
      )
    }
  }

  // ─── Token ────────────────────────────────────────────────────────

  async function loadToken() {
    setTokenLoading(true)
    const res = await fetch("/api/activity/token")
    const data = await res.json()
    setToken(data.token ?? null)
    setTokenLoading(false)
  }

  // ─── Derived analytics ────────────────────────────────────────────

  const filtered = entries.filter((e) => sourceFilter === "all" || e.source === sourceFilter)
  const totalSeconds = filtered.reduce((s, e) => s + e.duration_seconds, 0)
  const maxDuration = filtered[0]?.duration_seconds ?? 1

  const sources = [...new Set(entries.map((e) => e.source))]
  const hasDesktop = sources.includes("desktop")
  const hasAndroid = sources.includes("android")

  const productiveSeconds = filtered
    .filter((e) => e.category === "productivity")
    .reduce((s, e) => s + e.duration_seconds, 0)
  const productivityScore = totalSeconds > 0 ? Math.round((productiveSeconds / totalSeconds) * 100) : 0

  const yesterday = addDays(date, -1)
  const yesterdayTotal = weekEntries
    .filter((e) => e.log_date === yesterday && (sourceFilter === "all" || e.source === sourceFilter))
    .reduce((s, e) => s + e.duration_seconds, 0)
  const trendPct =
    yesterdayTotal > 0 && totalSeconds > 0
      ? Math.round(((totalSeconds - yesterdayTotal) / yesterdayTotal) * 100)
      : null

  const catTotals = filtered.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.duration_seconds
    return acc
  }, {})
  const catEntries = Object.entries(catTotals).sort((a, b) => b[1] - a[1]).filter(([, s]) => s > 0)

  // 7-day chart data
  const last7 = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6))
  const weekChartData = last7.map((d) => {
    const dayEntries = weekEntries.filter(
      (e) => e.log_date === d && (sourceFilter === "all" || e.source === sourceFilter)
    )
    const total = dayEntries.reduce((s, e) => s + e.duration_seconds, 0)
    const prod = dayEntries.filter((e) => e.category === "productivity").reduce((s, e) => s + e.duration_seconds, 0)
    const score = total > 0 ? Math.round((prod / total) * 100) : 0
    const label = new Date(d + "T12:00:00").toLocaleDateString("en-IN", { weekday: "short" })
    return { date: d, label, hours: +(total / 3600).toFixed(1), score, hasData: total > 0 }
  })
  const maxWeekHours = Math.max(...weekChartData.map((d) => d.hours), 0.1)

  const isToday = date === today

  // ─── Termux script ────────────────────────────────────────────────

  const appUrl = typeof window !== "undefined" ? window.location.origin : "https://your-app.vercel.app"
  const termuxScript = token
    ? `#!/usr/bin/env bash
TODAY=$(date +%Y-%m-%d)
AW="http://localhost:5600"
TOKEN="${token}"

BUCKET=$(curl -sf "$AW/api/0/buckets/" | python3 -c "
import sys,json
b=json.load(sys.stdin)
print(next((k for k in b if 'window' in k.lower()),''))
")
[ -z "$BUCKET" ] && echo "AW not running" && exit 1

APPS=$(curl -sf "$AW/api/0/buckets/$BUCKET/events?start=\${TODAY}T00:00:00&end=\${TODAY}T23:59:59&limit=200000" | python3 -c "
import sys,json
evs=json.load(sys.stdin)
m={}
for e in evs:
    a=e.get('data',{}).get('app') or e.get('data',{}).get('package','Unknown')
    m[a]=m.get(a,0)+e.get('duration',0)
print(json.dumps([{'app_name':k,'duration_seconds':round(v)} for k,v in m.items() if v>=10]))
")

curl -sf -X POST "${appUrl}/api/activity/sync" \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d "{\\"date\\":\\"$TODAY\\",\\"source\\":\\"android\\",\\"apps\\":$APPS}"
echo "Done"`
    : ""

  // ─── Render ───────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold">Screen Time</h2>
          <p className="text-xs text-muted-foreground">via ActivityWatch</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Date nav */}
          <div className="flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-1">
            <button
              onClick={() => setDate((d) => addDays(d, -1))}
              className="rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="min-w-[72px] text-center text-xs font-medium">{displayDate(date)}</span>
            <button
              onClick={() => setDate((d) => addDays(d, 1))}
              disabled={date >= today}
              className="rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {hasDesktop && hasAndroid && (
            <div className="flex rounded-lg border border-border overflow-hidden text-xs">
              {(["all", "desktop", "android"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSourceFilter(s)}
                  className={cn(
                    "px-2.5 py-1 capitalize transition-colors",
                    sourceFilter === s
                      ? "bg-foreground text-background"
                      : "bg-card text-muted-foreground hover:text-foreground"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {isToday && !androidBlockedByHttps && (
            <button
              onClick={syncActivityWatch}
              disabled={syncState === "working"}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                syncState === "done"  && "bg-green-500/10 text-green-600 dark:text-green-400",
                syncState === "error" && "bg-red-500/10 text-red-600 dark:text-red-400",
                (syncState === "idle" || syncState === "working") &&
                  "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <RefreshCw className={cn("h-3.5 w-3.5 shrink-0", syncState === "working" && "animate-spin")} />
              {syncState === "working" ? syncMsg : syncState === "done" ? "Synced ✓" : "Sync now"}
            </button>
          )}
          {androidBlockedByHttps && (
            <span className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
              <Smartphone className="h-3.5 w-3.5 shrink-0" />
              Use Termux script ↓
            </span>
          )}
        </div>
      </div>

      {/* Error banner */}
      {syncState === "error" && (
        <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/8 px-3 py-2.5 text-xs text-red-600 dark:text-red-400">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>{syncMsg}</span>
        </div>
      )}

      {/* 7-day chart — always visible */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-medium">7-day overview</p>
          <p className="text-[10px] text-muted-foreground">tap to navigate</p>
        </div>
        <div className="flex items-end gap-1.5 h-16">
          {weekChartData.map((d) => {
            const barH = d.hasData ? Math.max(6, Math.round((d.hours / maxWeekHours) * 48)) : 4
            const isSelected = d.date === date
            const barColor = !d.hasData
              ? "bg-muted"
              : d.score >= 60
              ? "bg-blue-500"
              : d.score >= 25
              ? "bg-amber-400"
              : "bg-muted-foreground/40"
            return (
              <button
                key={d.date}
                onClick={() => setDate(d.date)}
                disabled={d.date > today}
                title={d.hasData ? `${fmtDuration(d.hours * 3600)} · ${d.score}% productive` : "No data"}
                className={cn(
                  "flex-1 flex flex-col items-center gap-1 group disabled:cursor-default",
                  d.date > today && "opacity-20"
                )}
              >
                <div
                  className={cn(
                    "w-full rounded-sm transition-all",
                    barColor,
                    isSelected
                      ? "opacity-100 ring-2 ring-offset-1 ring-offset-card ring-foreground/30"
                      : "opacity-50 group-hover:opacity-75"
                  )}
                  style={{ height: `${barH}px` }}
                />
                <span
                  className={cn(
                    "text-[10px] transition-colors",
                    isSelected ? "font-semibold text-foreground" : "text-muted-foreground"
                  )}
                >
                  {d.label}
                </span>
              </button>
            )
          })}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-sm bg-blue-500" />60%+ productive
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-sm bg-amber-400" />25–60%
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-sm bg-muted-foreground/40" />&lt;25%
          </span>
        </div>
      </div>

      {/* Day detail */}
      {loading ? (
        <div className="space-y-3 animate-pulse">
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-muted" />)}
          </div>
          <div className="h-3 rounded-full bg-muted" />
          <div className="rounded-xl border border-border overflow-hidden">
            {[80, 65, 50, 40, 30].map((w) => (
              <div key={w} className="flex items-center gap-3 px-4 py-2.5 border-b border-border/50 last:border-0">
                <div className="h-2.5 w-2.5 rounded-full bg-muted" />
                <div className="h-3 rounded bg-muted" style={{ width: `${w}%` }} />
                <div className="h-3 w-12 rounded bg-muted ml-auto" />
              </div>
            ))}
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 px-5 py-8 text-center">
          <Clock className="mx-auto h-8 w-8 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No data for {displayDate(date)}</p>
          {isToday && (
            <p className="mt-1 text-xs text-muted-foreground/60">
              Open ActivityWatch and tap <strong>Sync now</strong>
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-border bg-card p-3">
              <div className="text-xl font-bold tabular-nums leading-none">{fmtDuration(totalSeconds)}</div>
              <div className="mt-1.5 text-[11px] text-muted-foreground">Screen time</div>
            </div>

            <div className="rounded-xl border border-border bg-card p-3">
              <div
                className={cn(
                  "text-xl font-bold tabular-nums leading-none",
                  productivityScore >= 60
                    ? "text-blue-600 dark:text-blue-400"
                    : productivityScore >= 30
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-muted-foreground"
                )}
              >
                {productivityScore}%
              </div>
              <div className="mt-1.5 text-[11px] text-muted-foreground">Productive</div>
            </div>

            <div className="rounded-xl border border-border bg-card p-3">
              {trendPct !== null ? (
                <>
                  <div
                    className={cn(
                      "flex items-center gap-0.5 text-xl font-bold tabular-nums leading-none",
                      trendPct > 10
                        ? "text-orange-500"
                        : trendPct < -10
                        ? "text-green-500"
                        : "text-muted-foreground"
                    )}
                  >
                    {trendPct > 0 ? (
                      <TrendingUp className="h-4 w-4 shrink-0" />
                    ) : trendPct < 0 ? (
                      <TrendingDown className="h-4 w-4 shrink-0" />
                    ) : (
                      <Minus className="h-4 w-4 shrink-0" />
                    )}
                    {Math.abs(trendPct)}%
                  </div>
                  <div className="mt-1.5 text-[11px] text-muted-foreground">vs yesterday</div>
                </>
              ) : (
                <>
                  <div className="text-xl font-bold text-muted-foreground/40 leading-none">—</div>
                  <div className="mt-1.5 text-[11px] text-muted-foreground">vs yesterday</div>
                </>
              )}
            </div>
          </div>

          {/* Category stacked bar */}
          {catEntries.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex h-3 overflow-hidden rounded-full gap-0.5">
                {catEntries.map(([cat, secs]) => (
                  <div
                    key={cat}
                    className={cn("h-full transition-all", CATEGORY_BAR_CSS[cat] ?? "bg-muted-foreground/30")}
                    style={{ width: `${(secs / totalSeconds) * 100}%` }}
                    title={`${cat}: ${fmtDuration(secs)}`}
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                {catEntries.map(([cat, secs]) => (
                  <div key={cat} className="flex items-center gap-1.5 text-xs">
                    <span className={cn("h-2 w-2 rounded-full shrink-0", CATEGORY_DOT[cat] ?? "bg-muted-foreground/50")} />
                    <span className="capitalize text-muted-foreground">{cat}</span>
                    <span className="font-medium tabular-nums">{fmtDuration(secs)}</span>
                    <span className="text-muted-foreground/50 tabular-nums">
                      {Math.round((secs / totalSeconds) * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* App list */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <p className="text-xs font-medium">Top apps</p>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                {hasDesktop && !hasAndroid && <><Monitor className="h-3 w-3" /><span>Desktop</span></>}
                {hasAndroid && !hasDesktop && <><Smartphone className="h-3 w-3" /><span>Android</span></>}
                {hasDesktop && hasAndroid && (
                  <><Monitor className="h-3 w-3" /><Smartphone className="h-3 w-3" /><span>Both</span></>
                )}
              </div>
            </div>
            <div className="divide-y divide-border/50">
              {filtered.slice(0, 15).map((entry, i) => {
                const barPct = Math.round((entry.duration_seconds / maxDuration) * 100)
                const pctOfDay = Math.round((entry.duration_seconds / totalSeconds) * 100)
                return (
                  <div key={entry.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors">
                    <span className="w-5 shrink-0 text-center text-[11px] tabular-nums text-muted-foreground/50">
                      {i + 1}
                    </span>
                    <span className={cn("h-2 w-2 rounded-full shrink-0", CATEGORY_DOT[entry.category] ?? "bg-muted-foreground/50")} />
                    <span className="flex-1 truncate text-xs font-medium">{entry.app_name}</span>
                    <div className="w-20 shrink-0 hidden sm:block">
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all", CATEGORY_BAR_CSS[entry.category] ?? "bg-muted-foreground/40")}
                          style={{ width: `${barPct}%` }}
                        />
                      </div>
                    </div>
                    <span className="w-14 shrink-0 text-right text-xs tabular-nums">{fmtDuration(entry.duration_seconds)}</span>
                    <span className="w-8 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground/50 hidden sm:block">
                      {pctOfDay}%
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Setup guide */}
      <div className="rounded-xl border border-border bg-card/50">
        <button
          onClick={() => setShowSetup((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <span>Setup guide &amp; Android automation</span>
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showSetup && "rotate-180")} />
        </button>

        {showSetup && (
          <div className="border-t border-border px-4 pb-4 pt-3 space-y-5 text-xs">
            <div className="space-y-2">
              <p className="font-semibold flex items-center gap-1.5">
                <Monitor className="h-3.5 w-3.5" />Desktop
              </p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground leading-relaxed">
                <li>Download <strong>ActivityWatch</strong> from <code className="bg-muted px-1 rounded">activitywatch.net</code></li>
                <li>Run it — starts at <code className="bg-muted px-1 rounded">localhost:5600</code></li>
                <li>Return here and tap <strong>Sync now</strong></li>
              </ol>
            </div>

            <div className="space-y-2">
              <p className="font-semibold flex items-center gap-1.5">
                <Smartphone className="h-3.5 w-3.5" />Android — one-tap
              </p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground leading-relaxed">
                <li>Install <strong>ActivityWatch</strong> from F-Droid or GitHub</li>
                <li>Grant <strong>Usage Access</strong> (Settings → Apps → Special app access)</li>
                <li>Open Life OS in Chrome on your phone → <strong>Sync now</strong></li>
              </ol>
            </div>

            <div className="space-y-2.5">
              <p className="font-semibold">Android — automated (Termux)</p>
              {token ? (
                <>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 truncate rounded-lg bg-muted px-3 py-2 text-[11px] font-mono text-muted-foreground">
                      {token}
                    </code>
                    <button
                      onClick={() => { navigator.clipboard.writeText(token); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                      className="shrink-0 rounded-lg border border-border p-2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  <div className="relative">
                    <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-[10px] font-mono text-muted-foreground leading-relaxed whitespace-pre">
                      {termuxScript}
                    </pre>
                    <button
                      onClick={() => { navigator.clipboard.writeText(termuxScript); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                      className="absolute top-2 right-2 rounded-md border border-border bg-background p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                    </button>
                  </div>
                  <p className="text-muted-foreground/60">
                    Add to cron: <code className="bg-muted px-1 rounded">0 23 * * * bash ~/sync-screen-time.sh</code>
                  </p>
                </>
              ) : (
                <button
                  onClick={loadToken}
                  disabled={tokenLoading}
                  className="rounded-lg bg-muted px-3 py-1.5 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {tokenLoading ? "Generating…" : "Show / generate token"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

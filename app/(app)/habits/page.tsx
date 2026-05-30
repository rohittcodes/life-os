import { createClient } from "@/lib/supabase/server"

export const metadata = { title: "Habits" }
import { HabitChecker } from "@/components/habits/habit-checker"
import { HabitCalendarPanel } from "@/components/habits/habit-calendar-panel"
import { AddHabitForm } from "@/components/habits/add-habit-form"
import { Flame } from "lucide-react"
import { cn } from "@/lib/utils"
import type { HabitLog, HabitDefinition } from "@/lib/types"

function calcStreak(logs: HabitLog[]): number {
  const sorted = [...logs].sort((a, b) => b.log_date.localeCompare(a.log_date))
  const today  = new Date().toISOString().split("T")[0]
  let streak = 0; let cursor = today
  for (const log of sorted) {
    if (log.log_date !== cursor) break
    if (log.gym_done && log.english_done && log.diet_clean) streak++
    else break
    const d = new Date(cursor); d.setDate(d.getDate() - 1); cursor = d.toISOString().split("T")[0]
  }
  return streak
}

function pct(logs: HabitLog[], key: keyof HabitLog) {
  if (!logs.length) return 0
  return Math.round((logs.filter(l => l[key]).length / logs.length) * 100)
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export default async function HabitsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const now          = new Date()
  const today        = now.toISOString().split("T")[0]
  const ninetyAgo    = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  const thirtyAgo    = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]

  const [{ data: logs = [] }, { data: definitions = [] }] = await Promise.all([
    supabase.from("habit_logs").select("*").eq("user_id", user!.id).gte("log_date", ninetyAgo).order("log_date", { ascending: false }),
    supabase.from("habit_definitions").select("*").eq("user_id", user!.id).eq("active", true).order("sort_order"),
  ])

  const allLogs:        HabitLog[]        = logs        ?? []
  const allDefinitions: HabitDefinition[] = definitions ?? []
  const recentLogs  = allLogs.filter(l => l.log_date >= thirtyAgo)
  const todayLog    = allLogs.find(l => l.log_date === today) ?? null
  const streak      = calcStreak(allLogs)

  const stats = [
    { label: "Gym",     key: "gym_done" as const },
    { label: "English", key: "english_done" as const },
    { label: "Diet",    key: "diet_clean" as const },
  ].map(s => ({ ...s, pct30: pct(recentLogs, s.key), days: recentLogs.filter(l => l[s.key]).length }))

  // Day-of-week chart (30d)
  const dayStats = DAY_LABELS.map((label, idx) => {
    const dayLogs  = recentLogs.filter(l => new Date(l.log_date + "T00:00:00").getDay() === idx)
    const fullDays = dayLogs.filter(l => l.gym_done && l.english_done && l.diet_clean).length
    const rate     = dayLogs.length >= 2 ? Math.round((fullDays / dayLogs.length) * 100) : null
    return { label, total: dayLogs.length, fullDays, rate, isToday: new Date().getDay() === idx }
  })
  const maxRate = Math.max(...dayStats.map(d => d.rate ?? 0), 1)

  return (
    <div className="relative flex flex-col gap-0 min-h-full lg:pl-72 xl:pl-80">

      {/* ── Left panel: today's check-in ────────────────── */}
      <aside className="lg:fixed lg:top-16 lg:left-(--sidebar-width) lg:h-[calc(100dvh-3.5rem)] lg:w-72 xl:w-80 shrink-0 overflow-hidden">
        <div className="h-full space-y-5 border-b lg:border-b-0 lg:border-r border-border p-4 md:p-6 overflow-hidden">

          {/* Date + streak */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-lg font-semibold">Today</h1>
              <p className="text-xs text-muted-foreground">
                {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
              </p>
            </div>
            <div className="flex items-center gap-1 rounded-xl border border-border bg-card px-3 py-1.5">
              <span className="text-xl font-bold">{streak}</span>
              <Flame className="h-4 w-4 text-orange-500" />
            </div>
          </div>

          {/* Habit checker */}
          <HabitChecker log={todayLog} date={today} customHabits={allDefinitions} />

          {/* 30-day completion rates */}
          {recentLogs.length > 0 && (
            <div className="space-y-3 rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">30-day rates</p>
              <div className="space-y-2.5">
                {stats.map(s => (
                  <div key={s.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium">{s.label}</span>
                      <span className="text-xs text-muted-foreground">{s.days}/{recentLogs.length}d · {s.pct30}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn("h-full rounded-full transition-all",
                          s.pct30 >= 70 ? "bg-green-500" : s.pct30 >= 40 ? "bg-amber-500" : "bg-red-400"
                        )}
                        style={{ width: `${s.pct30}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Day-of-week chart */}
          {recentLogs.length >= 7 && (
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Best days</p>
              <div className="flex items-end gap-1 h-16">
                {dayStats.map(d => (
                  <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
                    <div className="flex-1 w-full flex items-end">
                      {d.rate !== null ? (
                        <div
                          title={`${d.label}: ${d.rate}%`}
                          className={cn(
                            "w-full rounded-t transition-all",
                            d.rate >= 70 ? "bg-green-500" : d.rate >= 40 ? "bg-amber-500" : "bg-red-400",
                            d.isToday && "ring-1 ring-ring ring-offset-1 ring-offset-background"
                          )}
                          style={{ height: `${Math.max((d.rate / maxRate) * 100, 10)}%` }}
                        />
                      ) : (
                        <div className="w-full h-1 bg-muted rounded-t" />
                      )}
                    </div>
                    <span className={cn("text-[9px]", d.isToday ? "font-bold text-foreground" : "text-muted-foreground")}>
                      {d.label.slice(0, 2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </aside>

      {/* ── Right panel: calendar + manage ─────────────── */}
      <main className="flex-1 min-w-0 space-y-6 p-4 md:p-6">

        <div className="rounded-xl border border-border bg-card p-5">
          <HabitCalendarPanel logs={allLogs} definitions={allDefinitions} />
        </div>

        {/* Manage habits */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold mb-4">Manage habits</h2>
          <AddHabitForm definitions={allDefinitions} />
        </div>

      </main>
    </div>
  )
}

import { createClient } from "@/lib/supabase/server"

export const metadata = { title: "Habits" }
import { HabitChecker } from "@/components/habits/habit-checker"
import { StreakCalendar } from "@/components/habits/streak-calendar"
import { AddHabitForm } from "@/components/habits/add-habit-form"
import { Flame } from "lucide-react"
import { cn } from "@/lib/utils"
import type { HabitLog, HabitDefinition } from "@/lib/types"

function calcStreak(logs: HabitLog[]): number {
  const sorted = [...logs].sort((a, b) => b.log_date.localeCompare(a.log_date))
  const today = new Date().toISOString().split("T")[0]
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
  if (logs.length === 0) return 0
  return Math.round((logs.filter(l => l[key]).length / logs.length) * 100)
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export default async function HabitsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const today = new Date().toISOString().split("T")[0]
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]

  const [{ data: logs = [] }, { data: definitions = [] }] = await Promise.all([
    supabase.from("habit_logs").select("*").eq("user_id", user!.id).gte("log_date", thirtyDaysAgo).order("log_date", { ascending: false }),
    supabase.from("habit_definitions").select("*").eq("user_id", user!.id).eq("active", true).order("sort_order"),
  ])

  const todayLog = (logs ?? []).find((l: HabitLog) => l.log_date === today) ?? null
  const streak = calcStreak(logs ?? [])
  const allDefinitions: HabitDefinition[] = definitions ?? []
  const allLogs: HabitLog[] = logs ?? []

  const stats = [
    { label: "Gym", key: "gym_done" as const, pct30: pct(allLogs, "gym_done") },
    { label: "English", key: "english_done" as const, pct30: pct(allLogs, "english_done") },
    { label: "Diet", key: "diet_clean" as const, pct30: pct(allLogs, "diet_clean") },
  ]

  // Day-of-week breakdown
  const dayStats = DAY_LABELS.map((label, dayIndex) => {
    const dayLogs = allLogs.filter(l => new Date(l.log_date + "T00:00:00").getDay() === dayIndex)
    const fullDays = dayLogs.filter(l => l.gym_done && l.english_done && l.diet_clean).length
    const rate = dayLogs.length > 0 ? Math.round((fullDays / dayLogs.length) * 100) : null
    return { label, dayLogs: dayLogs.length, fullDays, rate }
  })

  const maxRate = Math.max(...dayStats.filter(d => d.rate !== null).map(d => d.rate ?? 0), 1)

  // Best and worst days
  const ratedDays = dayStats.filter(d => d.rate !== null && d.dayLogs >= 2)
  const bestDay = ratedDays.length > 0 ? ratedDays.reduce((a, b) => (a.rate ?? 0) >= (b.rate ?? 0) ? a : b) : null
  const worstDay = ratedDays.length > 0 ? ratedDays.reduce((a, b) => (a.rate ?? 0) <= (b.rate ?? 0) ? a : b) : null

  return (
    <div className="space-y-8 p-4 md:p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Daily Habits</h1>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1.5 justify-end">
            <div className="text-3xl font-bold">{streak}</div>
            <Flame className="h-5 w-5 text-orange-500" />
          </div>
          <div className="text-xs text-muted-foreground">day streak</div>
        </div>
      </div>

      <HabitChecker log={todayLog} date={today} customHabits={allDefinitions} />

      {/* 30-day completion rates */}
      <div className="grid grid-cols-3 gap-3">
        {stats.map(s => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4">
            <div className="text-2xl font-bold">{s.pct30}%</div>
            <div className="mt-1 text-xs text-muted-foreground">{s.label} (30d)</div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-foreground" style={{ width: `${s.pct30}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Day-of-week analytics */}
      {allLogs.length >= 7 && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-sm font-medium">Day-of-week patterns</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Full completion rate by weekday (30d)</p>
            </div>
            {bestDay && worstDay && bestDay.label !== worstDay.label && (
              <div className="text-right text-xs text-muted-foreground space-y-0.5">
                <p>Best: <span className="font-medium text-foreground">{bestDay.label} ({bestDay.rate}%)</span></p>
                <p>Worst: <span className="font-medium text-red-500">{worstDay.label} ({worstDay.rate}%)</span></p>
              </div>
            )}
          </div>
          <div className="flex items-end gap-1.5 h-20">
            {dayStats.map(d => {
              const heightPct = d.rate !== null ? (d.rate / maxRate) * 100 : 0
              const isToday = new Date().getDay() === DAY_LABELS.indexOf(d.label)
              return (
                <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex-1 w-full flex items-end">
                    {d.rate !== null ? (
                      <div
                        title={`${d.label}: ${d.rate}% (${d.dayLogs} days tracked)`}
                        className={cn(
                          "w-full rounded-t-md transition-all",
                          d.rate >= 70 ? "bg-green-500" : d.rate >= 40 ? "bg-amber-500" : "bg-red-400",
                          isToday && "ring-2 ring-ring ring-offset-1 ring-offset-background",
                        )}
                        style={{ height: `${Math.max(heightPct, 8)}%` }}
                      />
                    ) : (
                      <div className="w-full h-1 rounded-t-md bg-muted" />
                    )}
                  </div>
                  <span className={cn("text-[10px]", isToday ? "text-foreground font-semibold" : "text-muted-foreground")}>
                    {d.label}
                  </span>
                  {d.rate !== null && (
                    <span className="text-[9px] text-muted-foreground">{d.rate}%</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Per-habit breakdown */}
      {allLogs.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <h2 className="text-sm font-medium">Habit breakdown · 30 days</h2>
          <div className="space-y-3">
            {stats.map(s => {
              const days = allLogs.filter(l => l[s.key]).length
              return (
                <div key={s.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium">{s.label}</span>
                    <span className="text-muted-foreground">{days}/{allLogs.length} days · {s.pct30}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn("h-full rounded-full transition-all",
                        s.pct30 >= 70 ? "bg-green-500" : s.pct30 >= 40 ? "bg-amber-500" : "bg-red-400"
                      )}
                      style={{ width: `${s.pct30}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-4">
        <StreakCalendar logs={allLogs} />
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-medium mb-4">Manage Habits</h2>
        <AddHabitForm definitions={allDefinitions} />
      </div>
    </div>
  )
}

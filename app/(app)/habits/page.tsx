import { createClient } from "@/lib/supabase/server"
import { HabitChecker } from "@/components/habits/habit-checker"
import { StreakCalendar } from "@/components/habits/streak-calendar"
import { AddHabitForm } from "@/components/habits/add-habit-form"
import { Flame } from "lucide-react"
import type { HabitLog, HabitDefinition } from "@/lib/types"

function calcStreak(logs: HabitLog[]): number {
  const sorted = [...logs].sort((a, b) => b.log_date.localeCompare(a.log_date))
  const today = new Date().toISOString().split("T")[0]
  let streak = 0
  let cursor = today

  for (const log of sorted) {
    if (log.log_date === cursor) {
      const fullyDone = log.gym_done && log.english_done && log.diet_clean
      if (fullyDone) streak++
      else break
      const d = new Date(cursor)
      d.setDate(d.getDate() - 1)
      cursor = d.toISOString().split("T")[0]
    } else {
      break
    }
  }
  return streak
}

function pct(logs: HabitLog[], key: keyof HabitLog) {
  if (logs.length === 0) return 0
  return Math.round((logs.filter((l) => l[key]).length / logs.length) * 100)
}

export default async function HabitsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const today = new Date().toISOString().split("T")[0]
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]

  const [{ data: logs = [] }, { data: definitions = [] }] = await Promise.all([
    supabase
      .from("habit_logs")
      .select("*")
      .eq("user_id", user!.id)
      .gte("log_date", thirtyDaysAgo)
      .order("log_date", { ascending: false }),
    supabase
      .from("habit_definitions")
      .select("*")
      .eq("user_id", user!.id)
      .eq("active", true)
      .order("sort_order"),
  ])

  const todayLog = (logs ?? []).find((l: HabitLog) => l.log_date === today) ?? null
  const streak = calcStreak(logs ?? [])
  const allDefinitions: HabitDefinition[] = definitions ?? []

  const stats = [
    { label: "Gym", pct: pct(logs ?? [], "gym_done") },
    { label: "English", pct: pct(logs ?? [], "english_done") },
    { label: "Diet", pct: pct(logs ?? [], "diet_clean") },
  ]

  return (
    <div className="space-y-8 p-6">
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

      <div className="grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4">
            <div className="text-2xl font-bold">{s.pct}%</div>
            <div className="mt-1 text-xs text-muted-foreground">{s.label} (30d)</div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-foreground" style={{ width: `${s.pct}%` }} />
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <StreakCalendar logs={logs ?? []} />
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-medium mb-4">Manage Habits</h2>
        <AddHabitForm definitions={allDefinitions} />
      </div>
    </div>
  )
}

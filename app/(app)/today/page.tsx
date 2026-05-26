import { createClient } from "@/lib/supabase/server"
import { TodayTodos } from "@/components/today/today-todos"
import { HabitChecker } from "@/components/habits/habit-checker"
import Link from "next/link"
import {
  Flame, AlertTriangle, CalendarCheck, Target, Timer,
  Smile, Moon, Droplets, ChevronRight, CheckCircle2,
} from "lucide-react"
import type { HabitLog, HabitDefinition, RoutineItem, RoutineLog, Goal, WellnessLog, Todo } from "@/lib/types"

export const metadata = { title: "Today" }

function calcHabitStreak(logs: HabitLog[]): number {
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

export default async function TodayPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const today = new Date().toISOString().split("T")[0]
  const now = new Date()
  const thirtyAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]

  const [
    { data: todos },
    { data: habitLogs },
    { data: habitDefs },
    { data: routineItems },
    { data: routineLogs },
    { data: goals },
    { data: timer },
    { data: wellness },
  ] = await Promise.all([
    supabase.from("todos").select("*").eq("user_id", user!.id).eq("done", false)
      .or(`due_date.lte.${today},due_date.is.null`)
      .order("priority", { ascending: false }).order("due_date", { ascending: true, nullsFirst: false }).limit(50),
    supabase.from("habit_logs").select("*").eq("user_id", user!.id).gte("log_date", thirtyAgo).order("log_date", { ascending: false }),
    supabase.from("habit_definitions").select("*").eq("user_id", user!.id).eq("active", true).order("sort_order"),
    supabase.from("routine_items").select("*").eq("user_id", user!.id).eq("active", true).order("sort_order"),
    supabase.from("routine_logs").select("*").eq("user_id", user!.id).eq("log_date", today).limit(1),
    supabase.from("goals").select("id, title, category, progress, due_date").eq("user_id", user!.id).eq("status", "active").order("progress"),
    supabase.from("time_entries").select("id, description, started_at").eq("user_id", user!.id).is("ended_at", null).limit(1),
    supabase.from("wellness_logs").select("*").eq("user_id", user!.id).eq("log_date", today).maybeSingle(),
  ])

  const allTodos: Todo[] = todos ?? []
  const allLogs: HabitLog[] = habitLogs ?? []
  const allDefs: HabitDefinition[] = habitDefs ?? []
  const todayHabit: HabitLog | null = allLogs.find(l => l.log_date === today) ?? null
  const streak = calcHabitStreak(allLogs)

  const overdue = allTodos.filter(t => t.due_date && t.due_date < today)
  const dueToday = allTodos.filter(t => t.due_date === today)
  const noDueDate = allTodos.filter(t => !t.due_date).slice(0, 5)

  const routineItem: RoutineItem[] = routineItems ?? []
  const todayRoutine: RoutineLog | null = routineLogs?.[0] ?? null
  const routineDone = todayRoutine?.completed_item_ids?.length ?? 0
  const routineTotal = routineItem.length
  const routinePct = routineTotal > 0 ? Math.round((routineDone / routineTotal) * 100) : 0

  const activeGoals = (goals ?? []) as Pick<Goal, "id" | "title" | "category" | "progress" | "due_date">[]
  const runningTimer = timer?.[0] ?? null
  const todayWellness = wellness as WellnessLog | null

  const hour = now.getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"
  const dateStr = now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })

  const habitsDone = [todayHabit?.gym_done, todayHabit?.english_done, todayHabit?.diet_clean].filter(Boolean).length
  const habitsTotal = 3 + allDefs.length

  return (
    <div className="space-y-5 p-4 md:p-6 max-w-2xl">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{greeting}</h1>
          <p className="text-sm text-muted-foreground">{dateStr}</p>
        </div>
        {streak > 0 && (
          <div className="flex items-center gap-1.5 rounded-xl border border-orange-500/30 bg-orange-500/10 px-3 py-1.5">
            <Flame className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">{streak}d streak</span>
          </div>
        )}
      </div>

      {/* Running timer callout */}
      {runningTimer && (
        <Link href="/time" className="flex items-center gap-3 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 hover:bg-blue-500/15 transition-colors">
          <Timer className="h-4 w-4 text-blue-500 shrink-0 animate-pulse" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-blue-700 dark:text-blue-400 truncate">{runningTimer.description ?? "Timer running"}</p>
            <p className="text-xs text-blue-600/70 dark:text-blue-400/70">
              Since {new Date(runningTimer.started_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-blue-500 shrink-0" />
        </Link>
      )}

      {/* Todos */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <CalendarCheck className="h-4 w-4 text-muted-foreground" />
            Tasks
          </h2>
          <Link href="/todos" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
            All todos <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        {overdue.length === 0 && dueToday.length === 0 && noDueDate.length === 0 ? (
          <div className="flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/5 px-4 py-3">
            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
            <span className="text-sm text-green-700 dark:text-green-400">You&apos;re all caught up!</span>
          </div>
        ) : (
          <TodayTodos
            initialTodos={allTodos}
            overdue={overdue}
            dueToday={dueToday}
            noDueDate={noDueDate}
          />
        )}
      </section>

      {/* Habits */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            Habits
            <span className="text-xs font-normal text-muted-foreground">{habitsDone}/{habitsTotal}</span>
          </h2>
          <Link href="/habits" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
            Details <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        <HabitChecker log={todayHabit} date={today} customHabits={allDefs} />
      </section>

      {/* Routine */}
      {routineTotal > 0 && (
        <Link href="/routine" className="block rounded-xl border border-border bg-card px-5 py-4 hover:border-foreground/20 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Morning Routine</h2>
            <span className="text-xs text-muted-foreground">{routineDone}/{routineTotal} · {routinePct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all ${routinePct === 100 ? "bg-green-500" : "bg-foreground"}`}
              style={{ width: `${routinePct}%` }}
            />
          </div>
        </Link>
      )}

      {/* Active Goals */}
      {activeGoals.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              Active Goals
            </h2>
            <Link href="/goals" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
              All goals <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {activeGoals.slice(0, 4).map(goal => (
              <div key={goal.id} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{goal.title}</p>
                  {goal.due_date && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Due {new Date(goal.due_date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-20 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full ${goal.progress >= 75 ? "bg-green-500" : goal.progress >= 40 ? "bg-blue-500" : "bg-amber-500"}`}
                      style={{ width: `${goal.progress}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums w-7 text-right">{goal.progress}%</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Wellness */}
      <section className="rounded-xl border border-border bg-card px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Wellness today</h2>
          <Link href="/wellness" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
            {todayWellness ? "Update" : "Log"} <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        {todayWellness ? (
          <div className="flex items-center gap-4 flex-wrap text-sm">
            {todayWellness.mood && (
              <div className="flex items-center gap-1.5">
                <Smile className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium">{todayWellness.mood}/5</span>
                <span className="text-xs text-muted-foreground">mood</span>
              </div>
            )}
            {todayWellness.sleep_hours && (
              <div className="flex items-center gap-1.5">
                <Moon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium">{todayWellness.sleep_hours}h</span>
                <span className="text-xs text-muted-foreground">sleep</span>
              </div>
            )}
            {todayWellness.water_glasses > 0 && (
              <div className="flex items-center gap-1.5">
                <Droplets className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium">{todayWellness.water_glasses}</span>
                <span className="text-xs text-muted-foreground">glasses</span>
              </div>
            )}
            {!todayWellness.mood && !todayWellness.sleep_hours && (
              <p className="text-xs text-muted-foreground">Partial log — add mood & sleep</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Not logged yet — how are you feeling?</p>
        )}
      </section>

      {/* Overdue callout at bottom for quick scan */}
      {overdue.length > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-orange-500/30 bg-orange-500/5 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0" />
          <p className="text-xs text-orange-700 dark:text-orange-400">
            <strong>{overdue.length} overdue task{overdue.length > 1 ? "s" : ""}</strong> — clear these first to keep your system clean.
          </p>
        </div>
      )}
    </div>
  )
}

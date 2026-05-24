import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { HabitChecker } from "@/components/habits/habit-checker"
import { ActivityCalendarWithSheet } from "@/components/dashboard/day-detail-sheet"
import {
  Briefcase, Users, FolderKanban, Flame, TrendingUp, TrendingDown,
  CheckCircle2, ListTodo, Target, Clock, ArrowRight,
} from "lucide-react"
import type { JobApplication, FreelanceClient, ProductTask, HabitLog, FinanceEntry, WeeklyReview } from "@/lib/types"

export const metadata = { title: "Dashboard" }

function calcStreak(logs: HabitLog[]): number {
  const sorted = [...logs].sort((a, b) => b.log_date.localeCompare(a.log_date))
  const today = new Date().toISOString().split("T")[0]
  let streak = 0
  let cursor = today
  for (const log of sorted) {
    if (log.log_date === cursor) {
      if (log.gym_done && log.english_done && log.diet_clean) streak++
      else break
      const d = new Date(cursor)
      d.setDate(d.getDate() - 1)
      cursor = d.toISOString().split("T")[0]
    } else break
  }
  return streak
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const today = new Date().toISOString().split("T")[0]
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]
  const sevenDaysAgo = new Date(now)
  sevenDaysAgo.setDate(now.getDate() - 7)
  const sevenAgo = sevenDaysAgo.toISOString().split("T")[0]

  const [
    { data: jobs },
    { data: clients },
    { data: tasks },
    { data: habitLogs },
    { data: financeEntries },
    { data: reviews },
    { data: noteDates },
    { data: todosPending },
    { data: goalStats },
  ] = await Promise.all([
    supabase.from("job_applications").select("*").eq("user_id", user!.id).order("applied_at", { ascending: false }),
    supabase.from("freelance_clients").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }),
    supabase.from("product_tasks").select("*").eq("user_id", user!.id).order("priority").order("created_at"),
    supabase.from("habit_logs").select("*").eq("user_id", user!.id).gte("log_date", monthStart).order("log_date", { ascending: false }),
    supabase.from("finance_entries").select("*").eq("user_id", user!.id).gte("entry_date", monthStart),
    supabase.from("weekly_reviews").select("*").eq("user_id", user!.id).order("week_start", { ascending: false }).limit(1),
    supabase.from("daily_notes").select("note_date").eq("user_id", user!.id).gte("note_date", monthStart),
    supabase.from("todos").select("id, done, due_date").eq("user_id", user!.id),
    supabase.from("goals").select("id, status").eq("user_id", user!.id),
  ])

  const allJobs: JobApplication[] = jobs ?? []
  const allClients: FreelanceClient[] = clients ?? []
  const allTasks: ProductTask[] = tasks ?? []
  const allLogs: HabitLog[] = habitLogs ?? []
  const allEntries: FinanceEntry[] = financeEntries ?? []
  const latestReview: WeeklyReview | null = reviews?.[0] ?? null

  const todayLog = allLogs.find((l) => l.log_date === today) ?? null
  const streak = calcStreak(allLogs)

  const weeklyApps = allJobs.filter((j) => j.applied_at >= sevenAgo).length
  const totalTasks = allTasks.length
  const doneTasks = allTasks.filter((t) => t.status === "done").length
  const sprintProgress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0
  const monthIncome = allEntries.filter((e) => e.type === "income").reduce((s, e) => s + e.amount, 0)
  const monthExpense = allEntries.filter((e) => e.type === "expense").reduce((s, e) => s + e.amount, 0)
  const activeWorkItems = allClients.filter((c) => c.status === "active")
  const pendingTodosCount = (todosPending ?? []).filter((t) => !t.done).length
  const overdueCount = (todosPending ?? []).filter((t) => !t.done && t.due_date && t.due_date < today).length
  const activeGoals = (goalStats ?? []).filter((g) => g.status === "active").length

  // Build calendar activity
  const noteSet = new Set((noteDates ?? []).map((n: { note_date: string }) => n.note_date))
  const habitMap = new Map(allLogs.map((l) => [l.log_date, l]))
  const financeByDate = new Map<string, FinanceEntry[]>()
  allEntries.forEach((e) => {
    const list = financeByDate.get(e.entry_date) ?? []
    list.push(e)
    financeByDate.set(e.entry_date, list)
  })

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const calendarActivity = Array.from({ length: daysInMonth }, (_, i) => {
    const day = String(i + 1).padStart(2, "0")
    const month = String(now.getMonth() + 1).padStart(2, "0")
    const date = `${now.getFullYear()}-${month}-${day}`
    const log = habitMap.get(date)
    const habitDone = !!(log?.gym_done && log?.english_done && log?.diet_clean)
    const habitPartial = !!log && !habitDone
    const fe = financeByDate.get(date)
    return {
      date,
      hasNote: noteSet.has(date),
      habitDone,
      habitPartial,
      hasFinance: !!fe?.length,
      hasTodo: false,
      habitDetails: log ? { gym_done: log.gym_done, english_done: log.english_done, diet_clean: log.diet_clean } : undefined,
      financeEntries: fe?.map((e) => ({ type: e.type, amount: e.amount, category: e.category, source: e.source })),
    }
  })

  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening"
  const dateStr = now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-start">
        <div className="flex-1">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-2xl font-semibold">{greeting}</h1>
            {streak > 0 && (
              <div className="flex items-center gap-1.5 rounded-xl border border-orange-500/30 bg-orange-500/10 px-3 py-1.5">
                <Flame className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">{streak} day streak</span>
              </div>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{dateStr}</p>
        </div>
      </div>

      {/* Primary stats — 4 key numbers */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Jobs this week", value: weeklyApps, href: "/jobs", icon: Briefcase, color: "text-blue-500" },
          { label: "Monthly income", value: `₹${(monthIncome / 1000).toFixed(0)}k`, href: "/finance", icon: TrendingUp, color: "text-green-500" },
          { label: "Sprint", value: `${sprintProgress}%`, href: "/projects", icon: FolderKanban, color: "text-purple-500" },
          { label: "Pending todos", value: pendingTodosCount, href: "/todos", icon: ListTodo, color: overdueCount > 0 ? "text-red-500" : "text-foreground" },
        ].map((s) => (
          <Link key={s.label} href={s.href} className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:border-foreground/20 transition-colors">
            <div className="rounded-lg bg-muted p-2">
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </div>
            <div>
              <div className="text-xl font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Main content: Habits + Calendar */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Today's habits */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <h2 className="font-medium text-sm">Today&apos;s habits</h2>
            </div>
            <Link href="/habits" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              Full view <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <HabitChecker log={todayLog} date={today} customHabits={[]} />
        </div>

        {/* Activity Calendar */}
        <div className="lg:col-span-3 rounded-xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-medium text-sm">
              {now.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
            </h2>
            <span className="text-xs text-muted-foreground">Click a day to see details</span>
          </div>
          <ActivityCalendarWithSheet
            activity={calendarActivity}
            year={now.getFullYear()}
            month={now.getMonth()}
          />
        </div>
      </div>

      {/* Secondary stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Active work", value: activeWorkItems.length, href: "/freelance", icon: Users },
          { label: "Active goals", value: activeGoals, href: "/goals", icon: Target },
          { label: "Monthly expenses", value: `₹${(monthExpense / 1000).toFixed(0)}k`, href: "/finance", icon: TrendingDown },
          { label: "Weekly review", value: latestReview ? "Done" : "Pending", href: "/review", icon: Clock },
        ].map((s) => (
          <Link key={s.label} href={s.href} className="group flex items-center gap-3 rounded-xl border border-border bg-card/50 p-4 hover:border-foreground/20 transition-colors hover:bg-card">
            <s.icon className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <div className="text-sm font-semibold">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Module summaries */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Jobs */}
        <Link href="/jobs" className="group rounded-xl border border-border bg-card p-4 hover:border-foreground/20 transition-colors">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-blue-500" />
              <h3 className="text-sm font-medium">Jobs</h3>
            </div>
            <span className="text-xs text-muted-foreground">{allJobs.length} total</span>
          </div>
          <div className="space-y-1.5">
            {allJobs.slice(0, 3).map((job) => (
              <div key={job.id} className="flex items-center justify-between text-xs">
                <span className="truncate font-medium">{job.company}</span>
                <span className="shrink-0 ml-2 capitalize text-muted-foreground rounded-full bg-muted px-2 py-0.5">{job.status}</span>
              </div>
            ))}
            {allJobs.length === 0 && <p className="text-xs text-muted-foreground">No applications yet</p>}
          </div>
        </Link>

        {/* Work pipeline */}
        <Link href="/freelance" className="group rounded-xl border border-border bg-card p-4 hover:border-foreground/20 transition-colors">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-green-500" />
              <h3 className="text-sm font-medium">Work Pipeline</h3>
            </div>
            <span className="text-xs text-muted-foreground">{activeWorkItems.length} active</span>
          </div>
          <div className="space-y-1.5">
            {activeWorkItems.slice(0, 3).map((c) => (
              <div key={c.id} className="flex items-center justify-between text-xs">
                <span className="truncate font-medium">{c.client_name}</span>
                <span className="shrink-0 ml-2 text-muted-foreground">
                  {c.amount_agreed ? `₹${(c.amount_agreed / 1000).toFixed(0)}k` : "—"}
                </span>
              </div>
            ))}
            {activeWorkItems.length === 0 && <p className="text-xs text-muted-foreground">No active work items</p>}
          </div>
        </Link>

        {/* Projects */}
        <Link href="/projects" className="group rounded-xl border border-border bg-card p-4 hover:border-foreground/20 transition-colors">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderKanban className="h-4 w-4 text-purple-500" />
              <h3 className="text-sm font-medium">Work Tasks</h3>
            </div>
            <span className="text-xs text-muted-foreground">{sprintProgress}% done</span>
          </div>
          <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-purple-500 transition-all" style={{ width: `${sprintProgress}%` }} />
          </div>
          <div className="space-y-1.5">
            {allTasks.filter((t) => t.status === "in_progress").slice(0, 3).map((task) => (
              <div key={task.id} className="text-xs truncate text-muted-foreground">· {task.title}</div>
            ))}
            {allTasks.filter((t) => t.status === "in_progress").length === 0 && (
              <p className="text-xs text-muted-foreground">Nothing in progress</p>
            )}
          </div>
        </Link>

        {/* Finance */}
        <Link href="/finance" className="group rounded-xl border border-border bg-card p-4 hover:border-foreground/20 transition-colors">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              <h3 className="text-sm font-medium">Finance</h3>
            </div>
            <span className="text-xs text-muted-foreground">this month</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Income</span>
              <span className="font-semibold text-green-600 dark:text-green-400">+₹{monthIncome.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Expenses</span>
              <span className="font-semibold">−₹{monthExpense.toLocaleString("en-IN")}</span>
            </div>
            <div className="border-t border-border pt-2 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Net</span>
              <span className={`font-bold ${monthIncome - monthExpense >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                {monthIncome - monthExpense >= 0 ? "+" : "−"}₹{Math.abs(monthIncome - monthExpense).toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </Link>

        {/* Weekly review */}
        <Link href="/review" className="group rounded-xl border border-border bg-card p-4 hover:border-foreground/20 transition-colors">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <h3 className="text-sm font-medium">Weekly Review</h3>
            </div>
            {latestReview?.energy_score && <span className="text-xs text-muted-foreground">⚡ {latestReview.energy_score}/10</span>}
          </div>
          {latestReview ? (
            <div className="space-y-1.5 text-xs text-muted-foreground">
              {latestReview.wins && <p className="line-clamp-2">{latestReview.wins}</p>}
              {latestReview.next_week_focus && <p className="line-clamp-2 font-medium text-foreground">{latestReview.next_week_focus}</p>}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No review this week yet</p>
          )}
        </Link>

        {/* Goals */}
        <Link href="/goals" className="group rounded-xl border border-border bg-card p-4 hover:border-foreground/20 transition-colors">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-rose-500" />
              <h3 className="text-sm font-medium">Goals</h3>
            </div>
            <span className="text-xs text-muted-foreground">{activeGoals} active</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {activeGoals > 0 ? `${activeGoals} goal${activeGoals > 1 ? "s" : ""} in progress` : "No active goals yet"}
          </p>
        </Link>
      </div>
    </div>
  )
}

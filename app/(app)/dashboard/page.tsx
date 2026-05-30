import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { HabitChecker } from "@/components/habits/habit-checker"
import { ActivityCalendarWithSheet } from "@/components/dashboard/day-detail-sheet"
import { NotificationPrompt } from "@/components/notifications/notification-prompt"
import { DashboardHero } from "@/components/dashboard/dashboard-hero"
import { WaveStatCard } from "@/components/dashboard/wave-stat-card"
import { WeekActivityChart } from "@/components/dashboard/week-activity-chart"
import { FinanceWaveChart } from "@/components/dashboard/finance-wave-chart"
import {
  Briefcase, Users, FolderKanban, TrendingUp, TrendingDown,
  CheckCircle2, ListTodo, Target, Clock, ArrowRight,
} from "lucide-react"
import type { HabitLog, FinanceEntry, WeeklyReview } from "@/lib/types"

type DashboardJob = { id: string; company: string; role: string; status: string; applied_at: string }
type DashboardClient = { id: string; client_name: string; status: string; amount_agreed: number | null }
type DashboardTask = { id: string; title: string; status: string; priority: number }

export const metadata = { title: "Dashboard" }

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

function calcHabitStreak(logs: HabitLog[], key: "gym_done" | "english_done" | "diet_clean"): number {
  const sorted = [...logs].sort((a, b) => b.log_date.localeCompare(a.log_date))
  const today = new Date().toISOString().split("T")[0]
  let streak = 0; let cursor = today
  for (const log of sorted) {
    if (log.log_date !== cursor) break
    if (log[key]) streak++
    else break
    const d = new Date(cursor); d.setDate(d.getDate() - 1); cursor = d.toISOString().split("T")[0]
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
    supabase.from("job_applications").select("id, company, role, status, applied_at").eq("user_id", user!.id).order("applied_at", { ascending: false }).limit(100),
    supabase.from("freelance_clients").select("id, client_name, status, amount_agreed").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(50),
    supabase.from("product_tasks").select("id, title, status, priority").eq("user_id", user!.id).order("priority").order("created_at").limit(200),
    supabase.from("habit_logs").select("*").eq("user_id", user!.id).gte("log_date", monthStart).order("log_date", { ascending: false }),
    supabase.from("finance_entries").select("*").eq("user_id", user!.id).gte("entry_date", monthStart),
    supabase.from("weekly_reviews").select("*").eq("user_id", user!.id).order("week_start", { ascending: false }).limit(1),
    supabase.from("daily_notes").select("note_date").eq("user_id", user!.id).gte("note_date", monthStart),
    supabase.from("todos").select("id, done, due_date").eq("user_id", user!.id),
    supabase.from("goals").select("id, status").eq("user_id", user!.id),
  ])

  const allJobs: DashboardJob[] = jobs ?? []
  const allClients: DashboardClient[] = clients ?? []
  const allTasks: DashboardTask[] = tasks ?? []
  const allLogs: HabitLog[] = habitLogs ?? []
  const allEntries: FinanceEntry[] = financeEntries ?? []
  const latestReview: WeeklyReview | null = reviews?.[0] ?? null

  const todayLog = allLogs.find((l) => l.log_date === today) ?? null
  const streak = calcStreak(allLogs)
  const habitStreaks = {
    gym: calcHabitStreak(allLogs, "gym_done"),
    english: calcHabitStreak(allLogs, "english_done"),
    diet: calcHabitStreak(allLogs, "diet_clean"),
  }

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

  // 7-day habit chart data
  const habitMap = new Map(allLogs.map((l) => [l.log_date, l]))
  const weekData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now); d.setDate(now.getDate() - (6 - i))
    const dateStr = d.toISOString().split("T")[0]
    const log = habitMap.get(dateStr)
    const label = d.toLocaleDateString("en-IN", { weekday: "short" })
    return {
      label,
      gym:     log?.gym_done     ? 1 : 0,
      english: log?.english_done ? 1 : 0,
      diet:    log?.diet_clean   ? 1 : 0,
      total:   (log?.gym_done ? 1 : 0) + (log?.english_done ? 1 : 0) + (log?.diet_clean ? 1 : 0),
    }
  })

  // Daily finance chart data for this month
  const financeByDate = new Map<string, { income: number; expense: number }>()
  allEntries.forEach((e) => {
    const existing = financeByDate.get(e.entry_date) ?? { income: 0, expense: 0 }
    if (e.type === "income") existing.income += e.amount
    else existing.expense += e.amount
    financeByDate.set(e.entry_date, existing)
  })
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const financeChartData = Array.from({ length: daysInMonth }, (_, i) => {
    const day = String(i + 1).padStart(2, "0")
    const month = String(now.getMonth() + 1).padStart(2, "0")
    const date = `${now.getFullYear()}-${month}-${day}`
    const { income = 0, expense = 0 } = financeByDate.get(date) ?? {}
    return { label: `${i + 1}`, income, expense }
  })

  // Calendar activity
  const noteSet = new Set((noteDates ?? []).map((n: { note_date: string }) => n.note_date))
  const financeByDateFull = new Map<string, FinanceEntry[]>()
  allEntries.forEach((e) => {
    const list = financeByDateFull.get(e.entry_date) ?? []
    list.push(e)
    financeByDateFull.set(e.entry_date, list)
  })
  const calendarActivity = Array.from({ length: daysInMonth }, (_, i) => {
    const day = String(i + 1).padStart(2, "0")
    const month = String(now.getMonth() + 1).padStart(2, "0")
    const date = `${now.getFullYear()}-${month}-${day}`
    const log = habitMap.get(date)
    const habitDone = !!(log?.gym_done && log?.english_done && log?.diet_clean)
    const habitPartial = !!log && !habitDone
    const fe = financeByDateFull.get(date)
    return {
      date, hasNote: noteSet.has(date), habitDone, habitPartial,
      hasFinance: !!fe?.length, hasTodo: false,
      habitDetails: log ? { gym_done: log.gym_done, english_done: log.english_done, diet_clean: log.diet_clean } : undefined,
      financeEntries: fe?.map((e) => ({ type: e.type, amount: e.amount, category: e.category, source: e.source })),
    }
  })

  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening"
  const dateStr = now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })

  return (
    <div className="space-y-6 p-4 md:p-6">
      <NotificationPrompt />

      {/* Animated hero */}
      <DashboardHero greeting={greeting} dateStr={dateStr} streak={streak} />

      {/* Animated stat cards with wave fill */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <WaveStatCard
          label="Jobs this week" value={weeklyApps} href="/jobs"
          iconNode={<Briefcase className="h-4 w-4 text-blue-500" />}
          fill="fill-blue-500/20"
          pct={Math.min(90, Math.max(10, weeklyApps * 15))} delay={0.05}
        />
        <WaveStatCard
          label="Monthly income" value={`₹${(monthIncome / 1000).toFixed(0)}k`} href="/finance"
          iconNode={<TrendingUp className="h-4 w-4 text-emerald-500" />}
          fill="fill-emerald-500/20"
          pct={Math.min(90, Math.max(10, monthIncome / 1000))} delay={0.1}
        />
        <WaveStatCard
          label="Sprint progress" value={`${sprintProgress}%`} href="/product"
          iconNode={<FolderKanban className="h-4 w-4 text-violet-500" />}
          fill="fill-violet-500/20"
          pct={Math.max(10, sprintProgress)} delay={0.15}
        />
        <WaveStatCard
          label={overdueCount > 0 ? `${overdueCount} overdue` : "Pending todos"} value={pendingTodosCount} href="/todos"
          iconNode={<ListTodo className={`h-4 w-4 ${overdueCount > 0 ? "text-red-500" : "text-amber-500"}`} />}
          fill={overdueCount > 0 ? "fill-red-500/20" : "fill-amber-500/20"}
          pct={Math.min(90, Math.max(10, pendingTodosCount * 8))} delay={0.2}
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <WeekActivityChart weekData={weekData} streaks={habitStreaks} />
        <FinanceWaveChart data={financeChartData} monthIncome={monthIncome} monthExpense={monthExpense} />
      </div>

      {/* Habits + Calendar */}
      <div className="grid gap-6 lg:grid-cols-5">
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
        <div className="lg:col-span-3 rounded-xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-medium text-sm">
              {now.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
            </h2>
            <span className="text-xs text-muted-foreground">Click a day to see details</span>
          </div>
          <ActivityCalendarWithSheet activity={calendarActivity} year={now.getFullYear()} month={now.getMonth()} />
        </div>
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Active work",      value: activeWorkItems.length, href: "/freelance", icon: Users },
          { label: "Active goals",     value: activeGoals,            href: "/goals",     icon: Target },
          { label: "Monthly expenses", value: `₹${(monthExpense / 1000).toFixed(0)}k`, href: "/finance", icon: TrendingDown },
          { label: "Weekly review",    value: latestReview ? "Done" : "Pending", href: "/review", icon: Clock },
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

      {/* Module cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/jobs" className="group rounded-xl border border-border bg-card p-4 hover:border-foreground/20 transition-colors">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2"><Briefcase className="h-4 w-4 text-blue-500" /><h3 className="text-sm font-medium">Jobs</h3></div>
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

        <Link href="/freelance" className="group rounded-xl border border-border bg-card p-4 hover:border-foreground/20 transition-colors">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2"><Users className="h-4 w-4 text-green-500" /><h3 className="text-sm font-medium">Work Pipeline</h3></div>
            <span className="text-xs text-muted-foreground">{activeWorkItems.length} active</span>
          </div>
          <div className="space-y-1.5">
            {activeWorkItems.slice(0, 3).map((c) => (
              <div key={c.id} className="flex items-center justify-between text-xs">
                <span className="truncate font-medium">{c.client_name}</span>
                <span className="shrink-0 ml-2 text-muted-foreground">{c.amount_agreed ? `₹${(c.amount_agreed / 1000).toFixed(0)}k` : "—"}</span>
              </div>
            ))}
            {activeWorkItems.length === 0 && <p className="text-xs text-muted-foreground">No active work items</p>}
          </div>
        </Link>

        <Link href="/projects" className="group rounded-xl border border-border bg-card p-4 hover:border-foreground/20 transition-colors">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2"><FolderKanban className="h-4 w-4 text-purple-500" /><h3 className="text-sm font-medium">Work Tasks</h3></div>
            <span className="text-xs text-muted-foreground">{sprintProgress}% done</span>
          </div>
          <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${sprintProgress}%` }} />
          </div>
          <div className="space-y-1.5">
            {allTasks.filter((t) => t.status === "in_progress").slice(0, 3).map((task) => (
              <div key={task.id} className="text-xs truncate text-muted-foreground">· {task.title}</div>
            ))}
            {allTasks.filter((t) => t.status === "in_progress").length === 0 && <p className="text-xs text-muted-foreground">Nothing in progress</p>}
          </div>
        </Link>

        <Link href="/finance" className="group rounded-xl border border-border bg-card p-4 hover:border-foreground/20 transition-colors">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-500" /><h3 className="text-sm font-medium">Finance</h3></div>
            <span className="text-xs text-muted-foreground">this month</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Income</span><span className="font-semibold text-green-600 dark:text-green-400">+₹{monthIncome.toLocaleString("en-IN")}</span></div>
            <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Expenses</span><span className="font-semibold">−₹{monthExpense.toLocaleString("en-IN")}</span></div>
            <div className="border-t border-border pt-2 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Net</span>
              <span className={`font-bold ${monthIncome - monthExpense >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                {monthIncome - monthExpense >= 0 ? "+" : "−"}₹{Math.abs(monthIncome - monthExpense).toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </Link>

        <Link href="/review" className="group rounded-xl border border-border bg-card p-4 hover:border-foreground/20 transition-colors">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-amber-500" /><h3 className="text-sm font-medium">Weekly Review</h3></div>
            {latestReview?.energy_score && <span className="text-xs text-muted-foreground">⚡ {latestReview.energy_score}/10</span>}
          </div>
          {latestReview ? (
            <div className="space-y-1.5 text-xs text-muted-foreground">
              {latestReview.wins && <p className="line-clamp-2">{latestReview.wins}</p>}
              {latestReview.next_week_focus && <p className="line-clamp-2 font-medium text-foreground">{latestReview.next_week_focus}</p>}
            </div>
          ) : <p className="text-xs text-muted-foreground">No review this week yet</p>}
        </Link>

        <Link href="/goals" className="group rounded-xl border border-border bg-card p-4 hover:border-foreground/20 transition-colors">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2"><Target className="h-4 w-4 text-rose-500" /><h3 className="text-sm font-medium">Goals</h3></div>
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

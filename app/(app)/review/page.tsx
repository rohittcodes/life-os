import { createClient } from "@/lib/supabase/server"

export const metadata = { title: "Weekly Review" }
import { ReviewForm } from "@/components/review/review-form"
import { CheckCircle2, ListTodo, Wallet, HeartPulse, Target } from "lucide-react"
import type { WeeklyReview, HabitLog, WellnessLog, FinanceEntry } from "@/lib/types"

function getThisSunday() {
  const d = new Date()
  const diff = d.getDate() - d.getDay()
  return new Date(d.setDate(diff)).toISOString().split("T")[0]
}

function getSaturday(sunday: string) {
  const d = new Date(sunday + "T00:00:00")
  d.setDate(d.getDate() + 6)
  return d.toISOString().split("T")[0]
}

export default async function ReviewPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const weekStart = getThisSunday()
  const weekEnd = getSaturday(weekStart)

  const [
    { data: reviews = [] },
    { data: habitLogs },
    { data: todos },
    { data: financeEntries },
    { data: wellnessLogs },
    { data: goals },
  ] = await Promise.all([
    supabase.from("weekly_reviews").select("*").eq("user_id", user!.id).order("week_start", { ascending: false }),
    supabase.from("habit_logs").select("*").eq("user_id", user!.id).gte("log_date", weekStart).lte("log_date", weekEnd),
    supabase.from("todos").select("done, created_at").eq("user_id", user!.id).gte("created_at", weekStart + "T00:00:00"),
    supabase.from("finance_entries").select("type, amount, category").eq("user_id", user!.id).gte("entry_date", weekStart).lte("entry_date", weekEnd),
    supabase.from("wellness_logs").select("mood, energy, sleep_hours").eq("user_id", user!.id).gte("log_date", weekStart).lte("log_date", weekEnd),
    supabase.from("goals").select("id, title, progress, status").eq("user_id", user!.id).eq("status", "active"),
  ])

  const allReviews = reviews ?? []
  const currentReview = allReviews.find((r: WeeklyReview) => r.week_start === weekStart) ?? null
  const pastReviews = allReviews.filter((r: WeeklyReview) => r.week_start !== weekStart)

  // Compute week stats
  const logs: HabitLog[] = habitLogs ?? []
  const gymDays = logs.filter(l => l.gym_done).length
  const englishDays = logs.filter(l => l.english_done).length
  const dietDays = logs.filter(l => l.diet_clean).length
  const fullDays = logs.filter(l => l.gym_done && l.english_done && l.diet_clean).length

  const allTodos = todos ?? []
  const completedTodos = allTodos.filter(t => t.done).length

  const entries: FinanceEntry[] = (financeEntries as FinanceEntry[]) ?? []
  const weekIncome = entries.filter(e => e.type === "income").reduce((s, e) => s + e.amount, 0)
  const weekExpense = entries.filter(e => e.type === "expense").reduce((s, e) => s + e.amount, 0)

  const wellness: WellnessLog[] = (wellnessLogs as WellnessLog[]) ?? []
  const avgMood = wellness.filter(w => w.mood).length > 0
    ? (wellness.filter(w => w.mood).reduce((s, w) => s + (w.mood ?? 0), 0) / wellness.filter(w => w.mood).length).toFixed(1)
    : null
  const avgSleep = wellness.filter(w => w.sleep_hours).length > 0
    ? (wellness.filter(w => w.sleep_hours).reduce((s, w) => s + (w.sleep_hours ?? 0), 0) / wellness.filter(w => w.sleep_hours).length).toFixed(1)
    : null

  const activeGoals = goals ?? []

  const weekLabel = new Date(weekStart + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "long" })

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Weekly Review</h1>
        <p className="text-sm text-muted-foreground">Reflect every Sunday to compound your growth</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Data context panel */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">This week · {weekLabel}</h2>

          {/* Habits */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> Habits
            </div>
            {logs.length === 0 ? (
              <p className="text-xs text-muted-foreground">No habit data this week</p>
            ) : (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Full days</span>
                  <span className="font-medium">{fullDays}/7</span>
                </div>
                {[
                  { label: "Gym", days: gymDays },
                  { label: "English", days: englishDays },
                  { label: "Diet", days: dietDays },
                ].map(h => (
                  <div key={h.label} className="flex items-center gap-2 text-xs">
                    <span className="w-16 text-muted-foreground">{h.label}</span>
                    <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-foreground rounded-full" style={{ width: `${(h.days / 7) * 100}%` }} />
                    </div>
                    <span className="w-6 text-right text-muted-foreground">{h.days}d</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Todos */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-xs font-medium mb-2">
              <ListTodo className="h-3.5 w-3.5 text-blue-500" /> Tasks
            </div>
            <div className="flex gap-4 text-xs">
              <div>
                <p className="text-xl font-bold">{completedTodos}</p>
                <p className="text-muted-foreground">completed</p>
              </div>
              <div>
                <p className="text-xl font-bold">{allTodos.length}</p>
                <p className="text-muted-foreground">created</p>
              </div>
            </div>
          </div>

          {/* Finance */}
          {entries.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-xs font-medium mb-2">
                <Wallet className="h-3.5 w-3.5 text-emerald-500" /> Finance
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Income</span>
                  <span className="text-green-600 dark:text-green-400 font-medium">+₹{weekIncome.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Expenses</span>
                  <span className="font-medium">−₹{weekExpense.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-1 mt-1">
                  <span className="text-muted-foreground">Net</span>
                  <span className={`font-bold ${weekIncome - weekExpense >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                    {weekIncome - weekExpense >= 0 ? "+" : "−"}₹{Math.abs(weekIncome - weekExpense).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Wellness */}
          {wellness.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-xs font-medium mb-2">
                <HeartPulse className="h-3.5 w-3.5 text-rose-500" /> Wellness avg
              </div>
              <div className="flex gap-4 text-xs">
                {avgMood && <div><p className="text-xl font-bold">{avgMood}<span className="text-sm text-muted-foreground">/5</span></p><p className="text-muted-foreground">mood</p></div>}
                {avgSleep && <div><p className="text-xl font-bold">{avgSleep}<span className="text-sm text-muted-foreground">h</span></p><p className="text-muted-foreground">sleep</p></div>}
              </div>
            </div>
          )}

          {/* Goals */}
          {activeGoals.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-xs font-medium mb-2">
                <Target className="h-3.5 w-3.5 text-purple-500" /> Active goals
              </div>
              <div className="space-y-1.5">
                {activeGoals.slice(0, 4).map((g: { id: string; title: string; progress: number }) => (
                  <div key={g.id} className="flex items-center gap-2 text-xs">
                    <span className="flex-1 truncate text-muted-foreground">{g.title}</span>
                    <span className="font-medium shrink-0">{g.progress}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Review form */}
        <div className="lg:col-span-3">
          <ReviewForm existing={currentReview} weekStart={weekStart} />
        </div>
      </div>

      {pastReviews.length > 0 && (
        <div className="mt-8 space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground">Past reviews</h2>
          {pastReviews.map((review: WeeklyReview) => (
            <div key={review.id} className="rounded-xl border border-border bg-card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">
                  Week of {new Date(review.week_start + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                </h3>
                {review.energy_score && <span className="text-xs text-muted-foreground">⚡ {review.energy_score}/10</span>}
              </div>
              {review.wins && <div><span className="text-xs font-medium text-muted-foreground">Wins</span><p className="mt-0.5 text-sm">{review.wins}</p></div>}
              {review.next_week_focus && <div><span className="text-xs font-medium text-muted-foreground">Focus</span><p className="mt-0.5 text-sm">{review.next_week_focus}</p></div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

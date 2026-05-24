import { createClient } from "@/lib/supabase/server"

export const metadata = { title: "Morning Routine" }
import { RoutineChecklist } from "@/components/routine/routine-checklist"
import type { RoutineItem, RoutineLog } from "@/lib/types"

export default async function RoutinePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const today = new Date().toISOString().split("T")[0]
  const sevenAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]

  const [{ data: items }, { data: logs }] = await Promise.all([
    supabase.from("routine_items").select("*").eq("user_id", user!.id).eq("active", true).order("sort_order").order("created_at"),
    supabase.from("routine_logs").select("*").eq("user_id", user!.id).gte("log_date", sevenAgo).order("log_date", { ascending: false }),
  ])

  const allItems: RoutineItem[] = items ?? []
  const allLogs: RoutineLog[] = logs ?? []
  const todayLog = allLogs.find((l) => l.log_date === today) ?? null

  // Streak: consecutive days with 100% completion
  let streak = 0
  const sortedLogs = [...allLogs].sort((a, b) => b.log_date.localeCompare(a.log_date))
  let cursor = today
  for (const log of sortedLogs) {
    if (log.log_date !== cursor) break
    const pct = allItems.length > 0 ? log.completed_item_ids.length / allItems.length : 0
    if (pct >= 0.8) streak++
    else break
    const d = new Date(cursor)
    d.setDate(d.getDate() - 1)
    cursor = d.toISOString().split("T")[0]
  }

  const todayPct = todayLog && allItems.length > 0
    ? Math.round((todayLog.completed_item_ids.length / allItems.length) * 100)
    : 0

  const dateLabel = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Morning Routine</h1>
          <p className="text-sm text-muted-foreground">{dateLabel}</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold">{streak}</div>
          <div className="text-xs text-muted-foreground">day streak 🔥</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Today", value: `${todayPct}%` },
          { label: "Items", value: allItems.length },
          { label: "7-day avg", value: allLogs.length > 0 ? `${Math.round(allLogs.reduce((s, l) => s + (allItems.length > 0 ? l.completed_item_ids.length / allItems.length * 100 : 0), 0) / allLogs.length)}%` : "—" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4">
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      <RoutineChecklist items={allItems} log={todayLog} date={today} />
    </div>
  )
}

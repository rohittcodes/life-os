import { createClient } from "@/lib/supabase/server"

export const metadata = { title: "Time Tracker" }
import { TimerControl } from "@/components/time/timer-control"
import { TimeChart } from "@/components/time/time-chart"
import { SessionList } from "@/components/time/session-list"
import { ScreenTimeSection } from "@/components/time/screen-time-section"
import type { TimeEntry, Project } from "@/lib/types"

function formatDuration(minutes: number | null): string {
  if (!minutes) return "—"
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export default async function TimePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const sevenAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [{ data: entries }, { data: projects }, { data: running }] = await Promise.all([
    supabase.from("time_entries").select("*").eq("user_id", user!.id)
      .gte("started_at", sevenAgo).order("started_at", { ascending: false }),
    supabase.from("projects").select("*").eq("user_id", user!.id).eq("status", "active"),
    supabase.from("time_entries").select("*").eq("user_id", user!.id).is("ended_at", null).limit(1),
  ])

  const allEntries: TimeEntry[] = entries ?? []
  const allProjects: Project[] = projects ?? []
  const runningEntry: TimeEntry | null = running?.[0] ?? null

  const projectMap = new Map(allProjects.map((p) => [p.id, p]))
  const today = new Date().toISOString().split("T")[0]
  const todayMinutes = allEntries
    .filter((e) => e.started_at.startsWith(today) && e.duration_minutes)
    .reduce((s, e) => s + (e.duration_minutes ?? 0), 0)
  const weekMinutes = allEntries
    .filter((e) => e.duration_minutes)
    .reduce((s, e) => s + (e.duration_minutes ?? 0), 0)

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Time Tracker</h1>
        <p className="text-sm text-muted-foreground">Track focus sessions across projects</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Today", value: formatDuration(todayMinutes) },
          { label: "This week", value: formatDuration(weekMinutes) },
          { label: "Sessions (7d)", value: allEntries.filter((e) => e.duration_minutes).length },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4">
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      <TimerControl projects={allProjects} running={runningEntry} />

      <TimeChart entries={allEntries} projects={allProjects} />

      {/* Recent sessions with search + filter */}
      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Recent sessions</h2>
        <SessionList entries={allEntries} projects={allProjects} />
      </div>
      <div className="border-t border-border/50 pt-6">
        <ScreenTimeSection />
      </div>
    </div>
  )
}

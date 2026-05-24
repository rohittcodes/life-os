import { createClient } from "@/lib/supabase/server"

export const metadata = { title: "Wellness" }
import { WellnessForm } from "@/components/wellness/wellness-form"
import { WellnessChart } from "@/components/wellness/wellness-chart"
import { Smile, Moon, Droplets, Activity } from "lucide-react"
import type { WellnessLog } from "@/lib/types"

const moodLabel = ["", "Awful", "Bad", "Okay", "Good", "Great"]
const energyLabel = ["", "Drained", "Tired", "Normal", "Energized", "Fired up"]

export default async function WellnessPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const today = new Date().toISOString().split("T")[0]
  const thirtyAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]

  const { data: logs = [] } = await supabase
    .from("wellness_logs")
    .select("*")
    .eq("user_id", user!.id)
    .gte("log_date", thirtyAgo)
    .order("log_date", { ascending: false })

  const allLogs: WellnessLog[] = logs ?? []
  const todayLog = allLogs.find((l) => l.log_date === today) ?? null

  const logsWithMood = allLogs.filter((l) => l.mood)
  const avgMood = logsWithMood.length > 0
    ? (logsWithMood.reduce((s, l) => s + (l.mood ?? 0), 0) / logsWithMood.length).toFixed(1)
    : null
  const avgSleep = allLogs.filter((l) => l.sleep_hours).length > 0
    ? (allLogs.filter((l) => l.sleep_hours).reduce((s, l) => s + (l.sleep_hours ?? 0), 0) / allLogs.filter((l) => l.sleep_hours).length).toFixed(1)
    : null
  const avgWater = allLogs.length > 0
    ? Math.round(allLogs.reduce((s, l) => s + l.water_glasses, 0) / allLogs.length)
    : null

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Wellness</h1>
        <p className="text-sm text-muted-foreground">Track mood, sleep, hydration, and energy daily</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: "Avg mood (30d)", icon: Smile,
            value: avgMood ? `${moodLabel[Math.round(Number(avgMood))]} (${avgMood}/5)` : "—",
          },
          { label: "Avg sleep (30d)", icon: Moon, value: avgSleep ? `${avgSleep}h` : "—" },
          { label: "Avg water (30d)", icon: Droplets, value: avgWater !== null ? `${avgWater} glasses` : "—" },
          { label: "Days logged", icon: Activity, value: allLogs.length },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4">
            <s.icon className="h-4 w-4 text-muted-foreground mb-2" />
            <div className="text-xl font-bold">{s.value}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      <div>
        <h2 className="mb-4 font-medium">
          {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
        </h2>
        <WellnessForm date={today} existing={todayLog} />
      </div>

      {allLogs.length > 1 && <WellnessChart logs={allLogs} />}

      {allLogs.length > 1 && (
        <div>
          <h2 className="mb-3 font-medium text-sm text-muted-foreground">Recent logs</h2>
          <div className="space-y-2">
            {allLogs.slice(1, 14).map((log) => (
              <div key={log.id} className="flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3 text-sm">
                <span className="w-24 shrink-0 text-xs text-muted-foreground">
                  {new Date(log.log_date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </span>
                {log.mood && (
                  <span className="text-xs text-muted-foreground">
                    Mood {log.mood}/5 · {moodLabel[log.mood]}
                  </span>
                )}
                {log.energy && (
                  <span className="text-xs text-muted-foreground">
                    Energy {log.energy}/5
                  </span>
                )}
                {log.sleep_hours && <span className="text-xs text-muted-foreground">{log.sleep_hours}h sleep</span>}
                {log.water_glasses > 0 && <span className="text-xs text-muted-foreground">{log.water_glasses} glasses</span>}
                {log.steps && <span className="text-xs text-muted-foreground">{log.steps.toLocaleString()} steps</span>}
                {log.notes && <span className="flex-1 truncate text-xs text-muted-foreground">{log.notes}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

import { createClient } from "@/lib/supabase/server"
import { JobForm } from "@/components/jobs/job-form"
import { JobsBoard } from "@/components/jobs/jobs-board"
import type { JobApplication } from "@/lib/types"

export default async function JobsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: jobs = [] } = await supabase
    .from("job_applications")
    .select("*")
    .eq("user_id", user!.id)
    .order("applied_at", { ascending: false })

  const total = jobs?.length ?? 0
  const responded = jobs?.filter((j: JobApplication) => !["applied", "ghosted"].includes(j.status)).length ?? 0
  const interviews = jobs?.filter((j: JobApplication) => ["interview", "offer"].includes(j.status)).length ?? 0
  const responseRate = total > 0 ? Math.round((responded / total) * 100) : 0

  const thisWeek = new Date()
  thisWeek.setDate(thisWeek.getDate() - 7)
  const weeklyCount = jobs?.filter((j: JobApplication) => new Date(j.applied_at) >= thisWeek).length ?? 0

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Job Hunt</h1>
          <p className="text-sm text-muted-foreground">Track every application to offer or rejection</p>
        </div>
        <JobForm />
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total applied", value: total },
          { label: "This week", value: weeklyCount },
          { label: "Response rate", value: `${responseRate}%` },
          { label: "Interviews", value: interviews },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4">
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      <JobsBoard jobs={jobs ?? []} />
    </div>
  )
}

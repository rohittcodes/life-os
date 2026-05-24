"use client"

import { useTransition } from "react"
import { updateJobStatus, deleteJob } from "@/app/(app)/jobs/actions"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X, AlertTriangle } from "lucide-react"
import type { JobApplication, JobStatus } from "@/lib/types"

const columns: { status: JobStatus; label: string; color: string }[] = [
  { status: "applied", label: "Applied", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  { status: "screen", label: "Screen", color: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400" },
  { status: "interview", label: "Interview", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
  { status: "offer", label: "Offer", color: "bg-green-500/10 text-green-600 dark:text-green-400" },
  { status: "rejected", label: "Rejected", color: "bg-red-500/10 text-red-600 dark:text-red-400" },
  { status: "ghosted", label: "Ghosted", color: "bg-muted text-muted-foreground" },
]

function isOverdue(dateStr: string | null) {
  if (!dateStr) return false
  return new Date(dateStr) < new Date(new Date().toDateString())
}

export function JobsBoard({ jobs }: { jobs: JobApplication[] }) {
  const [, startTransition] = useTransition()

  const jobsByStatus = Object.fromEntries(
    columns.map((c) => [c.status, jobs.filter((j) => j.status === c.status)])
  )

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
      {columns.map((col) => (
        <div key={col.status} className="space-y-2">
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${col.color}`}>
              {col.label}
            </span>
            <span className="text-xs text-muted-foreground">{jobsByStatus[col.status]?.length}</span>
          </div>
          <div className="space-y-2">
            {jobsByStatus[col.status]?.map((job) => (
              <div
                key={job.id}
                className="group rounded-xl border border-border bg-card p-3 text-sm hover:border-foreground/20 transition-colors"
              >
                <div className="font-medium leading-snug">{job.company}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{job.role}</div>
                {job.salary_lpa && (
                  <div className="mt-1 text-xs text-muted-foreground">₹{job.salary_lpa}L</div>
                )}
                {job.next_action_date && (
                  <div className={`mt-1.5 flex items-center gap-1 text-xs ${isOverdue(job.next_action_date) ? "text-red-500" : "text-muted-foreground"}`}>
                    {isOverdue(job.next_action_date) && <AlertTriangle className="h-3 w-3" />}
                    {new Date(job.next_action_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </div>
                )}
                <div className="mt-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <Select
                    value={job.status}
                    onValueChange={(v) => startTransition(() => updateJobStatus(job.id, v))}
                  >
                    <SelectTrigger className="h-6 flex-1 text-xs px-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {columns.map((c) => (
                        <SelectItem key={c.status} value={c.status}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <button
                    onClick={() => startTransition(() => deleteJob(job.id))}
                    className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

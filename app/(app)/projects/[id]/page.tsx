import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ProjectBoard } from "@/components/projects/project-board"
import type { Project, ProductTask } from "@/lib/types"

interface Props { params: Promise<{ id: string }> }

export default async function ProjectPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: project }, { data: tasks }] = await Promise.all([
    supabase.from("projects").select("*").eq("id", id).eq("user_id", user!.id).single(),
    supabase.from("product_tasks").select("*").eq("project_id", id).eq("user_id", user!.id).order("priority").order("created_at"),
  ])

  if (!project) notFound()

  const allTasks: ProductTask[] = tasks ?? []
  const total = allTasks.length
  const done = allTasks.filter((t) => t.status === "done").length
  const inProgress = allTasks.filter((t) => t.status === "in_progress").length
  const blocked = allTasks.filter((t) => t.status === "blocked").length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  const milestones = [...new Set(allTasks.map((t) => t.milestone).filter(Boolean))] as string[]
  if (!milestones.includes("Backlog")) milestones.push("Backlog")

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-4">
        <span
          className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl shrink-0"
          style={{ backgroundColor: (project as Project).color + "20" }}
        >
          {(project as Project).emoji}
        </span>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-semibold">{(project as Project).name}</h1>
          {(project as Project).description && (
            <p className="text-sm text-muted-foreground">{(project as Project).description}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="text-2xl font-bold" style={{ color: (project as Project).color }}>{pct}%</div>
          <div className="text-xs text-muted-foreground">{done}/{total} done</div>
        </div>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: (project as Project).color }}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total", value: total },
          { label: "In progress", value: inProgress },
          { label: "Blocked", value: blocked, warn: blocked > 0 },
          { label: "Completed", value: done },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border bg-card p-4 ${s.warn ? "border-red-500/30" : "border-border"}`}>
            <div className={`text-2xl font-bold ${s.warn ? "text-red-500" : ""}`}>{s.value}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      <ProjectBoard
        project={project as Project}
        tasks={allTasks}
        milestones={milestones}
      />
    </div>
  )
}

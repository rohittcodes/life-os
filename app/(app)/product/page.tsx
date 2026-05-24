import { createClient } from "@/lib/supabase/server"
import { TaskForm } from "@/components/product/task-form"
import { SprintBoard } from "@/components/product/sprint-board"
import type { ProductTask } from "@/lib/types"

export default async function ProductPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: tasks = [] } = await supabase
    .from("product_tasks")
    .select("*")
    .eq("user_id", user!.id)
    .order("priority")
    .order("created_at")

  const allTasks = tasks ?? []
  const total = allTasks.length
  const done = allTasks.filter((t: ProductTask) => t.status === "done").length
  const inProgress = allTasks.filter((t: ProductTask) => t.status === "in_progress").length
  const blocked = allTasks.filter((t: ProductTask) => t.status === "blocked").length
  const overallProgress = total > 0 ? Math.round((done / total) * 100) : 0

  // Dynamic milestones from actual task data
  const activeMilestones = [...new Set(allTasks.map((t: ProductTask) => t.milestone).filter(Boolean))] as string[]
  if (!activeMilestones.includes("Backlog")) activeMilestones.push("Backlog")

  return (
    <div className="space-y-8 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Projects</h1>
          <p className="text-sm text-muted-foreground">Sprint board — build and ship your ideas</p>
        </div>
        <TaskForm />
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total tasks", value: total },
          { label: "In progress", value: inProgress },
          { label: "Blocked", value: blocked, warn: blocked > 0 },
          { label: "Overall progress", value: `${overallProgress}%` },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border bg-card p-4 ${s.warn ? "border-red-500/30" : "border-border"}`}>
            <div className={`text-2xl font-bold ${s.warn ? "text-red-500" : ""}`}>{s.value}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="space-y-10">
        {activeMilestones.length > 0 ? (
          activeMilestones.map((m) => (
            <SprintBoard key={m} tasks={allTasks} milestone={m} />
          ))
        ) : (
          <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
            No tasks yet — add your first sprint task
          </div>
        )}
      </div>
    </div>
  )
}

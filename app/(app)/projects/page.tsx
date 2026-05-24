import Link from "next/link"

export const metadata = { title: "Projects" }
import { createClient } from "@/lib/supabase/server"
import { ProjectForm } from "@/components/projects/project-form"
import type { Project, ProductTask } from "@/lib/types"

const statusBadge: Record<string, string> = {
  active: "bg-green-500/10 text-green-600 dark:text-green-400",
  on_hold: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  completed: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  archived: "bg-muted text-muted-foreground",
}

export default async function ProjectsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: projects }, { data: tasks }] = await Promise.all([
    supabase.from("projects").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }),
    supabase.from("product_tasks").select("id, project_id, status").eq("user_id", user!.id),
  ])

  const allProjects: Project[] = projects ?? []
  const allTasks = (tasks ?? []) as Array<{ id: string; status: string; project_id: string | null }>

  const active = allProjects.filter((p) => p.status === "active")
  const other = allProjects.filter((p) => p.status !== "active")

  function getStats(projectId: string) {
    const t = allTasks.filter((t) => t.project_id === projectId)
    const done = t.filter((t) => t.status === "done").length
    return { total: t.length, done, pct: t.length > 0 ? Math.round((done / t.length) * 100) : 0 }
  }

  return (
    <div className="space-y-8 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Projects</h1>
          <p className="text-sm text-muted-foreground">
            {active.length} active · {other.length} other
          </p>
        </div>
        <ProjectForm />
      </div>

      {allProjects.length === 0 && (
        <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
          No projects yet — create your first one
        </div>
      )}

      {active.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {active.map((project) => {
            const stats = getStats(project.id)
            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="group rounded-xl border border-border bg-card p-5 hover:border-foreground/20 transition-all hover:shadow-sm"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span
                      className="flex h-10 w-10 items-center justify-center rounded-xl text-xl"
                      style={{ backgroundColor: project.color + "20" }}
                    >
                      {project.emoji}
                    </span>
                    <div>
                      <h3 className="font-semibold text-sm leading-tight">{project.name}</h3>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${statusBadge[project.status]}`}>
                        {project.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                </div>

                {project.description && (
                  <p className="text-xs text-muted-foreground mb-4 line-clamp-2">{project.description}</p>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{stats.done}/{stats.total} tasks</span>
                    <span className="font-medium" style={{ color: project.color }}>{stats.pct}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${stats.pct}%`, backgroundColor: project.color }}
                    />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {other.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">Other projects</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {other.map((project) => {
              const stats = getStats(project.id)
              return (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card/50 p-4 opacity-60 hover:opacity-100 transition-opacity"
                >
                  <span className="text-xl">{project.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{project.name}</p>
                    <p className="text-xs text-muted-foreground">{stats.done}/{stats.total} tasks · {project.status.replace("_", " ")}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

"use client"

import { useTransition, useRef, useState } from "react"
import { addTask, updateTaskStatus, deleteTask } from "@/app/(app)/projects/actions"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X } from "lucide-react"
import type { Project, ProductTask } from "@/lib/types"

const STATUS_COLS = [
  { key: "todo", label: "To Do", color: "bg-muted" },
  { key: "in_progress", label: "In Progress", color: "bg-blue-500/10" },
  { key: "blocked", label: "Blocked", color: "bg-red-500/10" },
  { key: "done", label: "Done", color: "bg-green-500/10" },
] as const

const PRIORITY_LABEL = { 1: "P1", 2: "P2", 3: "P3" }
const PRIORITY_COLOR = { 1: "text-red-500", 2: "text-yellow-500", 3: "text-green-500" }

interface Props {
  project: Project
  tasks: ProductTask[]
  milestones: string[]
}

export function ProjectBoard({ project, tasks, milestones }: Props) {
  const [, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)
  const [milestone, setMilestone] = useState("none")
  const [priority, setPriority] = useState("2")
  const milestoneOptions = Array.from(new Set([...milestones, "Backlog"].filter(Boolean)))

  function handleAddTask(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set("milestone", milestone === "none" ? "" : milestone)
    fd.set("priority", priority)
    formRef.current?.reset()
    startTransition(() => addTask(project.id, fd))
  }

  return (
    <div className="space-y-8">
      <form ref={formRef} onSubmit={handleAddTask} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 sm:flex-row">
        <input
          name="title"
          required
          placeholder="Add a task…"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground min-w-0"
        />
        <div className="flex gap-2 flex-wrap sm:flex-nowrap">
          <Select value={milestone} onValueChange={setMilestone}>
            <SelectTrigger className="h-8 flex-1 sm:w-36 sm:flex-none text-xs">
              <SelectValue placeholder="Milestone" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No milestone</SelectItem>
              {milestoneOptions.map((m) => <SelectItem key={`milestone-${m}`} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="h-8 w-28 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">P1 — Critical</SelectItem>
              <SelectItem value="2">P2 — Normal</SelectItem>
              <SelectItem value="3">P3 — Low</SelectItem>
            </SelectContent>
          </Select>
          <button
            type="submit"
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-colors hover:opacity-90 shrink-0"
            style={{ backgroundColor: project.color }}
          >
            Add
          </button>
        </div>
      </form>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {STATUS_COLS.map(({ key, label, color }) => {
          const colTasks = tasks.filter((t) => t.status === key)
          return (
            <div key={key} className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</h3>
                <span className="text-xs text-muted-foreground">{colTasks.length}</span>
              </div>
              <div className={`min-h-24 rounded-xl p-2 space-y-2 ${color}`}>
                {colTasks.map((task) => (
                  <div key={task.id} className="group rounded-lg border border-border bg-card p-3 shadow-xs">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-medium leading-snug flex-1">{task.title}</p>
                      <button
                        onClick={() => startTransition(() => deleteTask(task.id, project.id))}
                        className="shrink-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {task.milestone && (
                      <p className="mt-1 text-xs text-muted-foreground">{task.milestone}</p>
                    )}
                    <div className="mt-2 flex items-center justify-between">
                      <span className={`text-xs font-medium ${PRIORITY_COLOR[task.priority as 1|2|3]}`}>
                        {PRIORITY_LABEL[task.priority as 1|2|3]}
                      </span>
                      <div className="flex flex-wrap gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {STATUS_COLS.filter((s) => s.key !== key).map((s) => (
                          <button
                            key={s.key}
                            onClick={() => startTransition(() => updateTaskStatus(task.id, s.key, project.id))}
                            className="rounded px-1.5 py-0.5 text-xs border border-border hover:bg-muted transition-colors"
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

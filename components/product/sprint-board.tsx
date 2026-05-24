"use client"

import { useTransition } from "react"
import { updateTaskStatus, deleteTask } from "@/app/(app)/product/actions"
import type { ProductTask, TaskStatus } from "@/lib/types"

const columns: { status: TaskStatus; label: string; color: string }[] = [
  { status: "todo", label: "To do", color: "bg-muted text-muted-foreground" },
  { status: "in_progress", label: "In progress", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  { status: "blocked", label: "Blocked", color: "bg-red-500/10 text-red-600 dark:text-red-400" },
  { status: "done", label: "Done", color: "bg-green-500/10 text-green-600 dark:text-green-400" },
]

const priorityLabel: Record<number, string> = { 1: "P1", 2: "P2", 3: "P3" }
const priorityColor: Record<number, string> = {
  1: "text-red-500",
  2: "text-yellow-500",
  3: "text-muted-foreground",
}

interface SprintBoardProps {
  tasks: ProductTask[]
  milestone: string
}

export function SprintBoard({ tasks, milestone }: SprintBoardProps) {
  const [, startTransition] = useTransition()
  const filtered = tasks.filter((t) => t.milestone === milestone)
  const done = filtered.filter((t) => t.status === "done").length
  const progress = filtered.length > 0 ? Math.round((done / filtered.length) * 100) : 0

  function handleStatusChange(id: string, status: string) {
    startTransition(() => updateTaskStatus(id, status))
  }

  function handleDelete(id: string) {
    startTransition(() => deleteTask(id))
  }

  if (filtered.length === 0) return null

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold">{milestone}</h2>
        <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-foreground transition-all" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-xs text-muted-foreground shrink-0">{done}/{filtered.length}</span>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {columns.map((col) => {
          const colTasks = filtered.filter((t) => t.status === col.status)
          return (
            <div key={col.status} className="space-y-2">
              <div className="flex items-center gap-1.5">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${col.color}`}>{col.label}</span>
                <span className="text-xs text-muted-foreground">{colTasks.length}</span>
              </div>
              {colTasks.map((task) => (
                <div key={task.id} className="group rounded-xl border border-border bg-card p-3 text-sm hover:border-foreground/20 transition-colors">
                  <div className="flex items-start justify-between gap-1">
                    <span className="font-medium leading-snug">{task.title}</span>
                    <span className={`shrink-0 text-xs font-medium ${priorityColor[task.priority]}`}>
                      {priorityLabel[task.priority]}
                    </span>
                  </div>
                  {task.due_date && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      {new Date(task.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </div>
                  )}
                  <div className="mt-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <select
                      value={task.status}
                      onChange={(e) => handleStatusChange(task.id, e.target.value)}
                      className="flex-1 rounded border border-border bg-background px-1 py-0.5 text-xs focus:outline-none"
                    >
                      {columns.map((c) => <option key={c.status} value={c.status}>{c.label}</option>)}
                    </select>
                    <button
                      onClick={() => handleDelete(task.id)}
                      className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <svg className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

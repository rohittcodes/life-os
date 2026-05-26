"use client"

import { useTransition, useRef, useState } from "react"
import { addTask, updateTaskStatus, deleteTask, addStep, toggleStep, deleteStep } from "@/app/(app)/projects/actions"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X, ChevronDown, ChevronRight, Plus } from "lucide-react"
import type { Project, ProductTask, TaskStep } from "@/lib/types"

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
  steps: TaskStep[]
}

function TaskCard({
  task,
  project,
  steps,
}: {
  task: ProductTask
  project: Project
  steps: TaskStep[]
}) {
  const [, startTransition] = useTransition()
  const [expanded, setExpanded] = useState(false)
  const stepFormRef = useRef<HTMLFormElement>(null)
  const taskSteps = steps.filter((s) => s.task_id === task.id)
  const doneSteps = taskSteps.filter((s) => s.done).length

  function handleAddStep(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    stepFormRef.current?.reset()
    startTransition(() => addStep(task.id, project.id, fd))
  }

  return (
    <div className="group rounded-lg border border-border bg-card shadow-xs">
      {/* Card header */}
      <div className="p-3">
        <div className="flex items-start gap-1.5">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded
              ? <ChevronDown className="h-3.5 w-3.5" />
              : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
          <p
            className="flex-1 text-xs font-medium leading-snug cursor-pointer"
            onClick={() => setExpanded((v) => !v)}
          >
            {task.title}
          </p>
          <button
            onClick={() => startTransition(() => deleteTask(task.id, project.id))}
            className="shrink-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {task.milestone && (
          <p className="mt-1 ml-5 text-xs text-muted-foreground">{task.milestone}</p>
        )}

        <div className="mt-2 ml-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium ${PRIORITY_COLOR[task.priority as 1|2|3]}`}>
              {PRIORITY_LABEL[task.priority as 1|2|3]}
            </span>
            {taskSteps.length > 0 && (
              <span className="text-xs text-muted-foreground tabular-nums">
                {doneSteps}/{taskSteps.length} steps
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {STATUS_COLS.filter((s) => s.key !== task.status).map((s) => (
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

        {/* Step progress bar — shown when steps exist and collapsed */}
        {!expanded && taskSteps.length > 0 && (
          <div className="mt-2 ml-5 h-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-foreground/40 transition-all"
              style={{ width: `${Math.round((doneSteps / taskSteps.length) * 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* Expanded sub-steps */}
      {expanded && (
        <div className="border-t border-border px-3 pb-3 pt-2 ml-5 space-y-1.5">
          {taskSteps.length === 0 && (
            <p className="text-xs text-muted-foreground/60">No steps yet</p>
          )}
          {taskSteps.map((step) => (
            <div key={step.id} className="group/step flex items-center gap-2">
              <button
                onClick={() => startTransition(() => toggleStep(step.id, !step.done, project.id))}
                className={`h-3.5 w-3.5 shrink-0 rounded border transition-colors ${
                  step.done
                    ? "border-foreground/40 bg-foreground/20"
                    : "border-border hover:border-foreground/40"
                }`}
              >
                {step.done && (
                  <svg viewBox="0 0 10 10" className="h-full w-full p-px text-foreground/70" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="1.5,5 4,7.5 8.5,2.5" />
                  </svg>
                )}
              </button>
              <span className={`flex-1 text-xs leading-snug ${step.done ? "line-through text-muted-foreground" : ""}`}>
                {step.title}
              </span>
              <button
                onClick={() => startTransition(() => deleteStep(step.id, project.id))}
                className="shrink-0 text-muted-foreground hover:text-destructive opacity-0 group-hover/step:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}

          {/* Add step form */}
          <form ref={stepFormRef} onSubmit={handleAddStep} className="flex items-center gap-1.5 pt-0.5">
            <Plus className="h-3 w-3 shrink-0 text-muted-foreground" />
            <input
              name="title"
              required
              placeholder="Add a step…"
              className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/50 min-w-0"
            />
          </form>
        </div>
      )}
    </div>
  )
}

export function ProjectBoard({ project, tasks, milestones, steps }: Props) {
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
                  <TaskCard key={task.id} task={task} project={project} steps={steps} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

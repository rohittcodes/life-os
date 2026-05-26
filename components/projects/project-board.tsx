"use client"

import { useTransition, useRef, useState, useEffect } from "react"
import {
  addTask, updateTaskStatus, deleteTask,
  addStep, toggleStep, deleteStep, updateTaskNotes,
} from "@/app/(app)/projects/actions"
import {
  DndContext, DragOverlay, PointerSensor, TouchSensor,
  useSensor, useSensors, useDroppable, useDraggable,
  type DragStartEvent, type DragEndEvent,
} from "@dnd-kit/core"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X, ChevronDown, ChevronRight, Plus, GripVertical, FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Project, ProductTask, TaskStep } from "@/lib/types"

type StatusKey = "todo" | "in_progress" | "blocked" | "done"

const STATUS_COLS = [
  { key: "todo" as StatusKey, label: "To Do", colBg: "bg-muted" },
  { key: "in_progress" as StatusKey, label: "In Progress", colBg: "bg-blue-500/10" },
  { key: "blocked" as StatusKey, label: "Blocked", colBg: "bg-red-500/10" },
  { key: "done" as StatusKey, label: "Done", colBg: "bg-green-500/10" },
]

const PRIORITY_LABEL = { 1: "P1", 2: "P2", 3: "P3" }
const PRIORITY_COLOR = { 1: "text-red-500", 2: "text-yellow-500", 3: "text-green-500" }

interface Props {
  project: Project
  tasks: ProductTask[]
  milestones: string[]
  steps: TaskStep[]
}

// ─── Pure visual card content ─────────────────────────────────────────

function TaskCardContent({
  task,
  project,
  steps,
  gripProps,
  isOverlay = false,
  onDelete,
  onStatusChange,
}: {
  task: ProductTask
  project: Project
  steps: TaskStep[]
  gripProps?: Record<string, unknown>
  isOverlay?: boolean
  onDelete: () => void
  onStatusChange: (status: StatusKey) => void
}) {
  const [, startTransition] = useTransition()
  const [expanded, setExpanded] = useState(false)
  const [notes, setNotes] = useState(task.notes ?? "")
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const stepFormRef = useRef<HTMLFormElement>(null)

  useEffect(() => { setNotes(task.notes ?? "") }, [task.notes])

  const taskSteps = steps.filter((s) => s.task_id === task.id)
  const doneSteps = taskSteps.filter((s) => s.done).length

  function scheduleSaveNotes(val: string) {
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      startTransition(() => updateTaskNotes(task.id, val || null, project.id))
    }, 700)
  }

  function handleAddStep(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    stepFormRef.current?.reset()
    startTransition(() => addStep(task.id, project.id, fd))
  }

  const otherStatuses = STATUS_COLS.filter((s) => s.key !== task.status)

  return (
    <div className={cn(
      "group rounded-lg border border-border bg-card shadow-xs",
      isOverlay && "shadow-2xl ring-1 ring-foreground/10 rotate-1 scale-105",
    )}>
      {/* Header */}
      <div className="p-3">
        <div className="flex items-start gap-1.5">
          {/* Drag grip */}
          {gripProps && (
            <div
              {...(gripProps as React.HTMLAttributes<HTMLDivElement>)}
              className="mt-0.5 shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground/70 opacity-50 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity touch-none"
            >
              <GripVertical className="h-3.5 w-3.5" />
            </div>
          )}

          {/* Expand toggle */}
          <button
            onClick={() => setExpanded((v) => !v)}
            className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>

          <p className="flex-1 text-xs font-medium leading-snug cursor-pointer" onClick={() => setExpanded((v) => !v)}>
            {task.title}
          </p>

          {/* Notes indicator */}
          {task.notes && !expanded && (
            <FileText className="h-3 w-3 shrink-0 text-muted-foreground/40 mt-0.5" />
          )}

          {!isOverlay && (
            <button
              onClick={onDelete}
              className="shrink-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {task.milestone && (
          <p className="mt-1 ml-5 text-[10px] text-muted-foreground/60 uppercase tracking-wide">{task.milestone}</p>
        )}

        <div className="mt-2 ml-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={cn("text-xs font-medium", PRIORITY_COLOR[task.priority as 1|2|3])}>
              {PRIORITY_LABEL[task.priority as 1|2|3]}
            </span>
            {taskSteps.length > 0 && (
              <span className="text-xs text-muted-foreground tabular-nums">{doneSteps}/{taskSteps.length}</span>
            )}
          </div>
          {!isOverlay && (
            <div className="flex flex-wrap gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {otherStatuses.map((s) => (
                <button
                  key={s.key}
                  onClick={() => onStatusChange(s.key)}
                  className="rounded px-1.5 py-0.5 text-[10px] border border-border hover:bg-muted transition-colors"
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Step progress bar (collapsed) */}
        {!expanded && taskSteps.length > 0 && (
          <div className="mt-2 ml-5 h-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-foreground/40 transition-all"
              style={{ width: `${Math.round((doneSteps / taskSteps.length) * 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* Expanded panel */}
      {expanded && !isOverlay && (
        <div className="border-t border-border ml-5 px-3 pb-3 pt-2 space-y-3">
          {/* Notes */}
          <textarea
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value)
              scheduleSaveNotes(e.target.value)
            }}
            placeholder="Add notes, links, context…"
            rows={2}
            className="w-full resize-none rounded-lg border border-border bg-background px-2.5 py-2 text-xs placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring transition"
          />

          {/* Sub-steps */}
          <div className="space-y-1.5">
            {taskSteps.map((step) => (
              <div key={step.id} className="group/step flex items-center gap-2">
                <button
                  onClick={() => startTransition(() => toggleStep(step.id, !step.done, project.id))}
                  className={cn(
                    "h-3.5 w-3.5 shrink-0 rounded border transition-colors",
                    step.done ? "border-foreground/40 bg-foreground/20" : "border-border hover:border-foreground/40"
                  )}
                >
                  {step.done && (
                    <svg viewBox="0 0 10 10" className="h-full w-full p-px text-foreground/70" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="1.5,5 4,7.5 8.5,2.5" />
                    </svg>
                  )}
                </button>
                <span className={cn("flex-1 text-xs leading-snug", step.done && "line-through text-muted-foreground")}>
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

            <form ref={stepFormRef} onSubmit={handleAddStep} className="flex items-center gap-1.5 pt-0.5">
              <Plus className="h-3 w-3 shrink-0 text-muted-foreground/50" />
              <input
                name="title"
                required
                placeholder="Add a step…"
                className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/40 min-w-0"
              />
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Draggable wrapper ────────────────────────────────────────────────

function DraggableTaskCard({
  task, project, steps, isDragging, onDelete, onStatusChange,
}: {
  task: ProductTask
  project: Project
  steps: TaskStep[]
  isDragging: boolean
  onDelete: () => void
  onStatusChange: (status: StatusKey) => void
}) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id: task.id })

  return (
    <div ref={setNodeRef}>
      {isDragging
        ? <div className="h-14 rounded-lg border-2 border-dashed border-border/40 bg-muted/30" />
        : (
          <TaskCardContent
            task={task} project={project} steps={steps}
            gripProps={{ ...listeners, ...attributes }}
            onDelete={onDelete}
            onStatusChange={onStatusChange}
          />
        )
      }
    </div>
  )
}

// ─── Droppable column ─────────────────────────────────────────────────

function DroppableColumn({
  colKey, label, colBg, tasks, project, steps, activeId, onDelete, onStatusChange,
}: {
  colKey: StatusKey
  label: string
  colBg: string
  tasks: ProductTask[]
  project: Project
  steps: TaskStep[]
  activeId: string | null
  onDelete: (taskId: string) => void
  onStatusChange: (taskId: string, status: StatusKey) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: colKey })

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</h3>
        <span className="text-xs text-muted-foreground">{tasks.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "min-h-24 rounded-xl p-2 space-y-2 transition-colors",
          colBg,
          isOver && "ring-2 ring-foreground/20 bg-foreground/5",
        )}
      >
        {tasks.map((task) => (
          <DraggableTaskCard
            key={task.id}
            task={task}
            project={project}
            steps={steps}
            isDragging={activeId === task.id}
            onDelete={() => onDelete(task.id)}
            onStatusChange={(status) => onStatusChange(task.id, status)}
          />
        ))}
        {tasks.length === 0 && !isOver && (
          <p className="px-1 py-2 text-[10px] text-muted-foreground/40">Drop here</p>
        )}
      </div>
    </div>
  )
}

// ─── Main board ───────────────────────────────────────────────────────

export function ProjectBoard({ project, tasks, milestones, steps }: Props) {
  const [, startTransition] = useTransition()
  const [activeId, setActiveId] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const [milestone, setMilestone] = useState("none")
  const [priority, setPriority] = useState("2")
  const milestoneOptions = Array.from(new Set([...milestones, "Backlog"].filter(Boolean)))

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) ?? null : null

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  )

  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as string)
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null)
    if (!over) return
    const task = tasks.find((t) => t.id === active.id)
    if (!task) return
    const targetStatus = over.id as StatusKey
    if (task.status === targetStatus) return
    startTransition(() => updateTaskStatus(task.id, targetStatus, project.id))
  }

  function handleAddTask(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set("milestone", milestone === "none" ? "" : milestone)
    fd.set("priority", priority)
    formRef.current?.reset()
    startTransition(() => addTask(project.id, fd))
  }

  function handleDelete(taskId: string) {
    startTransition(() => deleteTask(taskId, project.id))
  }

  function handleStatusChange(taskId: string, status: StatusKey) {
    startTransition(() => updateTaskStatus(taskId, status, project.id))
  }

  return (
    <div className="space-y-8">
      {/* Add task form */}
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

      {/* Kanban columns */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {STATUS_COLS.map(({ key, label, colBg }) => (
            <DroppableColumn
              key={key}
              colKey={key}
              label={label}
              colBg={colBg}
              tasks={tasks.filter((t) => t.status === key)}
              project={project}
              steps={steps}
              activeId={activeId}
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={{ duration: 180, easing: "ease" }}>
          {activeTask && (
            <TaskCardContent
              task={activeTask}
              project={project}
              steps={steps}
              isOverlay
              onDelete={() => {}}
              onStatusChange={() => {}}
            />
          )}
        </DragOverlay>
      </DndContext>
    </div>
  )
}

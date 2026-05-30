"use client"

import { useTransition, useRef, useState, useEffect } from "react"
import { updateTaskStatus, deleteTask, updateTaskNotes } from "@/app/(app)/product/actions"
import {
  DndContext, DragOverlay, PointerSensor, TouchSensor,
  useSensor, useSensors, useDroppable, useDraggable,
  type DragStartEvent, type DragEndEvent,
} from "@dnd-kit/core"
import {
  X, GripVertical, ChevronDown, ChevronRight, FileText,
  ChevronLeft, CalendarDays, RotateCcw,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { ProductTask, TaskStatus } from "@/lib/types"

type ColStatus = TaskStatus

const COLUMNS: { status: ColStatus; label: string; colBg: string; badge: string }[] = [
  { status: "todo",        label: "To do",       colBg: "bg-muted",          badge: "bg-muted text-muted-foreground" },
  { status: "in_progress", label: "In progress", colBg: "bg-blue-500/10",    badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  { status: "blocked",     label: "Blocked",     colBg: "bg-red-500/10",     badge: "bg-red-500/10 text-red-600 dark:text-red-400" },
  { status: "done",        label: "Done",        colBg: "bg-green-500/10",   badge: "bg-green-500/10 text-green-600 dark:text-green-400" },
]

const PRIORITY_LABEL: Record<number, string> = { 1: "P1", 2: "P2", 3: "P3" }
const PRIORITY_COLOR: Record<number, string> = {
  1: "text-red-500",
  2: "text-yellow-500",
  3: "text-muted-foreground",
}

function isoDate(d: Date) {
  return d.toISOString().split("T")[0]
}

function addDays(date: string, n: number) {
  const d = new Date(date + "T12:00:00")
  d.setDate(d.getDate() + n)
  return isoDate(d)
}

function displayDate(date: string) {
  const today = isoDate(new Date())
  if (date === today) return "Today"
  if (date === addDays(today, -1)) return "Yesterday"
  if (date === addDays(today, 1)) return "Tomorrow"
  return new Date(date + "T12:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })
}

// ─── Pure visual card ─────────────────────────────────────────────────

function TaskCardContent({
  task, gripProps, isOverlay = false, onDelete, onStatusChange,
}: {
  task: ProductTask
  gripProps?: Record<string, unknown>
  isOverlay?: boolean
  onDelete: () => void
  onStatusChange: (status: ColStatus) => void
}) {
  const [, startTransition] = useTransition()
  const [expanded, setExpanded] = useState(false)
  const [notes, setNotes] = useState(task.notes ?? "")
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => { setNotes(task.notes ?? "") }, [task.notes])

  function scheduleSave(val: string) {
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      startTransition(() => updateTaskNotes(task.id, val || null))
    }, 700)
  }

  const otherCols = COLUMNS.filter((c) => c.status !== task.status)
  const today = isoDate(new Date())
  const isOverdue = task.due_date && task.due_date < today && task.status !== "done"

  return (
    <div className={cn(
      "group rounded-xl border border-border bg-card text-sm transition-colors",
      !isOverlay && "hover:border-foreground/20",
      isOverlay && "shadow-2xl ring-1 ring-foreground/10 rotate-1 scale-105",
    )}>
      <div className="p-3">
        <div className="flex items-start gap-1.5">
          {gripProps && (
            <div
              {...(gripProps as React.HTMLAttributes<HTMLDivElement>)}
              className="mt-0.5 shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground/70 opacity-50 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity touch-none"
            >
              <GripVertical className="h-3.5 w-3.5" />
            </div>
          )}
          <button
            onClick={() => setExpanded((v) => !v)}
            className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
          <span className="flex-1 font-medium leading-snug cursor-pointer" onClick={() => setExpanded((v) => !v)}>
            {task.title}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            {task.notes && !expanded && <FileText className="h-3 w-3 text-muted-foreground/40" />}
            <span className={cn("text-xs font-medium", PRIORITY_COLOR[task.priority])}>
              {PRIORITY_LABEL[task.priority]}
            </span>
            {!isOverlay && (
              <button onClick={onDelete} className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="mt-1 ml-5 flex items-center gap-2">
          {task.due_date && (
            <span className={cn("text-xs", isOverdue ? "text-red-500 font-medium" : "text-muted-foreground")}>
              {isOverdue ? "⚠ " : ""}{displayDate(task.due_date)}
            </span>
          )}
          {task.milestone && (
            <span className="text-[10px] rounded-full bg-muted px-1.5 py-0.5 text-muted-foreground">{task.milestone}</span>
          )}
        </div>

        {!isOverlay && (
          <div className="mt-2 ml-5 flex flex-wrap gap-1 opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity">
            {otherCols.map((c) => (
              <button
                key={c.status}
                onClick={() => onStatusChange(c.status)}
                className="rounded px-1.5 py-0.5 text-[10px] border border-border hover:bg-muted transition-colors"
              >
                {c.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {expanded && !isOverlay && (
        <div className="border-t border-border ml-5 px-3 pb-3 pt-2">
          <textarea
            value={notes}
            onChange={(e) => { setNotes(e.target.value); scheduleSave(e.target.value) }}
            placeholder="Add notes, links, context…"
            rows={3}
            className="w-full resize-none rounded-lg border border-border bg-background px-2.5 py-2 text-xs placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring transition"
          />
        </div>
      )}
    </div>
  )
}

// ─── Draggable wrapper ─────────────────────────────────────────────────

function DraggableCard({ task, isDragging, onDelete, onStatusChange }: {
  task: ProductTask; isDragging: boolean
  onDelete: () => void; onStatusChange: (s: ColStatus) => void
}) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id: task.id })
  return (
    <div ref={setNodeRef}>
      {isDragging
        ? <div className="h-12 rounded-xl border-2 border-dashed border-border/40 bg-muted/30" />
        : <TaskCardContent task={task} gripProps={{ ...listeners, ...attributes }} onDelete={onDelete} onStatusChange={onStatusChange} />
      }
    </div>
  )
}

// ─── Droppable column ──────────────────────────────────────────────────

function DroppableColumn({ col, tasks, activeId, onDelete, onStatusChange }: {
  col: typeof COLUMNS[number]; tasks: ProductTask[]; activeId: string | null
  onDelete: (id: string) => void; onStatusChange: (id: string, s: ColStatus) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.status })
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", col.badge)}>{col.label}</span>
        <span className="text-xs text-muted-foreground">{tasks.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={cn("min-h-16 space-y-2 rounded-xl p-1.5 transition-colors", col.colBg, isOver && "ring-2 ring-foreground/20 bg-foreground/5")}
      >
        {tasks.map((task) => (
          <DraggableCard
            key={task.id} task={task} isDragging={activeId === task.id}
            onDelete={() => onDelete(task.id)} onStatusChange={(s) => onStatusChange(task.id, s)}
          />
        ))}
        {tasks.length === 0 && !isOver && (
          <p className="px-1 py-1.5 text-[10px] text-muted-foreground/40">Drop here</p>
        )}
      </div>
    </div>
  )
}

// ─── Date range picker ─────────────────────────────────────────────────

function DateRangePicker({ from, to, onFromChange, onToChange, onReset }: {
  from: string; to: string
  onFromChange: (v: string) => void
  onToChange: (v: string) => void
  onReset: () => void
}) {
  const today = isoDate(new Date())
  const isToday = from === today && to === today

  return (
    <div className="flex flex-wrap items-center gap-2">
      <CalendarDays className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <div className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-2 py-1">
        <input
          type="date"
          value={from}
          max={to}
          onChange={(e) => onFromChange(e.target.value)}
          className="text-xs bg-transparent outline-none cursor-pointer text-foreground [color-scheme:light] dark:[color-scheme:dark]"
        />
        <span className="text-muted-foreground text-xs">→</span>
        <input
          type="date"
          value={to}
          min={from}
          onChange={(e) => onToChange(e.target.value)}
          className="text-xs bg-transparent outline-none cursor-pointer text-foreground [color-scheme:light] dark:[color-scheme:dark]"
        />
      </div>
      {/* Day-nav shortcuts */}
      <div className="flex items-center gap-1 rounded-lg border border-border overflow-hidden">
        <button
          onClick={() => { onFromChange(addDays(from, -1)); onToChange(addDays(to, -1)) }}
          className="px-2 py-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => { onFromChange(addDays(from, 1)); onToChange(addDays(to, 1)) }}
          disabled={to >= isoDate(new Date())}
          className="px-2 py-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
      {!isToday && (
        <button
          onClick={onReset}
          className="flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <RotateCcw className="h-3 w-3" />
          Today
        </button>
      )}
      <span className="text-xs text-muted-foreground">
        {from === to ? displayDate(from) : `${displayDate(from)} – ${displayDate(to)}`}
      </span>
    </div>
  )
}

// ─── Sprint board (daily view) ─────────────────────────────────────────

interface SprintBoardProps {
  tasks: ProductTask[]
  milestone?: string    // if set, show single milestone; if absent, show all
}

export function SprintBoard({ tasks, milestone }: SprintBoardProps) {
  const today = isoDate(new Date())
  const [activeId, setActiveId] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const [dateFrom, setDateFrom] = useState(today)
  const [dateTo, setDateTo] = useState(today)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  )

  // Daily view filtering:
  // • Include task if due_date is within [dateFrom, dateTo]
  // • Include overdue incomplete tasks (due_date < dateFrom, not done) — they carry forward
  // • Exclude done tasks from before dateFrom — they're completed history
  // • Tasks with no due_date: only show on today view
  function filterForRange(t: ProductTask): boolean {
    if (milestone && t.milestone !== milestone) return false
    if (!t.due_date) {
      return dateFrom === today && dateTo === today
    }
    const inRange = t.due_date >= dateFrom && t.due_date <= dateTo
    const isOverduePending = t.due_date < dateFrom && t.status !== "done"
    return inRange || isOverduePending
  }

  const filtered = tasks.filter(filterForRange)
  const done = filtered.filter((t) => t.status === "done").length
  const progress = filtered.length > 0 ? Math.round((done / filtered.length) * 100) : 0
  const activeTask = activeId ? filtered.find((t) => t.id === activeId) ?? null : null
  const overduePendingCount = filtered.filter((t) => t.due_date && t.due_date < dateFrom && t.status !== "done").length

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null)
    if (!over) return
    const task = filtered.find((t) => t.id === active.id)
    if (!task || task.status === over.id) return
    startTransition(() => updateTaskStatus(task.id, over.id as string))
  }

  return (
    <div className="space-y-4">
      {/* Date range picker + progress */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <DateRangePicker
          from={dateFrom} to={dateTo}
          onFromChange={setDateFrom} onToChange={setDateTo}
          onReset={() => { setDateFrom(today); setDateTo(today) }}
        />
        {filtered.length > 0 && (
          <div className="flex items-center gap-3 sm:shrink-0">
            {overduePendingCount > 0 && (
              <span className="text-xs text-amber-600 dark:text-amber-400">
                ⚠ {overduePendingCount} carried from before
              </span>
            )}
            <div className="flex items-center gap-2">
              <div className="w-20 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-foreground transition-all" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-xs text-muted-foreground shrink-0">{done}/{filtered.length}</span>
            </div>
          </div>
        )}
      </div>

      {/* Milestone label if in single-milestone mode */}
      {milestone && (
        <div className="flex items-center gap-2">
          <span className="text-xs rounded-full bg-muted px-2.5 py-1 font-medium">{milestone}</span>
        </div>
      )}

      {/* Board */}
      {filtered.length === 0 ? (
        <div className="flex h-28 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
          No tasks for this period
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={({ active }: DragStartEvent) => setActiveId(active.id as string)}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {COLUMNS.map((col) => (
              <DroppableColumn
                key={col.status}
                col={col}
                tasks={filtered.filter((t) => t.status === col.status)}
                activeId={activeId}
                onDelete={(id) => startTransition(() => deleteTask(id))}
                onStatusChange={(id, s) => startTransition(() => updateTaskStatus(id, s))}
              />
            ))}
          </div>
          <DragOverlay dropAnimation={{ duration: 180, easing: "ease" }}>
            {activeTask && <TaskCardContent task={activeTask} isOverlay onDelete={() => {}} onStatusChange={() => {}} />}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  )
}

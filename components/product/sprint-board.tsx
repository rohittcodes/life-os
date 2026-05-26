"use client"

import { useTransition, useRef, useState, useEffect } from "react"
import { updateTaskStatus, deleteTask, updateTaskNotes } from "@/app/(app)/product/actions"
import {
  DndContext, DragOverlay, PointerSensor, TouchSensor,
  useSensor, useSensors, useDroppable, useDraggable,
  type DragStartEvent, type DragEndEvent,
} from "@dnd-kit/core"
import { X, GripVertical, ChevronDown, ChevronRight, FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ProductTask, TaskStatus } from "@/lib/types"

type ColStatus = TaskStatus

const COLUMNS: { status: ColStatus; label: string; colBg: string; badge: string }[] = [
  { status: "todo", label: "To do", colBg: "bg-muted", badge: "bg-muted text-muted-foreground" },
  { status: "in_progress", label: "In progress", colBg: "bg-blue-500/10", badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  { status: "blocked", label: "Blocked", colBg: "bg-red-500/10", badge: "bg-red-500/10 text-red-600 dark:text-red-400" },
  { status: "done", label: "Done", colBg: "bg-green-500/10", badge: "bg-green-500/10 text-green-600 dark:text-green-400" },
]

const PRIORITY_LABEL: Record<number, string> = { 1: "P1", 2: "P2", 3: "P3" }
const PRIORITY_COLOR: Record<number, string> = {
  1: "text-red-500",
  2: "text-yellow-500",
  3: "text-muted-foreground",
}

// ─── Pure visual card ─────────────────────────────────────────────────

function TaskCardContent({
  task,
  gripProps,
  isOverlay = false,
  onDelete,
  onStatusChange,
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

  return (
    <div className={cn(
      "group rounded-xl border border-border bg-card text-sm transition-colors",
      !isOverlay && "hover:border-foreground/20",
      isOverlay && "shadow-2xl ring-1 ring-foreground/10 rotate-1 scale-105",
    )}>
      <div className="p-3">
        <div className="flex items-start gap-1.5">
          {/* Grip */}
          {gripProps && (
            <div
              {...(gripProps as React.HTMLAttributes<HTMLDivElement>)}
              className="mt-0.5 shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground/70 opacity-50 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity touch-none"
            >
              <GripVertical className="h-3.5 w-3.5" />
            </div>
          )}

          {/* Expand */}
          <button
            onClick={() => setExpanded((v) => !v)}
            className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>

          <span
            className="flex-1 font-medium leading-snug cursor-pointer"
            onClick={() => setExpanded((v) => !v)}
          >
            {task.title}
          </span>

          <div className="flex items-center gap-1.5 shrink-0">
            {task.notes && !expanded && (
              <FileText className="h-3 w-3 text-muted-foreground/40" />
            )}
            <span className={cn("text-xs font-medium", PRIORITY_COLOR[task.priority])}>
              {PRIORITY_LABEL[task.priority]}
            </span>
            {!isOverlay && (
              <button
                onClick={onDelete}
                className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {task.due_date && (
          <div className="mt-1 ml-5 text-xs text-muted-foreground">
            {new Date(task.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
          </div>
        )}

        {/* Status move buttons */}
        {!isOverlay && (
          <div className="mt-2 ml-5 flex flex-wrap gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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

      {/* Expanded notes */}
      {expanded && !isOverlay && (
        <div className="border-t border-border ml-5 px-3 pb-3 pt-2">
          <textarea
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value)
              scheduleSave(e.target.value)
            }}
            placeholder="Add notes, links, context…"
            rows={3}
            className="w-full resize-none rounded-lg border border-border bg-background px-2.5 py-2 text-xs placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring transition"
          />
        </div>
      )}
    </div>
  )
}

// ─── Draggable wrapper ────────────────────────────────────────────────

function DraggableCard({
  task, isDragging, onDelete, onStatusChange,
}: {
  task: ProductTask
  isDragging: boolean
  onDelete: () => void
  onStatusChange: (status: ColStatus) => void
}) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id: task.id })

  return (
    <div ref={setNodeRef}>
      {isDragging
        ? <div className="h-12 rounded-xl border-2 border-dashed border-border/40 bg-muted/30" />
        : (
          <TaskCardContent
            task={task}
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
  col, tasks, activeId, onDelete, onStatusChange,
}: {
  col: typeof COLUMNS[number]
  tasks: ProductTask[]
  activeId: string | null
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: ColStatus) => void
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
        className={cn(
          "min-h-16 space-y-2 rounded-xl p-1.5 transition-colors",
          col.colBg,
          isOver && "ring-2 ring-foreground/20 bg-foreground/5",
        )}
      >
        {tasks.map((task) => (
          <DraggableCard
            key={task.id}
            task={task}
            isDragging={activeId === task.id}
            onDelete={() => onDelete(task.id)}
            onStatusChange={(status) => onStatusChange(task.id, status)}
          />
        ))}
        {tasks.length === 0 && !isOver && (
          <p className="px-1 py-1.5 text-[10px] text-muted-foreground/40">Drop here</p>
        )}
      </div>
    </div>
  )
}

// ─── Sprint board ─────────────────────────────────────────────────────

interface SprintBoardProps {
  tasks: ProductTask[]
  milestone: string
}

export function SprintBoard({ tasks, milestone }: SprintBoardProps) {
  const [, startTransition] = useTransition()
  const [activeId, setActiveId] = useState<string | null>(null)

  const filtered = tasks.filter((t) => t.milestone === milestone)
  const done = filtered.filter((t) => t.status === "done").length
  const progress = filtered.length > 0 ? Math.round((done / filtered.length) * 100) : 0
  const activeTask = activeId ? filtered.find((t) => t.id === activeId) ?? null : null

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
    const task = filtered.find((t) => t.id === active.id)
    if (!task || task.status === over.id) return
    startTransition(() => updateTaskStatus(task.id, over.id as string))
  }

  function handleDelete(id: string) {
    startTransition(() => deleteTask(id))
  }

  function handleStatusChange(id: string, status: ColStatus) {
    startTransition(() => updateTaskStatus(id, status))
  }

  if (filtered.length === 0) return null

  return (
    <div className="space-y-4">
      {/* Milestone header */}
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold">{milestone}</h2>
        <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-foreground transition-all" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-xs text-muted-foreground shrink-0">{done}/{filtered.length}</span>
      </div>

      {/* DnD board */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {COLUMNS.map((col) => (
            <DroppableColumn
              key={col.status}
              col={col}
              tasks={filtered.filter((t) => t.status === col.status)}
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

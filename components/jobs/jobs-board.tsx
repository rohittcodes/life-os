"use client"

import { useTransition, useState } from "react"
import { updateJobStatus, deleteJob } from "@/app/(app)/jobs/actions"
import {
  DndContext, DragOverlay, PointerSensor, TouchSensor,
  useSensor, useSensors, useDroppable, useDraggable,
  type DragStartEvent, type DragEndEvent,
} from "@dnd-kit/core"
import { X, GripVertical, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { JobApplication, JobStatus } from "@/lib/types"

const COLUMNS: { status: JobStatus; label: string; badge: string; colBg: string }[] = [
  { status: "applied",   label: "Applied",   colBg: "bg-muted",          badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  { status: "screen",    label: "Screen",    colBg: "bg-yellow-500/5",   badge: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400" },
  { status: "interview", label: "Interview", colBg: "bg-purple-500/5",   badge: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
  { status: "offer",     label: "Offer",     colBg: "bg-green-500/5",    badge: "bg-green-500/10 text-green-600 dark:text-green-400" },
  { status: "rejected",  label: "Rejected",  colBg: "bg-red-500/5",      badge: "bg-red-500/10 text-red-600 dark:text-red-400" },
  { status: "ghosted",   label: "Ghosted",   colBg: "bg-muted",          badge: "bg-muted text-muted-foreground" },
]

function isOverdue(dateStr: string | null) {
  if (!dateStr) return false
  return new Date(dateStr) < new Date(new Date().toDateString())
}

// ─── Pure visual card ─────────────────────────────────────────────────

function JobCardContent({
  job,
  gripProps,
  isOverlay = false,
  onDelete,
  onStatusChange,
}: {
  job: JobApplication
  gripProps?: Record<string, unknown>
  isOverlay?: boolean
  onDelete: () => void
  onStatusChange: (status: JobStatus) => void
}) {
  const overdueAction = isOverdue(job.next_action_date)
  const otherCols = COLUMNS.filter((c) => c.status !== job.status)

  return (
    <div className={cn(
      "group rounded-xl border border-border bg-card p-3 text-sm transition-colors",
      !isOverlay && "hover:border-foreground/20",
      isOverlay && "shadow-2xl ring-1 ring-foreground/10 rotate-1 scale-105",
    )}>
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

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1">
            <div className="font-medium leading-snug truncate">{job.company}</div>
            {!isOverlay && (
              <button
                onClick={onDelete}
                className="shrink-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground truncate">{job.role}</div>

          {job.salary_lpa && (
            <div className="mt-1 text-xs text-muted-foreground">₹{job.salary_lpa}L</div>
          )}

          {job.next_action_date && (
            <div className={cn(
              "mt-1.5 flex items-center gap-1 text-xs",
              overdueAction ? "text-red-500 font-medium" : "text-muted-foreground"
            )}>
              {overdueAction && <AlertTriangle className="h-3 w-3 shrink-0" />}
              {new Date(job.next_action_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
            </div>
          )}
        </div>
      </div>

      {/* Status move buttons */}
      {!isOverlay && (
        <div className="mt-2.5 flex flex-wrap gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
  )
}

// ─── Draggable wrapper ────────────────────────────────────────────────

function DraggableJobCard({
  job, isDragging, onDelete, onStatusChange,
}: {
  job: JobApplication
  isDragging: boolean
  onDelete: () => void
  onStatusChange: (status: JobStatus) => void
}) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id: job.id })

  return (
    <div ref={setNodeRef}>
      {isDragging
        ? <div className="h-16 rounded-xl border-2 border-dashed border-border/40 bg-muted/30" />
        : (
          <JobCardContent
            job={job}
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
  col, jobs, activeId, onDelete, onStatusChange,
}: {
  col: typeof COLUMNS[number]
  jobs: JobApplication[]
  activeId: string | null
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: JobStatus) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.status })

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", col.badge)}>{col.label}</span>
        <span className="text-xs text-muted-foreground">{jobs.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "min-h-16 space-y-2 rounded-xl p-1.5 transition-colors",
          col.colBg,
          isOver && "ring-2 ring-foreground/20 bg-foreground/5",
        )}
      >
        {jobs.map((job) => (
          <DraggableJobCard
            key={job.id}
            job={job}
            isDragging={activeId === job.id}
            onDelete={() => onDelete(job.id)}
            onStatusChange={(status) => onStatusChange(job.id, status)}
          />
        ))}
        {jobs.length === 0 && !isOver && (
          <p className="px-1 py-1.5 text-[10px] text-muted-foreground/40">Drop here</p>
        )}
      </div>
    </div>
  )
}

// ─── Main board ───────────────────────────────────────────────────────

export function JobsBoard({ jobs }: { jobs: JobApplication[] }) {
  const [, startTransition] = useTransition()
  const [activeId, setActiveId] = useState<string | null>(null)
  const activeJob = activeId ? jobs.find((j) => j.id === activeId) ?? null : null

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
    const job = jobs.find((j) => j.id === active.id)
    if (!job || job.status === over.id) return
    startTransition(() => updateJobStatus(job.id, over.id as string))
  }

  function handleDelete(id: string) {
    startTransition(() => deleteJob(id))
  }

  function handleStatusChange(id: string, status: JobStatus) {
    startTransition(() => updateJobStatus(id, status))
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {COLUMNS.map((col) => (
          <DroppableColumn
            key={col.status}
            col={col}
            jobs={jobs.filter((j) => j.status === col.status)}
            activeId={activeId}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={{ duration: 180, easing: "ease" }}>
        {activeJob && (
          <JobCardContent
            job={activeJob}
            isOverlay
            onDelete={() => {}}
            onStatusChange={() => {}}
          />
        )}
      </DragOverlay>
    </DndContext>
  )
}

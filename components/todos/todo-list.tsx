"use client"

import { useRef, useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { addTodo, toggleTodo, deleteTodo, clearCompleted, updateTodo } from "@/app/(app)/todos/actions"
import { fetchTodos } from "@/lib/supabase/queries/todos"
import { queryKeys } from "@/lib/query-keys"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertTriangle, ChevronDown, RefreshCw, X, List, LayoutGrid, GripVertical } from "lucide-react"
import {
  DndContext, DragOverlay, PointerSensor, TouchSensor,
  useSensor, useSensors, useDroppable, useDraggable,
  type DragStartEvent, type DragEndEvent,
} from "@dnd-kit/core"
import type { Goal, Todo } from "@/lib/types"
import { motion, AnimatePresence } from "motion/react"
import { cn } from "@/lib/utils"

// ─── Shared constants ────────────────────────────────────────────────

const priorityDot: Record<Todo["priority"], string> = {
  high: "bg-red-500",
  normal: "bg-blue-400",
  low: "bg-muted-foreground/40",
}

const progressColor = (p: number) =>
  p === 100 ? "bg-green-500" : p >= 60 ? "bg-blue-500" : p >= 30 ? "bg-amber-500" : "bg-muted-foreground/50"

const itemVariants = {
  hidden: { opacity: 0, y: -6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.18 } },
  exit: { opacity: 0, x: -8, transition: { duration: 0.14 } },
}

const KANBAN_COLS = [
  { key: "high" as const, label: "High", colBg: "bg-red-500/5" },
  { key: "normal" as const, label: "Normal", colBg: "bg-muted" },
  { key: "low" as const, label: "Low", colBg: "bg-muted" },
  { key: "done" as const, label: "Done", colBg: "bg-green-500/5" },
]

// ─── Main component ───────────────────────────────────────────────────

export function TodoList({
  initialTodos,
  activeGoals = [],
}: {
  initialTodos: Todo[]
  activeGoals?: Pick<Goal, "id" | "title" | "category">[]
}) {
  const qc = useQueryClient()
  const formRef = useRef<HTMLFormElement>(null)
  const [view, setView] = useState<"list" | "kanban">("list")
  const [showDone, setShowDone] = useState(false)
  const [priority, setPriority] = useState("normal")
  const [goalId, setGoalId] = useState("none")
  const [recurrence, setRecurrence] = useState("none")

  const { data: todos = [] } = useQuery({
    queryKey: queryKeys.todos(),
    queryFn: fetchTodos,
    initialData: initialTodos,
    staleTime: 30 * 1000,
  })

  // ─── Mutations ────────────────────────────────────────────────────

  const toggleMutation = useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) => toggleTodo(id, done),
    onMutate: async ({ id, done }) => {
      await qc.cancelQueries({ queryKey: queryKeys.todos() })
      const prev = qc.getQueryData<Todo[]>(queryKeys.todos())
      qc.setQueryData<Todo[]>(queryKeys.todos(), (old) =>
        old?.map((t) => t.id === id ? { ...t, done, ...(done ? { progress: 100 } : {}) } : t) ?? []
      )
      return { prev }
    },
    onError: (_, __, ctx) => qc.setQueryData(queryKeys.todos(), ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.todos() }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTodo(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: queryKeys.todos() })
      const prev = qc.getQueryData<Todo[]>(queryKeys.todos())
      qc.setQueryData<Todo[]>(queryKeys.todos(), (old) => old?.filter((t) => t.id !== id) ?? [])
      return { prev }
    },
    onError: (_, __, ctx) => qc.setQueryData(queryKeys.todos(), ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.todos() }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof updateTodo>[1] }) =>
      updateTodo(id, patch),
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: queryKeys.todos() })
      const prev = qc.getQueryData<Todo[]>(queryKeys.todos())
      qc.setQueryData<Todo[]>(queryKeys.todos(), (old) =>
        old?.map((t) => t.id === id ? { ...t, ...patch } as Todo : t) ?? []
      )
      return { prev }
    },
    onError: (_, __, ctx) => qc.setQueryData(queryKeys.todos(), ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.todos() }),
  })

  const clearMutation = useMutation({
    mutationFn: () => clearCompleted(),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: queryKeys.todos() })
      const prev = qc.getQueryData<Todo[]>(queryKeys.todos())
      qc.setQueryData<Todo[]>(queryKeys.todos(), (old) => old?.filter((t) => !t.done) ?? [])
      return { prev }
    },
    onError: (_, __, ctx) => qc.setQueryData(queryKeys.todos(), ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.todos() }),
  })

  const addMutation = useMutation({
    mutationFn: async ({ title, priority, due_date }: { title: string; priority: string; due_date: string | null }) => {
      const fd = new FormData()
      fd.set("title", title)
      fd.set("priority", priority)
      if (due_date) fd.set("due_date", due_date)
      await addTodo(fd)
    },
    onMutate: async ({ title, priority, due_date }) => {
      await qc.cancelQueries({ queryKey: queryKeys.todos() })
      const prev = qc.getQueryData<Todo[]>(queryKeys.todos())
      const tempItem: Todo = {
        id: `temp-${crypto.randomUUID()}`,
        user_id: "",
        title,
        done: false,
        priority: priority as Todo["priority"],
        due_date: due_date ?? null,
        category: null,
        created_at: new Date().toISOString(),
        brief: null,
        progress: 0,
        goal_id: null,
        recurrence: "none",
      }
      qc.setQueryData<Todo[]>(queryKeys.todos(), (old) => [tempItem, ...(old ?? [])])
      return { prev }
    },
    onError: (_, __, ctx) => qc.setQueryData(queryKeys.todos(), ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.todos() }),
  })

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const title = fd.get("title") as string
    const due_date = (fd.get("due_date") as string) || null
    if (!title?.trim()) return
    if (goalId !== "none") fd.set("goal_id", goalId)
    if (recurrence !== "none") fd.set("recurrence", recurrence)
    formRef.current?.reset()
    addMutation.mutate({ title: title.trim(), priority, due_date })
  }

  // ─── Derived data ─────────────────────────────────────────────────

  const today = new Date().toISOString().split("T")[0]
  const pending = todos.filter((t) => !t.done)
  const done = todos.filter((t) => t.done)
  const overdue = pending.filter((t) => t.due_date && t.due_date < today)
  const todayTodos = pending.filter((t) => t.due_date === today)
  const upcoming = pending.filter((t) => !t.due_date || t.due_date > today)

  const sharedHandlers = {
    onToggle: (id: string, doneVal: boolean) => toggleMutation.mutate({ id, done: doneVal }),
    onDelete: (id: string) => deleteMutation.mutate(id),
    onUpdate: (id: string, patch: Parameters<typeof updateTodo>[1]) => updateMutation.mutate({ id, patch }),
  }

  return (
    <div className="space-y-6">
      {/* Add form */}
      <form ref={formRef} onSubmit={handleAdd} className="space-y-2">
        <div className="flex gap-2">
          <Input name="title" required placeholder="Add a task…" className="flex-1 min-w-0" />
          <motion.div whileTap={{ scale: 0.96 }}>
            <Button type="submit" className="shrink-0">Add</Button>
          </motion.div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="h-8 flex-1 min-w-[90px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Input name="due_date" type="date" className="h-8 flex-1 min-w-[130px] text-xs" />
          {activeGoals.length > 0 && (
            <Select value={goalId} onValueChange={setGoalId}>
              <SelectTrigger className="h-8 flex-1 min-w-[120px] text-xs">
                <SelectValue placeholder="Link goal…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No goal</SelectItem>
                {activeGoals.map(g => (
                  <SelectItem key={g.id} value={g.id}>{g.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={recurrence} onValueChange={setRecurrence}>
            <SelectTrigger className="h-8 flex-1 min-w-[100px] text-xs">
              <SelectValue placeholder="Repeat…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No repeat</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </form>

      {/* View toggle */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{todos.length} tasks</span>
        <div className="flex items-center rounded-lg border border-border bg-muted p-0.5">
          <button
            onClick={() => setView("list")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-colors",
              view === "list" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <List className="h-3 w-3" />
            List
          </button>
          <button
            onClick={() => setView("kanban")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-colors",
              view === "kanban" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <LayoutGrid className="h-3 w-3" />
            Kanban
          </button>
        </div>
      </div>

      {todos.length === 0 && (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
          No tasks — add something to get started
        </div>
      )}

      {/* ─── List view ─── */}
      {view === "list" && (
        <div className="space-y-6">
          <AnimatePresence initial={false}>
            {overdue.length > 0 && (
              <Section
                key="overdue"
                label="Overdue"
                icon={<AlertTriangle className="h-3 w-3 text-orange-500" />}
                todos={overdue}
                {...sharedHandlers}
                warn
              />
            )}
            {todayTodos.length > 0 && (
              <Section key="today" label="Today" todos={todayTodos} {...sharedHandlers} />
            )}
            {upcoming.length > 0 && (
              <Section key="upcoming" label="Upcoming" todos={upcoming} {...sharedHandlers} />
            )}
          </AnimatePresence>

          {done.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowDone((v) => !v)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showDone ? "▾" : "▸"} {done.length} completed
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => clearMutation.mutate()}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                >
                  Clear all
                </motion.button>
              </div>
              <AnimatePresence>
                {showDone && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 0.6, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-1.5 overflow-hidden"
                  >
                    <AnimatePresence initial={false}>
                      {done.map((t) => (
                        <TodoRow
                          key={t.id}
                          todo={t}
                          onToggle={(doneVal) => toggleMutation.mutate({ id: t.id, done: doneVal })}
                          onDelete={() => deleteMutation.mutate(t.id)}
                          onUpdate={(patch) => updateMutation.mutate({ id: t.id, patch })}
                        />
                      ))}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {/* ─── Kanban view ─── */}
      {view === "kanban" && (
        <KanbanBoard
          todos={todos}
          today={today}
          onToggle={(id, doneVal) => toggleMutation.mutate({ id, done: doneVal })}
          onDelete={(id) => deleteMutation.mutate(id)}
          onMove={(id, patch) => updateMutation.mutate({ id, patch })}
          onClearDone={() => clearMutation.mutate()}
        />
      )}
    </div>
  )
}

// ─── List view sub-components ─────────────────────────────────────────

function Section({
  label, icon, todos, onToggle, onDelete, onUpdate, warn,
}: {
  label: string
  icon?: React.ReactNode
  todos: Todo[]
  onToggle: (id: string, done: boolean) => void
  onDelete: (id: string) => void
  onUpdate: (id: string, patch: Parameters<typeof updateTodo>[1]) => void
  warn?: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.2 }}
      className="space-y-2"
    >
      <h3 className={cn("flex items-center gap-1.5 text-xs font-medium", warn ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground")}>
        {icon}{label}
      </h3>
      <AnimatePresence initial={false}>
        {todos.map((t) => (
          <TodoRow
            key={t.id}
            todo={t}
            onToggle={(done) => onToggle(t.id, done)}
            onDelete={() => onDelete(t.id)}
            onUpdate={(patch) => onUpdate(t.id, patch)}
          />
        ))}
      </AnimatePresence>
    </motion.div>
  )
}

function TodoRow({
  todo: t,
  onToggle,
  onDelete,
  onUpdate,
}: {
  todo: Todo
  onToggle: (done: boolean) => void
  onDelete: () => void
  onUpdate: (patch: Parameters<typeof updateTodo>[1]) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [brief, setBrief] = useState(t.brief ?? "")
  const [progress, setProgress] = useState(t.progress ?? 0)
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => { setBrief(t.brief ?? "") }, [t.brief])
  useEffect(() => { setProgress(t.progress ?? 0) }, [t.progress])

  function scheduleSave(patch: Parameters<typeof updateTodo>[1]) {
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => onUpdate(patch), 700)
  }

  const today = new Date().toISOString().split("T")[0]
  const isOverdue = !!t.due_date && t.due_date < today && !t.done

  return (
    <motion.div
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      layout
      className={cn(
        "rounded-xl border bg-card transition-colors",
        expanded ? "border-foreground/20" : "border-border hover:border-foreground/15",
      )}
    >
      <div className="group flex items-center gap-3 px-4 py-2.5">
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={() => onToggle(!t.done)}
          className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
            t.done ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground/50",
          )}
        >
          <AnimatePresence>
            {t.done && (
              <motion.svg
                key="check"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="size-3"
                fill="none"
                stroke="currentColor"
                strokeWidth={3}
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </motion.svg>
            )}
          </AnimatePresence>
        </motion.button>

        <div className={cn("h-1.5 w-1.5 rounded-full shrink-0", priorityDot[t.priority])} />

        <button
          onClick={() => setExpanded((v) => !v)}
          className={cn(
            "flex-1 min-w-0 text-left text-sm transition-colors",
            t.done ? "line-through text-muted-foreground" : "hover:text-foreground/80",
          )}
        >
          <span className="truncate">{t.title}</span>
          {t.brief && !expanded && (
            <span className="ml-1.5 inline-block h-1 w-1 rounded-full bg-blue-400 align-middle" />
          )}
        </button>

        {t.recurrence && t.recurrence !== "none" && (
          <span title={`Repeats ${t.recurrence}`}>
            <RefreshCw className="h-3 w-3 shrink-0 text-muted-foreground/50" />
          </span>
        )}

        {t.due_date && (
          <span className={cn("shrink-0 text-xs", isOverdue ? "text-red-500" : "text-muted-foreground")}>
            {new Date(t.due_date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
          </span>
        )}

        <motion.button
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.18 }}
          onClick={() => setExpanded((v) => !v)}
          className="shrink-0 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={onDelete}
          className="shrink-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X className="h-3.5 w-3.5" />
        </motion.button>
      </div>

      {!expanded && progress > 0 && !t.done && (
        <div className="mx-4 mb-2.5 h-1 overflow-hidden rounded-full bg-muted">
          <motion.div
            className={cn("h-full rounded-full", progressColor(progress))}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
      )}

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="space-y-3 border-t border-border px-4 py-3">
              <textarea
                value={brief}
                onChange={(e) => {
                  setBrief(e.target.value)
                  scheduleSave({ brief: e.target.value || null })
                }}
                placeholder="Add notes, context, links, subtasks…"
                rows={3}
                className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring transition"
              />

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Progress</span>
                  <span className={cn("text-xs font-semibold tabular-nums", progress === 100 ? "text-green-500" : "text-foreground")}>
                    {progress}%
                  </span>
                </div>
                <div className="relative flex items-center gap-2">
                  <div className="relative flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn("absolute left-0 top-0 h-full rounded-full transition-all duration-150", progressColor(progress))}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={progress}
                    onChange={(e) => {
                      const v = Number(e.target.value)
                      setProgress(v)
                      scheduleSave({ progress: v })
                    }}
                    className="absolute inset-0 w-full opacity-0 cursor-pointer h-2"
                  />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground/50">
                  {[0, 25, 50, 75, 100].map((n) => (
                    <button
                      key={n}
                      onClick={() => { setProgress(n); onUpdate({ progress: n }) }}
                      className={cn("hover:text-foreground transition-colors", progress === n && "text-foreground font-medium")}
                    >
                      {n}%
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Kanban view ──────────────────────────────────────────────────────

type KanbanColKey = "high" | "normal" | "low" | "done"

function KanbanBoard({
  todos,
  today,
  onToggle,
  onDelete,
  onMove,
  onClearDone,
}: {
  todos: Todo[]
  today: string
  onToggle: (id: string, done: boolean) => void
  onDelete: (id: string) => void
  onMove: (id: string, patch: Parameters<typeof updateTodo>[1]) => void
  onClearDone: () => void
}) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const activeTodo = activeId ? todos.find((t) => t.id === activeId) ?? null : null

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
    const todoId = active.id as string
    const targetCol = over.id as KanbanColKey
    const todo = todos.find((t) => t.id === todoId)
    if (!todo) return
    const currentCol: KanbanColKey = todo.done ? "done" : todo.priority
    if (currentCol === targetCol) return
    if (targetCol === "done") {
      onToggle(todoId, true)
    } else if (currentCol === "done") {
      onMove(todoId, { done: false, priority: targetCol })
    } else {
      onMove(todoId, { priority: targetCol })
    }
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {KANBAN_COLS.map(({ key, label, colBg }) => {
          const colTodos = key === "done"
            ? todos.filter((t) => t.done).slice(0, 30)
            : todos.filter((t) => !t.done && t.priority === key)
          const doneCount = key === "done" ? todos.filter((t) => t.done).length : null

          return (
            <DroppableColumn
              key={key}
              colKey={key}
              label={label}
              colBg={colBg}
              todos={colTodos}
              today={today}
              doneCount={doneCount}
              activeId={activeId}
              onToggle={onToggle}
              onDelete={onDelete}
              onMove={onMove}
              onClearDone={onClearDone}
            />
          )
        })}
      </div>

      <DragOverlay dropAnimation={{ duration: 180, easing: "ease" }}>
        {activeTodo && (
          <KanbanCardContent
            todo={activeTodo}
            today={today}
            currentCol={activeTodo.done ? "done" : activeTodo.priority}
            onToggle={() => {}}
            onDelete={() => {}}
            onMove={() => {}}
            isOverlay
          />
        )}
      </DragOverlay>
    </DndContext>
  )
}

function DroppableColumn({
  colKey, label, colBg, todos, today, doneCount, activeId,
  onToggle, onDelete, onMove, onClearDone,
}: {
  colKey: KanbanColKey
  label: string
  colBg: string
  todos: Todo[]
  today: string
  doneCount: number | null
  activeId: string | null
  onToggle: (id: string, done: boolean) => void
  onDelete: (id: string) => void
  onMove: (id: string, patch: Parameters<typeof updateTodo>[1]) => void
  onClearDone: () => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: colKey })

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</h3>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">{doneCount ?? todos.length}</span>
          {colKey === "done" && doneCount && doneCount > 0 && (
            <button
              onClick={onClearDone}
              className="text-[10px] text-muted-foreground/60 hover:text-destructive transition-colors"
            >
              clear
            </button>
          )}
        </div>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "min-h-24 rounded-xl p-2 space-y-2 transition-colors",
          colBg,
          isOver && "ring-2 ring-foreground/20 bg-foreground/5",
        )}
      >
        {todos.map((todo) => (
          <DraggableKanbanCard
            key={todo.id}
            todo={todo}
            today={today}
            currentCol={colKey}
            isDragging={activeId === todo.id}
            onToggle={(doneVal) => onToggle(todo.id, doneVal)}
            onDelete={() => onDelete(todo.id)}
            onMove={(patch) => onMove(todo.id, patch)}
          />
        ))}
        {todos.length === 0 && !isOver && (
          <p className="px-1 py-2 text-[10px] text-muted-foreground/40">Empty</p>
        )}
      </div>
    </div>
  )
}

function DraggableKanbanCard({
  todo,
  today,
  currentCol,
  isDragging,
  onToggle,
  onDelete,
  onMove,
}: {
  todo: Todo
  today: string
  currentCol: KanbanColKey
  isDragging: boolean
  onToggle: (done: boolean) => void
  onDelete: () => void
  onMove: (patch: Parameters<typeof updateTodo>[1]) => void
}) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id: todo.id })

  return (
    <div ref={setNodeRef}>
      {isDragging ? (
        // Ghost placeholder while the card is being dragged
        <div className="h-14 rounded-lg border-2 border-dashed border-border/40 bg-muted/30" />
      ) : (
        <KanbanCardContent
          todo={todo}
          today={today}
          currentCol={currentCol}
          onToggle={onToggle}
          onDelete={onDelete}
          onMove={onMove}
          gripProps={{ ...listeners, ...attributes }}
        />
      )}
    </div>
  )
}

function KanbanCardContent({
  todo: t,
  today,
  currentCol,
  onToggle,
  onDelete,
  onMove,
  gripProps,
  isOverlay = false,
}: {
  todo: Todo
  today: string
  currentCol: KanbanColKey
  onToggle: (done: boolean) => void
  onDelete: () => void
  onMove: (patch: Parameters<typeof updateTodo>[1]) => void
  gripProps?: Record<string, unknown>
  isOverlay?: boolean
}) {
  const isOverdue = !!t.due_date && t.due_date < today && !t.done
  const moveTargets = KANBAN_COLS.filter((c) => c.key !== currentCol)

  function handleMove(targetKey: KanbanColKey) {
    if (targetKey === "done") onToggle(true)
    else if (currentCol === "done") onMove({ done: false, priority: targetKey })
    else onMove({ priority: targetKey })
  }

  return (
    <div className={cn(
      "group rounded-lg border border-border bg-card p-3 shadow-xs",
      isOverlay && "shadow-2xl ring-1 ring-foreground/10 rotate-1 scale-105",
    )}>
      <div className="flex items-start gap-1.5">
        {/* Drag grip */}
        {gripProps && (
          <div
            {...(gripProps as React.HTMLAttributes<HTMLDivElement>)}
            className="mt-0.5 shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/20 hover:text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity touch-none"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </div>
        )}

        {/* Checkbox */}
        <button
          onClick={() => onToggle(!t.done)}
          className={cn(
            "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
            t.done ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground/50"
          )}
        >
          {t.done && (
            <svg className="size-2.5" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1">
            <p className={cn("text-xs font-medium leading-snug", t.done && "line-through text-muted-foreground")}>
              {t.title}
            </p>
            {!isOverlay && (
              <button
                onClick={onDelete}
                className="shrink-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity mt-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
            {t.due_date && (
              <span className={cn("text-[10px]", isOverdue ? "text-red-500 font-medium" : "text-muted-foreground")}>
                {new Date(t.due_date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              </span>
            )}
            {t.brief && <span className="inline-block h-1 w-1 rounded-full bg-blue-400" />}
            {t.recurrence && t.recurrence !== "none" && (
              <RefreshCw className="h-2.5 w-2.5 text-muted-foreground/50" />
            )}
            {t.progress > 0 && !t.done && (
              <span className="text-[10px] text-muted-foreground tabular-nums">{t.progress}%</span>
            )}
          </div>

          {t.progress > 0 && !t.done && (
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full", progressColor(t.progress))}
                style={{ width: `${t.progress}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Move buttons — only on non-overlay cards, appear on hover */}
      {!isOverlay && (
        <div className="mt-2.5 flex flex-wrap gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {moveTargets.map((target) => (
            <button
              key={target.key}
              onClick={() => handleMove(target.key)}
              className="rounded px-1.5 py-0.5 text-[10px] border border-border hover:bg-muted transition-colors"
            >
              {target.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

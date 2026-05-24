"use client"

import { useTransition, useRef, useState } from "react"
import { addTodo, toggleTodo, deleteTodo, clearCompleted } from "@/app/(app)/todos/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertTriangle, X } from "lucide-react"
import { motion, AnimatePresence } from "motion/react"
import type { Todo } from "@/lib/types"

const priorityDot = {
  high: "bg-red-500",
  normal: "bg-blue-400",
  low: "bg-muted-foreground/40",
}

const itemVariants = {
  hidden: { opacity: 0, y: -6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.18 } },
  exit: { opacity: 0, x: -8, transition: { duration: 0.14 } },
}

export function TodoList({ todos }: { todos: Todo[] }) {
  const [, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)
  const [showDone, setShowDone] = useState(false)
  const [priority, setPriority] = useState("normal")

  const pending = todos.filter((t) => !t.done)
  const done = todos.filter((t) => t.done)

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set("priority", priority)
    formRef.current?.reset()
    startTransition(() => addTodo(fd))
  }

  const today = new Date().toISOString().split("T")[0]
  const overdue = pending.filter((t) => t.due_date && t.due_date < today)
  const todayTodos = pending.filter((t) => t.due_date === today)
  const upcoming = pending.filter((t) => !t.due_date || t.due_date > today)

  return (
    <div className="space-y-6">
      {/* Quick add — two-row layout so nothing overflows on mobile */}
      <form ref={formRef} onSubmit={handleAdd} className="space-y-2">
        <div className="flex gap-2">
          <Input
            name="title"
            required
            placeholder="Add a task…"
            className="flex-1 min-w-0"
          />
          <motion.div whileTap={{ scale: 0.96 }}>
            <Button type="submit" className="shrink-0">Add</Button>
          </motion.div>
        </div>
        <div className="flex gap-2">
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="h-8 flex-1 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Input name="due_date" type="date" className="h-8 flex-1 text-xs" />
        </div>
      </form>

      {todos.length === 0 && (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
          No tasks — add something to get started
        </div>
      )}

      <AnimatePresence initial={false}>
        {overdue.length > 0 && (
          <Section
            key="overdue"
            label="Overdue"
            icon={<AlertTriangle className="h-3 w-3 text-orange-500" />}
            todos={overdue}
            onToggle={(id, done) => startTransition(() => toggleTodo(id, done))}
            onDelete={(id) => startTransition(() => deleteTodo(id))}
            warn
          />
        )}

        {todayTodos.length > 0 && (
          <Section
            key="today"
            label="Today"
            todos={todayTodos}
            onToggle={(id, done) => startTransition(() => toggleTodo(id, done))}
            onDelete={(id) => startTransition(() => deleteTodo(id))}
          />
        )}

        {upcoming.length > 0 && (
          <Section
            key="upcoming"
            label="Upcoming"
            todos={upcoming}
            onToggle={(id, done) => startTransition(() => toggleTodo(id, done))}
            onDelete={(id) => startTransition(() => deleteTodo(id))}
          />
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
              onClick={() => startTransition(() => clearCompleted())}
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
                      onToggle={(done) => startTransition(() => toggleTodo(t.id, done))}
                      onDelete={() => startTransition(() => deleteTodo(t.id))}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

function Section({
  label, icon, todos, onToggle, onDelete, warn,
}: {
  label: string
  icon?: React.ReactNode
  todos: Todo[]
  onToggle: (id: string, done: boolean) => void
  onDelete: (id: string) => void
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
      <h3
        className={`flex items-center gap-1.5 text-xs font-medium ${
          warn ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground"
        }`}
      >
        {icon}{label}
      </h3>
      <AnimatePresence initial={false}>
        {todos.map((t) => (
          <TodoRow
            key={t.id}
            todo={t}
            onToggle={(done) => onToggle(t.id, done)}
            onDelete={() => onDelete(t.id)}
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
}: {
  todo: Todo
  onToggle: (done: boolean) => void
  onDelete: () => void
}) {
  return (
    <motion.div
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      layout
      className="group flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-2.5 hover:border-foreground/20 transition-colors"
    >
      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={() => onToggle(!t.done)}
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
          t.done
            ? "border-foreground bg-foreground text-background"
            : "border-border hover:border-foreground/50"
        }`}
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

      <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${priorityDot[t.priority]}`} />

      <span className={`flex-1 text-sm ${t.done ? "line-through text-muted-foreground" : ""}`}>
        {t.title}
      </span>

      {t.due_date && (
        <span
          className={`shrink-0 text-xs ${
            t.due_date < new Date().toISOString().split("T")[0] && !t.done
              ? "text-red-500"
              : "text-muted-foreground"
          }`}
        >
          {new Date(t.due_date + "T00:00:00").toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
          })}
        </span>
      )}

      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={onDelete}
        className="shrink-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X className="h-3.5 w-3.5" />
      </motion.button>
    </motion.div>
  )
}

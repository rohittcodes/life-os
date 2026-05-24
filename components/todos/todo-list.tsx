"use client"

import { useTransition, useRef, useState } from "react"
import { addTodo, toggleTodo, deleteTodo, clearCompleted } from "@/app/(app)/todos/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertTriangle, X } from "lucide-react"
import type { Todo } from "@/lib/types"

const priorityDot = {
  high: "bg-red-500",
  normal: "bg-blue-400",
  low: "bg-muted-foreground/40",
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
      {/* Quick add */}
      <form ref={formRef} onSubmit={handleAdd} className="flex gap-2">
        <Input name="title" required placeholder="Add a task…" className="flex-1" />
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="h-9 w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        <Input name="due_date" type="date" className="w-36" />
        <Button type="submit">Add</Button>
      </form>

      {todos.length === 0 && (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
          No tasks — add something to get started
        </div>
      )}

      {overdue.length > 0 && (
        <Section label="Overdue" icon={<AlertTriangle className="h-3 w-3 text-orange-500" />} todos={overdue} onToggle={(id, done) => startTransition(() => toggleTodo(id, done))} onDelete={(id) => startTransition(() => deleteTodo(id))} warn />
      )}

      {todayTodos.length > 0 && (
        <Section label="Today" todos={todayTodos} onToggle={(id, done) => startTransition(() => toggleTodo(id, done))} onDelete={(id) => startTransition(() => deleteTodo(id))} />
      )}

      {upcoming.length > 0 && (
        <Section label="Upcoming" todos={upcoming} onToggle={(id, done) => startTransition(() => toggleTodo(id, done))} onDelete={(id) => startTransition(() => deleteTodo(id))} />
      )}

      {done.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <button onClick={() => setShowDone((v) => !v)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              {showDone ? "▾" : "▸"} {done.length} completed
            </button>
            <button onClick={() => startTransition(() => clearCompleted())} className="text-xs text-muted-foreground hover:text-destructive transition-colors">
              Clear all
            </button>
          </div>
          {showDone && (
            <div className="space-y-1.5 opacity-60">
              {done.map((t) => (
                <TodoRow key={t.id} todo={t} onToggle={(done) => startTransition(() => toggleTodo(t.id, done))} onDelete={() => startTransition(() => deleteTodo(t.id))} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Section({
  label, icon, todos, onToggle, onDelete, warn,
}: { label: string; icon?: React.ReactNode; todos: Todo[]; onToggle: (id: string, done: boolean) => void; onDelete: (id: string) => void; warn?: boolean }) {
  return (
    <div className="space-y-2">
      <h3 className={`flex items-center gap-1.5 text-xs font-medium ${warn ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground"}`}>
        {icon}{label}
      </h3>
      {todos.map((t) => (
        <TodoRow key={t.id} todo={t} onToggle={(done) => onToggle(t.id, done)} onDelete={() => onDelete(t.id)} />
      ))}
    </div>
  )
}

function TodoRow({ todo: t, onToggle, onDelete }: { todo: Todo; onToggle: (done: boolean) => void; onDelete: () => void }) {
  return (
    <div className="group flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-2.5 hover:border-foreground/20 transition-colors">
      <button
        onClick={() => onToggle(!t.done)}
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
          t.done ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground/50"
        }`}
      >
        {t.done && (
          <svg className="size-3" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        )}
      </button>

      <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${priorityDot[t.priority]}`} />

      <span className={`flex-1 text-sm ${t.done ? "line-through text-muted-foreground" : ""}`}>{t.title}</span>

      {t.due_date && (
        <span className={`shrink-0 text-xs ${t.due_date < new Date().toISOString().split("T")[0] && !t.done ? "text-red-500" : "text-muted-foreground"}`}>
          {new Date(t.due_date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
        </span>
      )}

      <button onClick={onDelete} className="shrink-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toggleTodo } from "@/app/(app)/todos/actions"
import { queryKeys } from "@/lib/query-keys"
import { AnimatePresence, motion } from "motion/react"
import { cn } from "@/lib/utils"
import type { Todo } from "@/lib/types"

interface Props {
  initialTodos: Todo[]
  overdue: Todo[]
  dueToday: Todo[]
  noDueDate: Todo[]
}

export function TodayTodos({ initialTodos, overdue, dueToday, noDueDate }: Props) {
  const qc = useQueryClient()

  const toggleMutation = useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) => toggleTodo(id, done),
    onMutate: async ({ id, done }) => {
      await qc.cancelQueries({ queryKey: queryKeys.todos() })
      const prev = qc.getQueryData<Todo[]>(queryKeys.todos())
      qc.setQueryData<Todo[]>(queryKeys.todos(), old =>
        old?.map(t => t.id === id ? { ...t, done, ...(done ? { progress: 100 } : {}) } : t) ?? []
      )
      return { prev }
    },
    onError: (_, __, ctx) => qc.setQueryData(queryKeys.todos(), ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.todos() }),
  })

  const today = new Date().toISOString().split("T")[0]

  return (
    <div className="space-y-3">
      {overdue.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-orange-600 dark:text-orange-400">Overdue · {overdue.length}</p>
          <AnimatePresence initial={false}>
            {overdue.map(t => (
              <TodoQuickRow
                key={t.id}
                todo={t}
                today={today}
                onToggle={done => toggleMutation.mutate({ id: t.id, done })}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {dueToday.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Due today · {dueToday.length}</p>
          <AnimatePresence initial={false}>
            {dueToday.map(t => (
              <TodoQuickRow
                key={t.id}
                todo={t}
                today={today}
                onToggle={done => toggleMutation.mutate({ id: t.id, done })}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {noDueDate.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">No date</p>
          <AnimatePresence initial={false}>
            {noDueDate.map(t => (
              <TodoQuickRow
                key={t.id}
                todo={t}
                today={today}
                onToggle={done => toggleMutation.mutate({ id: t.id, done })}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

const priorityDot: Record<string, string> = {
  high: "bg-red-500",
  normal: "bg-blue-400",
  low: "bg-muted-foreground/40",
}

function TodoQuickRow({ todo: t, today, onToggle }: { todo: Todo; today: string; onToggle: (done: boolean) => void }) {
  const isOverdue = !!t.due_date && t.due_date < today

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -8 }}
      transition={{ duration: 0.15 }}
      className={cn(
        "flex items-center gap-3 rounded-xl border px-4 py-2.5 transition-colors",
        isOverdue ? "border-orange-500/20 bg-orange-500/5" : "border-border bg-card",
      )}
    >
      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={() => onToggle(!t.done)}
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
          t.done ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground/50",
        )}
      >
        {t.done && (
          <svg className="size-3" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        )}
      </motion.button>

      <div className={cn("h-1.5 w-1.5 rounded-full shrink-0", priorityDot[t.priority])} />

      <span className={cn("flex-1 min-w-0 truncate text-sm", t.done && "line-through text-muted-foreground")}>
        {t.title}
      </span>

      {t.progress > 0 && t.progress < 100 && (
        <span className="text-xs text-muted-foreground shrink-0">{t.progress}%</span>
      )}
      {t.due_date && (
        <span className={cn("text-xs shrink-0", isOverdue ? "text-red-500" : "text-muted-foreground")}>
          {new Date(t.due_date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
        </span>
      )}
    </motion.div>
  )
}

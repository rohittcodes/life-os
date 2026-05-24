import { createClient } from "@/lib/supabase/server"

export const metadata = { title: "To-Do" }
import { TodoList } from "@/components/todos/todo-list"
import type { Todo } from "@/lib/types"

export default async function TodosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: todos = [] } = await supabase
    .from("todos")
    .select("*")
    .eq("user_id", user!.id)
    .order("done")
    .order("priority", { ascending: false })
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at")

  const allTodos: Todo[] = todos ?? []
  const pending = allTodos.filter((t) => !t.done).length
  const done = allTodos.filter((t) => t.done).length
  const today = new Date().toISOString().split("T")[0]
  const overdue = allTodos.filter((t) => !t.done && t.due_date && t.due_date < today).length

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">To-Do</h1>
          <p className="text-sm text-muted-foreground">
            {pending} pending · {done} done{overdue > 0 ? ` · ${overdue} overdue` : ""}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Pending", value: pending },
          { label: "Done today", value: done },
          { label: "Overdue", value: overdue, warn: overdue > 0 },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border bg-card p-4 ${s.warn ? "border-red-500/30" : "border-border"}`}>
            <div className={`text-2xl font-bold ${s.warn ? "text-red-500" : ""}`}>{s.value}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      <TodoList todos={allTodos} />
    </div>
  )
}

import { createClient } from "@/lib/supabase/client"
import type { Todo } from "@/lib/types"

export async function fetchTodos(): Promise<Todo[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("todos")
    .select("*")
    .order("done")
    .order("priority", { ascending: false })
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at")
    .limit(200)
  if (error) throw error
  return data ?? []
}

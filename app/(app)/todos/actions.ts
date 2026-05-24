"use server"

import { revalidatePath } from "next/cache"
import { requireUser } from "@/lib/auth"

export async function addTodo(fd: FormData) {
  const { supabase, user } = await requireUser()
  const title = fd.get("title") as string
  const priority = (fd.get("priority") as string) || "normal"
  const due_date = (fd.get("due_date") as string) || null
  const category = (fd.get("category") as string) || null
  if (!title?.trim()) return
  await supabase.from("todos").insert({ user_id: user.id, title: title.trim(), priority, due_date, category })
  revalidatePath("/todos")
}

export async function toggleTodo(id: string, done: boolean) {
  const { supabase, user } = await requireUser()
  await supabase.from("todos").update({ done }).eq("id", id).eq("user_id", user.id)
  revalidatePath("/todos")
}

export async function deleteTodo(id: string) {
  const { supabase, user } = await requireUser()
  await supabase.from("todos").delete().eq("id", id).eq("user_id", user.id)
  revalidatePath("/todos")
}

export async function clearCompleted() {
  const { supabase, user } = await requireUser()
  await supabase.from("todos").delete().eq("user_id", user.id).eq("done", true)
  revalidatePath("/todos")
}

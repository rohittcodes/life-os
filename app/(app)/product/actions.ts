"use server"

import { requireUser } from "@/lib/auth"
import { revalidatePath } from "next/cache"

const VALID_STATUSES = new Set(["todo", "in_progress", "blocked", "done"])
const VALID_PRIORITIES = new Set([1, 2, 3])
const VALID_MILESTONES = new Set(["MVP canvas", "Agent executor", "Auth + onboarding", "Public launch", "Backlog"])

export async function addTask(formData: FormData) {
  const { supabase, user } = await requireUser()

  const title = (formData.get("title") as string)?.trim()
  const status = formData.get("status") as string
  const milestone = formData.get("milestone") as string
  const priority = parseInt(formData.get("priority") as string)

  if (!title || !VALID_STATUSES.has(status) || !VALID_PRIORITIES.has(priority as 1|2|3)) return
  if (milestone && !VALID_MILESTONES.has(milestone)) return

  await supabase.from("product_tasks").insert({
    user_id: user.id,
    title,
    milestone: milestone || null,
    status,
    priority,
    due_date: (formData.get("due_date") as string) || null,
    notes: (formData.get("notes") as string)?.trim() || null,
  })

  revalidatePath("/product")
  revalidatePath("/dashboard")
}

export async function updateTaskStatus(id: string, status: string) {
  if (!VALID_STATUSES.has(status)) return
  const { supabase, user } = await requireUser()

  await supabase
    .from("product_tasks")
    .update({ status })
    .eq("id", id)
    .eq("user_id", user.id)

  revalidatePath("/product")
}

export async function deleteTask(id: string) {
  const { supabase, user } = await requireUser()

  await supabase
    .from("product_tasks")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)

  revalidatePath("/product")
}

export async function updateTaskNotes(id: string, notes: string | null) {
  const { supabase, user } = await requireUser()
  await supabase.from("product_tasks").update({ notes }).eq("id", id).eq("user_id", user.id)
  revalidatePath("/product")
}

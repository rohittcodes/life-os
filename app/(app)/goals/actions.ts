"use server"

import { requireUser } from "@/lib/auth"
import { revalidatePath } from "next/cache"

const VALID_CATEGORIES = new Set(["health","career","finance","personal","learning","relationships"])
const VALID_STATUSES = new Set(["active","completed","abandoned"])

export async function addGoal(formData: FormData) {
  const { supabase, user } = await requireUser()
  const title = (formData.get("title") as string)?.trim()
  const category = formData.get("category") as string
  if (!title || !VALID_CATEGORIES.has(category)) return

  await supabase.from("goals").insert({
    user_id: user.id,
    title,
    description: (formData.get("description") as string)?.trim() || null,
    category,
    timeframe: (formData.get("timeframe") as string)?.trim() || null,
    status: "active",
    progress: 0,
    due_date: (formData.get("due_date") as string) || null,
  })
  revalidatePath("/goals")
}

export async function updateGoalProgress(id: string, progress: number) {
  if (progress < 0 || progress > 100) return
  const { supabase, user } = await requireUser()
  const status = progress === 100 ? "completed" : "active"
  await supabase.from("goals").update({ progress, status }).eq("id", id).eq("user_id", user.id)
  revalidatePath("/goals")
}

export async function updateGoalStatus(id: string, status: string) {
  if (!VALID_STATUSES.has(status)) return
  const { supabase, user } = await requireUser()
  await supabase.from("goals").update({ status }).eq("id", id).eq("user_id", user.id)
  revalidatePath("/goals")
}

export async function deleteGoal(id: string) {
  const { supabase, user } = await requireUser()
  await supabase.from("goals").delete().eq("id", id).eq("user_id", user.id)
  revalidatePath("/goals")
}

export async function addMilestone(formData: FormData) {
  const { supabase, user } = await requireUser()
  const goal_id = formData.get("goal_id") as string
  const title = (formData.get("title") as string)?.trim()
  if (!goal_id || !title) return

  await supabase.from("goal_milestones").insert({
    user_id: user.id,
    goal_id,
    title,
    due_date: (formData.get("due_date") as string) || null,
  })
  revalidatePath("/goals")
}

export async function toggleMilestone(id: string, completed: boolean) {
  const { supabase, user } = await requireUser()
  await supabase.from("goal_milestones").update({ completed }).eq("id", id).eq("user_id", user.id)
  revalidatePath("/goals")
}

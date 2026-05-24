"use server"

import { revalidatePath } from "next/cache"
import { requireUser } from "@/lib/auth"

export async function addRoutineItem(fd: FormData) {
  const { supabase, user } = await requireUser()
  const title = (fd.get("title") as string)?.trim()
  const icon = (fd.get("icon") as string) || "✅"
  if (!title) return
  await supabase.from("routine_items").insert({ user_id: user.id, title, icon })
  revalidatePath("/routine")
}

export async function deleteRoutineItem(id: string) {
  const { supabase, user } = await requireUser()
  await supabase.from("routine_items").delete().eq("id", id).eq("user_id", user.id)
  revalidatePath("/routine")
}

export async function saveRoutineLog(date: string, completedIds: string[], mood: number | null, notes: string) {
  const { supabase, user } = await requireUser()
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return
  await supabase.from("routine_logs").upsert(
    {
      user_id: user.id,
      log_date: date,
      completed_item_ids: completedIds,
      mood_start: mood,
      notes: notes || null,
    },
    { onConflict: "user_id,log_date" }
  )
  revalidatePath("/routine")
}

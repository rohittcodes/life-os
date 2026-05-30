"use server"

import { requireUser } from "@/lib/auth"
import { revalidatePath } from "next/cache"

export async function upsertHabitLog(formData: FormData) {
  const { supabase, user } = await requireUser()

  const log_date = formData.get("log_date") as string
  if (!log_date || !/^\d{4}-\d{2}-\d{2}$/.test(log_date)) return

  const sleep_hrs_raw = parseFloat(formData.get("sleep_hrs") as string)
  const sleep_hrs = !isNaN(sleep_hrs_raw) && sleep_hrs_raw >= 0 && sleep_hrs_raw <= 24
    ? sleep_hrs_raw
    : null

  const { error } = await supabase.from("habit_logs").upsert(
    {
      user_id: user.id,
      log_date,
      gym_done: formData.get("gym_done") === "true",
      english_done: formData.get("english_done") === "true",
      diet_clean: formData.get("diet_clean") === "true",
      sleep_hrs,
    },
    { onConflict: "user_id,log_date" }
  )

  if (error) throw new Error(error.message)
}

export async function toggleCustomHabit(date: string, habitId: string, done: boolean) {
  const { supabase, user } = await requireUser()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return

  const { data: existing } = await supabase
    .from("habit_logs")
    .select("id, custom_done")
    .eq("user_id", user.id)
    .eq("log_date", date)
    .single()

  const customDone = (existing?.custom_done as Record<string, boolean>) ?? {}
  customDone[habitId] = done

  if (existing) {
    await supabase.from("habit_logs").update({ custom_done: customDone }).eq("id", existing.id)
  } else {
    await supabase.from("habit_logs").insert({
      user_id: user.id,
      log_date: date,
      gym_done: false,
      english_done: false,
      diet_clean: false,
      custom_done: customDone,
    })
  }

}

export async function createHabitDefinition(formData: FormData) {
  const { supabase, user } = await requireUser()
  const name = (formData.get("name") as string)?.trim()
  if (!name) return

  const { data: existing } = await supabase
    .from("habit_definitions")
    .select("sort_order")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: false })
    .limit(1)

  const sort_order = (existing?.[0]?.sort_order ?? -1) + 1

  await supabase.from("habit_definitions").insert({
    user_id: user.id,
    name,
    icon: (formData.get("icon") as string) || "circle",
    color: (formData.get("color") as string) || "#6366f1",
    sort_order,
  })

  revalidatePath("/habits")
}

export async function deleteHabitDefinition(id: string) {
  const { supabase, user } = await requireUser()
  await supabase.from("habit_definitions").delete().eq("id", id).eq("user_id", user.id)
  revalidatePath("/habits")
}

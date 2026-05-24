"use server"

import { revalidatePath } from "next/cache"
import { requireUser } from "@/lib/auth"

export async function startTimer(description: string, projectId: string | null, tag: string | null) {
  const { supabase, user } = await requireUser()
  // Stop any running timers first
  const { data: running } = await supabase
    .from("time_entries").select("id").eq("user_id", user.id).is("ended_at", null).limit(1)
  if (running?.length) {
    const id = running[0].id
    await supabase.from("time_entries").update({
      ended_at: new Date().toISOString(),
      duration_minutes: 0,
    }).eq("id", id).eq("user_id", user.id)
  }

  await supabase.from("time_entries").insert({
    user_id: user.id,
    description: description || "Work session",
    project_id: projectId || null,
    tag: tag || null,
    started_at: new Date().toISOString(),
  })
  revalidatePath("/time")
}

export async function stopTimer(id: string) {
  const { supabase, user } = await requireUser()
  const { data } = await supabase.from("time_entries").select("started_at").eq("id", id).eq("user_id", user.id).single()
  if (!data) return
  const duration = Math.round((Date.now() - new Date(data.started_at).getTime()) / 60000)
  await supabase.from("time_entries").update({
    ended_at: new Date().toISOString(),
    duration_minutes: Math.max(1, duration),
  }).eq("id", id).eq("user_id", user.id)
  revalidatePath("/time")
}

export async function deleteEntry(id: string) {
  const { supabase, user } = await requireUser()
  await supabase.from("time_entries").delete().eq("id", id).eq("user_id", user.id)
  revalidatePath("/time")
}

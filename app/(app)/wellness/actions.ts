"use server"

import { revalidatePath } from "next/cache"
import { requireUser } from "@/lib/auth"

export async function upsertWellness(fd: FormData) {
  const { supabase, user } = await requireUser()
  const log_date = fd.get("log_date") as string
  const mood = fd.get("mood") ? parseInt(fd.get("mood") as string) : null
  const energy = fd.get("energy") ? parseInt(fd.get("energy") as string) : null
  const sleep_hours = fd.get("sleep_hours") ? parseFloat(fd.get("sleep_hours") as string) : null
  const water_glasses = fd.get("water_glasses") ? parseInt(fd.get("water_glasses") as string) : 0
  const steps = fd.get("steps") ? parseInt(fd.get("steps") as string) : null
  const notes = (fd.get("notes") as string) || null

  if (!log_date) return

  await supabase.from("wellness_logs").upsert(
    { user_id: user.id, log_date, mood, energy, sleep_hours, water_glasses, steps, notes },
    { onConflict: "user_id,log_date" }
  )
  revalidatePath("/wellness")
}

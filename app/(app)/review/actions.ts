"use server"

import { requireUser } from "@/lib/auth"
import { revalidatePath } from "next/cache"

export async function saveReview(formData: FormData) {
  const { supabase, user } = await requireUser()

  const week_start = formData.get("week_start") as string
  if (!week_start || !/^\d{4}-\d{2}-\d{2}$/.test(week_start)) return

  const energy_raw = parseInt(formData.get("energy_score") as string)
  const energy_score = !isNaN(energy_raw) && energy_raw >= 1 && energy_raw <= 10
    ? energy_raw
    : null

  await supabase.from("weekly_reviews").upsert(
    {
      user_id: user.id,
      week_start,
      wins: (formData.get("wins") as string)?.trim() || null,
      blockers: (formData.get("blockers") as string)?.trim() || null,
      next_week_focus: (formData.get("next_week_focus") as string)?.trim() || null,
      energy_score,
    },
    { onConflict: "user_id,week_start" }
  )

  revalidatePath("/review")
  revalidatePath("/dashboard")
}

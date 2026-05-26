"use server"

import { revalidatePath } from "next/cache"
import { requireUser } from "@/lib/auth"

export async function upsertBudget(category: string, monthly_limit: number) {
  if (!category || monthly_limit <= 0) return
  const { supabase, user } = await requireUser()
  await supabase
    .from("finance_budgets")
    .upsert({ user_id: user.id, category, monthly_limit }, { onConflict: "user_id,category" })
  revalidatePath("/finance")
}

export async function deleteBudget(id: string) {
  const { supabase, user } = await requireUser()
  await supabase.from("finance_budgets").delete().eq("id", id).eq("user_id", user.id)
  revalidatePath("/finance")
}

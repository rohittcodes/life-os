"use server"

import { requireUser } from "@/lib/auth"
import { revalidatePath } from "next/cache"

const VALID_TYPES = new Set(["income", "expense"])
const VALID_INCOME_CATS = new Set(["salary", "freelance", "other"])
const VALID_EXPENSE_CATS = new Set(["food", "transport", "subscriptions", "learning", "misc"])

export async function addEntry(formData: FormData) {
  const { supabase, user } = await requireUser()

  const type = formData.get("type") as string
  const category = formData.get("category") as string
  const amount_raw = parseFloat(formData.get("amount") as string)
  const entry_date = formData.get("entry_date") as string

  if (!VALID_TYPES.has(type)) return
  const validCats = type === "income" ? VALID_INCOME_CATS : VALID_EXPENSE_CATS
  if (!validCats.has(category)) return
  if (isNaN(amount_raw) || amount_raw <= 0) return
  if (!entry_date || !/^\d{4}-\d{2}-\d{2}$/.test(entry_date)) return

  await supabase.from("finance_entries").insert({
    user_id: user.id,
    type,
    source: (formData.get("source") as string)?.trim() || null,
    category,
    amount: amount_raw,
    entry_date,
    notes: (formData.get("notes") as string)?.trim() || null,
  })

  revalidatePath("/finance")
  revalidatePath("/dashboard")
}

export async function deleteEntry(id: string) {
  const { supabase, user } = await requireUser()
  await supabase.from("finance_entries").delete().eq("id", id).eq("user_id", user.id)
  revalidatePath("/finance")
  revalidatePath("/dashboard")
}

export async function updateEntry(id: string, formData: FormData) {
  const { supabase, user } = await requireUser()

  const type = formData.get("type") as string
  const category = formData.get("category") as string
  const amount_raw = parseFloat(formData.get("amount") as string)
  const entry_date = formData.get("entry_date") as string

  if (!VALID_TYPES.has(type)) return
  const validCats = type === "income" ? VALID_INCOME_CATS : VALID_EXPENSE_CATS
  if (!validCats.has(category)) return
  if (isNaN(amount_raw) || amount_raw <= 0) return
  if (!entry_date || !/^\d{4}-\d{2}-\d{2}$/.test(entry_date)) return

  await supabase
    .from("finance_entries")
    .update({
      type,
      source: (formData.get("source") as string)?.trim() || null,
      category,
      amount: amount_raw,
      entry_date,
      notes: (formData.get("notes") as string)?.trim() || null,
    })
    .eq("id", id)
    .eq("user_id", user.id)

  revalidatePath("/finance")
  revalidatePath("/dashboard")
}

export async function upsertBudgetLimit(fd: FormData) {
  const { supabase, user } = await requireUser()
  const category = (fd.get("category") as string)?.trim().toLowerCase()
  const monthly_limit = parseFloat(fd.get("monthly_limit") as string)
  if (!category || isNaN(monthly_limit) || monthly_limit <= 0) return
  await supabase.from("budget_limits").upsert(
    { user_id: user.id, category, monthly_limit },
    { onConflict: "user_id,category" }
  )
  revalidatePath("/finance")
}

export async function deleteBudgetLimit(id: string) {
  const { supabase, user } = await requireUser()
  await supabase.from("budget_limits").delete().eq("id", id).eq("user_id", user.id)
  revalidatePath("/finance")
}

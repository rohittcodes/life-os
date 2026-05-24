"use server"

import { requireUser } from "@/lib/auth"
import { revalidatePath } from "next/cache"

const VALID_RELATIONSHIPS = new Set(["friend","colleague","mentor","client","recruiter","professional","other"])
const VALID_SUB_CYCLES = new Set(["weekly","monthly","quarterly","yearly"])
const VALID_SUB_CATS = new Set(["streaming","productivity","cloud","learning","health","finance","misc"])

export async function addContact(formData: FormData) {
  const { supabase, user } = await requireUser()
  const name = (formData.get("name") as string)?.trim()
  const relationship = formData.get("relationship") as string
  if (!name || !VALID_RELATIONSHIPS.has(relationship)) return

  const warmth = parseInt(formData.get("warmth") as string)
  await supabase.from("contacts").insert({
    user_id: user.id,
    name,
    email: (formData.get("email") as string)?.trim() || null,
    phone: (formData.get("phone") as string)?.trim() || null,
    company: (formData.get("company") as string)?.trim() || null,
    role: (formData.get("role") as string)?.trim() || null,
    relationship,
    warmth: !isNaN(warmth) && warmth >= 1 && warmth <= 5 ? warmth : 3,
    last_contacted_at: (formData.get("last_contacted_at") as string) || null,
    next_follow_up: (formData.get("next_follow_up") as string) || null,
    notes: (formData.get("notes") as string)?.trim() || null,
  })
  revalidatePath("/contacts")
}

export async function markContacted(id: string) {
  const { supabase, user } = await requireUser()
  await supabase.from("contacts").update({
    last_contacted_at: new Date().toISOString().split("T")[0],
  }).eq("id", id).eq("user_id", user.id)
  revalidatePath("/contacts")
}

export async function deleteContact(id: string) {
  const { supabase, user } = await requireUser()
  await supabase.from("contacts").delete().eq("id", id).eq("user_id", user.id)
  revalidatePath("/contacts")
}

export async function addSubscription(formData: FormData) {
  const { supabase, user } = await requireUser()
  const name = (formData.get("name") as string)?.trim()
  const amount_raw = parseFloat(formData.get("amount") as string)
  const billing_cycle = formData.get("billing_cycle") as string
  const category = formData.get("category") as string

  if (!name || isNaN(amount_raw) || !VALID_SUB_CYCLES.has(billing_cycle) || !VALID_SUB_CATS.has(category)) return

  await supabase.from("subscriptions").insert({
    user_id: user.id,
    name,
    amount: amount_raw,
    billing_cycle,
    category,
    next_billing_date: (formData.get("next_billing_date") as string) || null,
    url: (formData.get("url") as string)?.trim() || null,
    notes: (formData.get("notes") as string)?.trim() || null,
    active: true,
  })
  revalidatePath("/contacts")
}

export async function toggleSubscription(id: string, active: boolean) {
  const { supabase, user } = await requireUser()
  await supabase.from("subscriptions").update({ active }).eq("id", id).eq("user_id", user.id)
  revalidatePath("/contacts")
}

export async function deleteSubscription(id: string) {
  const { supabase, user } = await requireUser()
  await supabase.from("subscriptions").delete().eq("id", id).eq("user_id", user.id)
  revalidatePath("/contacts")
}

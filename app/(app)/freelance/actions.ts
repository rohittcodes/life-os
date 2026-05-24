"use server"

import { requireUser } from "@/lib/auth"
import { revalidatePath } from "next/cache"

const VALID_STATUSES = new Set(["negotiating", "active", "delivered", "paid", "on_hold"])
const VALID_RATE_TYPES = new Set(["hourly", "fixed"])

export async function addClient(formData: FormData) {
  const { supabase, user } = await requireUser()

  const client_name = (formData.get("client_name") as string)?.trim()
  const project = (formData.get("project") as string)?.trim()
  const status = formData.get("status") as string

  if (!client_name || !project || !VALID_STATUSES.has(status)) return

  const rate_raw = parseFloat(formData.get("rate") as string)
  const agreed_raw = parseFloat(formData.get("amount_agreed") as string)
  const rate_type = formData.get("rate_type") as string

  await supabase.from("freelance_clients").insert({
    user_id: user.id,
    client_name,
    project,
    rate: !isNaN(rate_raw) ? rate_raw : null,
    rate_type: VALID_RATE_TYPES.has(rate_type) ? rate_type : null,
    status,
    deadline: (formData.get("deadline") as string) || null,
    amount_agreed: !isNaN(agreed_raw) ? agreed_raw : null,
    amount_paid: 0,
    notes: (formData.get("notes") as string)?.trim() || null,
  })

  revalidatePath("/freelance")
  revalidatePath("/dashboard")
}

export async function updateClientStatus(id: string, status: string) {
  if (!VALID_STATUSES.has(status)) return
  const { supabase, user } = await requireUser()

  await supabase
    .from("freelance_clients")
    .update({ status })
    .eq("id", id)
    .eq("user_id", user.id)

  revalidatePath("/freelance")
}

export async function markPaid(id: string, amount: number) {
  if (amount < 0) return
  const { supabase, user } = await requireUser()

  await supabase
    .from("freelance_clients")
    .update({ amount_paid: amount, status: "paid" })
    .eq("id", id)
    .eq("user_id", user.id)

  revalidatePath("/freelance")
  revalidatePath("/dashboard")
}

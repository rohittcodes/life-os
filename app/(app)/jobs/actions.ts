"use server"

import { requireUser } from "@/lib/auth"
import { revalidatePath } from "next/cache"

const VALID_STATUSES = new Set(["applied", "screen", "interview", "offer", "rejected", "ghosted"])

export async function addJob(formData: FormData) {
  const { supabase, user } = await requireUser()

  const company = (formData.get("company") as string)?.trim()
  const role = (formData.get("role") as string)?.trim()
  const status = formData.get("status") as string
  const applied_at = formData.get("applied_at") as string

  if (!company || !role || !VALID_STATUSES.has(status) || !applied_at) return

  const salary_raw = parseInt(formData.get("salary_lpa") as string)
  const next_action_date = (formData.get("next_action_date") as string) || null

  await supabase.from("job_applications").insert({
    user_id: user.id,
    company,
    role,
    salary_lpa: !isNaN(salary_raw) ? salary_raw : null,
    status,
    applied_at,
    next_action_date,
    notes: (formData.get("notes") as string)?.trim() || null,
  })

  revalidatePath("/jobs")
  revalidatePath("/dashboard")
}

export async function updateJobStatus(id: string, status: string) {
  if (!VALID_STATUSES.has(status)) return
  const { supabase, user } = await requireUser()

  await supabase
    .from("job_applications")
    .update({ status })
    .eq("id", id)
    .eq("user_id", user.id)

  revalidatePath("/jobs")
  revalidatePath("/dashboard")
}

export async function deleteJob(id: string) {
  const { supabase, user } = await requireUser()

  await supabase
    .from("job_applications")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)

  revalidatePath("/jobs")
  revalidatePath("/dashboard")
}

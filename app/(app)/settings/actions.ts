"use server"

import { requireUser } from "@/lib/auth"
import { generateApiKey } from "@/lib/api-key"
import { revalidatePath } from "next/cache"

export async function saveAiSettings(formData: FormData) {
  const { supabase, user } = await requireUser()
  const provider = (formData.get("provider") as string) ?? "anthropic"

  const update: Record<string, string> = { ai_provider: provider }
  const keyMap: Record<string, string> = {
    anthropic_key: "ai_anthropic_key",
    openai_key: "ai_openai_key",
    gemini_key: "ai_gemini_key",
    groq_key: "ai_groq_key",
  }
  for (const [field, col] of Object.entries(keyMap)) {
    const val = (formData.get(field) as string)?.trim()
    if (val) update[col] = val
  }

  await supabase.from("user_profiles").upsert({ id: user.id, ...update }, { onConflict: "id" })
  revalidatePath("/settings")
}

export async function createApiKey(formData: FormData): Promise<{ key: string } | null> {
  const { supabase, user } = await requireUser()
  const name = (formData.get("name") as string)?.trim()
  if (!name) return null

  const { full, prefix, hash } = generateApiKey()
  const resolvedHash = await hash

  await supabase.from("api_keys").insert({
    user_id: user.id,
    name,
    key_hash: resolvedHash,
    key_prefix: prefix,
  })

  revalidatePath("/settings")
  return { key: full }
}

export async function saveAuthorProfile(formData: FormData) {
  const { supabase, user } = await requireUser()
  const username = (formData.get("username") as string)?.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "") || null
  await supabase
    .from("user_profiles")
    .update({
      display_name: (formData.get("display_name") as string)?.trim() || null,
      author_bio:   (formData.get("author_bio")   as string)?.trim() || null,
      avatar_url:   (formData.get("avatar_url")   as string)?.trim() || null,
      website_url:  (formData.get("website_url")  as string)?.trim() || null,
      username,
    })
    .eq("id", user.id)
  revalidatePath("/settings")
}

export async function revokeApiKey(id: string) {
  const { supabase, user } = await requireUser()
  await supabase
    .from("api_keys")
    .update({ revoked: true })
    .eq("id", id)
    .eq("user_id", user.id)
  revalidatePath("/settings")
}

export async function checkUsernameAvailability(username: string): Promise<{ available: boolean; reason?: string }> {
  const cleaned = username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "")
  if (!cleaned || cleaned.length < 3) return { available: false, reason: "min 3 characters" }
  if (cleaned.length > 30) return { available: false, reason: "max 30 characters" }

  const { supabase, user } = await requireUser()
  const { data } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("username", cleaned)
    .neq("id", user.id)
    .maybeSingle()

  return { available: !data }
}

export async function saveCurrencySettings(formData: FormData) {
  const { supabase, user } = await requireUser()
  const currency = (formData.get("currency") as string)?.trim().toUpperCase() || "INR"
  await supabase
    .from("user_profiles")
    .update({ currency })
    .eq("id", user.id)
  revalidatePath("/settings")
  revalidatePath("/finance")
}

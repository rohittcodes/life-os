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

export async function revokeApiKey(id: string) {
  const { supabase, user } = await requireUser()
  await supabase
    .from("api_keys")
    .update({ revoked: true })
    .eq("id", id)
    .eq("user_id", user.id)
  revalidatePath("/settings")
}

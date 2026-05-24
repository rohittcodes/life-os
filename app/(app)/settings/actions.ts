"use server"

import { requireUser } from "@/lib/auth"
import { generateApiKey } from "@/lib/api-key"
import { revalidatePath } from "next/cache"

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

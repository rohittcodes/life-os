import { createClient } from "@/lib/supabase/server"

export function generateApiKey(): { full: string; prefix: string; hash: Promise<string> } {
  const random = Array.from(crypto.getRandomValues(new Uint8Array(24)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
  const full = `los_${random}`
  const prefix = full.slice(0, 12)
  const hash = crypto.subtle
    .digest("SHA-256", new TextEncoder().encode(full))
    .then((buf) =>
      Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
    )
  return { full, prefix, hash }
}

export async function hashKey(key: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

export async function verifyApiKey(
  authHeader: string | null
): Promise<boolean> {
  if (!authHeader?.startsWith("Bearer ")) return false
  const key = authHeader.slice(7).trim()
  if (!key.startsWith("los_")) return false

  const hash = await hashKey(key)
  const supabase = await createClient()

  const { data } = await supabase
    .from("api_keys")
    .select("id")
    .eq("key_hash", hash)
    .eq("revoked", false)
    .single()

  if (!data) return false

  // Update last_used_at asynchronously (don't await)
  supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("key_hash", hash)
    .then(() => {})

  return true
}

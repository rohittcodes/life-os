import { createClient } from "@/lib/supabase/server"

// GET — returns (or generates) the user's personal activity sync token
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("activity_sync_token")
    .eq("id", user.id)
    .single()

  if (profile?.activity_sync_token) {
    return Response.json({ token: profile.activity_sync_token })
  }

  // Generate a new token (two UUIDs concatenated → 73 chars, random enough)
  const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "")

  await supabase
    .from("user_profiles")
    .update({ activity_sync_token: token })
    .eq("id", user.id)

  return Response.json({ token })
}

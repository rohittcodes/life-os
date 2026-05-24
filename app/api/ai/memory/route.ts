import { createClient } from "@/lib/supabase/server"

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { action, fact, index } = await req.json() as {
    action: "add" | "remove"
    fact?: string
    index?: number
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("ai_memory")
    .eq("id", user.id)
    .single()

  const current: string[] = profile?.ai_memory ?? []

  if (action === "add" && fact?.trim()) {
    const updated = [...current, fact.trim()].slice(-20) // cap at 20 facts
    await supabase.from("user_profiles").update({ ai_memory: updated }).eq("id", user.id)
    return Response.json({ memory: updated })
  }

  if (action === "remove" && typeof index === "number") {
    const updated = current.filter((_, i) => i !== index)
    await supabase.from("user_profiles").update({ ai_memory: updated }).eq("id", user.id)
    return Response.json({ memory: updated })
  }

  return Response.json({ error: "Invalid action" }, { status: 400 })
}

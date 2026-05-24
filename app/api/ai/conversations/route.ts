import { createClient } from "@/lib/supabase/server"

// GET — list all conversations for the current user
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { data, error } = await supabase
    .from("ai_conversations")
    .select("id, title, provider, model, created_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(50)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ conversations: data ?? [] })
}

// POST — create a new conversation
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { title, provider, model } = await req.json() as {
    title?: string
    provider?: string
    model?: string
  }

  const { data, error } = await supabase
    .from("ai_conversations")
    .insert({
      user_id: user.id,
      title: title ?? "New chat",
      provider: provider ?? "anthropic",
      model: model ?? null,
    })
    .select("id, title, provider, model, created_at, updated_at")
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ conversation: data })
}

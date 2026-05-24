import { createClient } from "@/lib/supabase/server"

// GET — get conversation + its messages
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const [{ data: conversation }, { data: messages }] = await Promise.all([
    supabase
      .from("ai_conversations")
      .select("id, title, provider, model, created_at, updated_at")
      .eq("id", id)
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("ai_messages")
      .select("id, role, content, parts, created_at")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true }),
  ])

  if (!conversation) return Response.json({ error: "Not found" }, { status: 404 })
  return Response.json({ conversation, messages: messages ?? [] })
}

// PUT — save messages + update title/meta
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { title, messages, provider, model } = await req.json() as {
    title?: string
    messages?: Array<{ role: string; content: string; parts?: unknown }>
    provider?: string
    model?: string
  }

  // Verify ownership
  const { data: conv } = await supabase
    .from("ai_conversations")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()
  if (!conv) return Response.json({ error: "Not found" }, { status: 404 })

  // Update conversation meta
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (title) updates.title = title
  if (provider) updates.provider = provider
  if (model !== undefined) updates.model = model

  await supabase.from("ai_conversations").update(updates).eq("id", id)

  // Replace all messages if provided
  if (messages) {
    await supabase.from("ai_messages").delete().eq("conversation_id", id)
    if (messages.length > 0) {
      await supabase.from("ai_messages").insert(
        messages.map(m => ({
          conversation_id: id,
          role: m.role,
          content: m.content,
          parts: m.parts ?? null,
        }))
      )
    }
  }

  return Response.json({ ok: true })
}

// DELETE — delete conversation and all messages (cascade handles messages)
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { error } = await supabase
    .from("ai_conversations")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}

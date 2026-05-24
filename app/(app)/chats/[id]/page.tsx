import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import { ChatsClient } from "../chats-client"

export const metadata = { title: "AI Chat" }

export default async function ChatDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [{ data: conversations }, { data: conversation }, { data: messages }] = await Promise.all([
    supabase
      .from("ai_conversations")
      .select("id, title, provider, model, created_at, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(100),
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

  if (!conversation) notFound()

  return (
    <ChatsClient
      initialConversations={conversations ?? []}
      initialSelected={conversation}
      initialMessages={messages ?? []}
    />
  )
}

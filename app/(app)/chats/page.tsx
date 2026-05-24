import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ChatsClient } from "./chats-client"

export const metadata = { title: "AI Chats" }

export default async function ChatsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: conversations } = await supabase
    .from("ai_conversations")
    .select("id, title, provider, model, created_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(100)

  return <ChatsClient initialConversations={conversations ?? []} />
}

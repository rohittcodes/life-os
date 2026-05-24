import { createClient } from "@/lib/supabase/server"
import { executeToolCall, WRITE_TOOLS } from "@/lib/ai/tool-executor"

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json() as { toolName: string; args: unknown; permission: "once" | "always" | "never" }
  const { toolName, args, permission } = body

  if (!WRITE_TOOLS.has(toolName)) {
    return Response.json({ error: "Unknown or non-executable tool" }, { status: 400 })
  }

  // Persist permission change if requested
  if (permission === "always" || permission === "never") {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("ai_tool_permissions")
      .eq("id", user.id)
      .single()

    const updated = {
      ...(profile?.ai_tool_permissions as Record<string, string> ?? {}),
      [toolName]: permission === "always" ? "always" : "never",
    }
    await supabase.from("user_profiles").update({ ai_tool_permissions: updated }).eq("id", user.id)
  }

  if (permission === "never") {
    return Response.json({ success: false, message: `Tool "${toolName}" has been disabled.` })
  }

  const result = await executeToolCall(toolName, args, supabase, user.id)
  return Response.json(result)
}

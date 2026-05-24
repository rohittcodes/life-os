import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const today = new Date().toISOString().split("T")[0]
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0]

  const [
    { data: profile },
    { data: todos },
    { data: habits },
    { data: wellness },
    { data: timer },
    { data: finance },
  ] = await Promise.all([
    supabase.from("user_profiles").select("ai_tool_permissions, ai_memory").eq("id", user.id).single(),
    supabase.from("todos").select("id, title, priority, due_date, done").eq("user_id", user.id).eq("done", false)
      .order("created_at", { ascending: false }).limit(8),
    supabase.from("habit_logs").select("gym_done, english_done, diet_clean").eq("user_id", user.id).eq("log_date", today).maybeSingle(),
    supabase.from("wellness_logs").select("mood, sleep_hours, water_glasses, energy").eq("user_id", user.id).eq("log_date", today).maybeSingle(),
    supabase.from("time_entries").select("description, started_at").eq("user_id", user.id).is("ended_at", null).limit(1),
    supabase.from("finance_entries").select("type, amount").eq("user_id", user.id).gte("entry_date", monthStart),
  ])

  const monthIncome = finance?.filter(e => e.type === "income").reduce((s, e) => s + e.amount, 0) ?? 0
  const monthExpense = finance?.filter(e => e.type === "expense").reduce((s, e) => s + e.amount, 0) ?? 0

  return Response.json({
    todos: todos ?? [],
    habits: habits ?? null,
    wellness: wellness ?? null,
    timer: timer?.[0] ?? null,
    finance: { income: monthIncome, expense: monthExpense, net: monthIncome - monthExpense },
    permissions: (profile?.ai_tool_permissions ?? {}) as Record<string, string>,
    memory: (profile?.ai_memory ?? []) as string[],
    today,
  })
}

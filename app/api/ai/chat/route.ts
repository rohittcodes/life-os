import { createClient } from "@/lib/supabase/server"
import { createAnthropic } from "@ai-sdk/anthropic"
import { createOpenAI } from "@ai-sdk/openai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createGroq } from "@ai-sdk/groq"
import { streamText, tool, stepCountIs, convertToModelMessages } from "ai"
import { z } from "zod"
import { executeToolCall } from "@/lib/ai/tool-executor"

export const maxDuration = 60

const DEFAULT_MODELS: Record<string, string> = {
  anthropic: "claude-haiku-4-5-20251001",
  openai: "gpt-4o-mini",
  gemini: "gemini-2.0-flash",
  groq: "openai/gpt-oss-20b",
}

function getModel(provider: string, keys: Record<string, string | null>, modelId?: string | null) {
  const mid = modelId || DEFAULT_MODELS[provider] || DEFAULT_MODELS["anthropic"]
  switch (provider) {
    case "openai":
      if (!keys.openai) throw new Error("No OpenAI API key. Add it in Settings → AI.")
      return createOpenAI({ apiKey: keys.openai })(mid)
    case "gemini":
      if (!keys.gemini) throw new Error("No Gemini API key. Add it in Settings → AI.")
      return createGoogleGenerativeAI({ apiKey: keys.gemini })(mid)
    case "groq":
      if (!keys.groq) throw new Error("No Groq API key. Add it in Settings → AI.")
      return createGroq({ apiKey: keys.groq })(mid)
    default:
      if (!keys.anthropic) throw new Error("No Anthropic API key. Add it in Settings → AI.")
      return createAnthropic({ apiKey: keys.anthropic })(mid)
  }
}

// ── Permission helpers ────────────────────────────────────────────────────────
type Permission = "allow" | "needs_approval" | "blocked"

function checkPerm(toolPermissions: Record<string, string>, toolName: string): Permission {
  const p = toolPermissions[toolName] ?? "ask"
  if (p === "always") return "allow"
  if (p === "never") return "blocked"
  return "needs_approval"
}

function approvalResult(toolName: string, args: unknown, description: string) {
  return {
    _approval_needed: true,
    _tool: toolName,
    _args: JSON.stringify(args),
    message: description,
  } as const
}

function blockedResult(toolName: string) {
  return {
    _blocked: true,
    message: `"${toolName}" is disabled. Enable it in the AI panel → Permissions.`,
  } as const
}

// ── Page labels for page-aware context ───────────────────────────────────────
const PAGE_LABELS: Record<string, string> = {
  "/dashboard":  "Dashboard (overview of all life areas)",
  "/habits":     "Habits tracker",
  "/todos":      "To-Do list",
  "/notes":      "Daily Notes",
  "/goals":      "Goals",
  "/finance":    "Finance tracker",
  "/wellness":   "Wellness log",
  "/jobs":       "Job applications board",
  "/freelance":  "Work Pipeline",
  "/projects":   "Work Tasks / Sprint board",
  "/product":    "Product tasks",
  "/time":       "Time Tracker",
  "/knowledge":  "Knowledge base",
  "/bookmarks":  "Library / Bookmarks",
  "/contacts":   "People & Subscriptions",
  "/blog":       "Blog",
  "/review":     "Weekly Review",
  "/routine":    "Morning Routine",
  "/chats":      "AI Chats history",
  "/settings":   "Settings",
}

// ── Route ─────────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  const body = await req.json()
  const messages = body.messages ?? []
  const bodyProvider: string | undefined = body.provider
  const bodyModel: string | undefined = body.model
  const currentPage: string | undefined = body.currentPage

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response("Unauthorized", { status: 401 })

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("ai_provider, ai_anthropic_key, ai_openai_key, ai_gemini_key, ai_groq_key, ai_tool_permissions, ai_memory")
    .eq("id", user.id)
    .single()

  const provider = bodyProvider ?? profile?.ai_provider ?? "anthropic"
  const keys = {
    anthropic: profile?.ai_anthropic_key ?? null,
    openai: profile?.ai_openai_key ?? null,
    gemini: profile?.ai_gemini_key ?? null,
    groq: profile?.ai_groq_key ?? null,
  }

  const toolPermissions = (profile?.ai_tool_permissions ?? {}) as Record<string, string>
  const agentMemory: string[] = profile?.ai_memory ?? []

  let model
  try { model = getModel(provider, keys, bodyModel) }
  catch (e) { return Response.json({ error: (e as Error).message }, { status: 400 }) }

  const today = new Date().toISOString().split("T")[0]
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0]

  const [
    { data: todos },
    { data: overdueTodos },
    { data: dueTodayTodos },
    { data: todayHabits },
    { data: recentHabits },
    { data: recentFinance },
    { data: wellness },
    { data: runningTimer },
    { data: activeGoals },
    { data: recentNotes },
  ] = await Promise.all([
    supabase.from("todos").select("id, title, priority, due_date, done, category").eq("user_id", user.id).eq("done", false).order("priority", { ascending: false }).order("due_date", { ascending: true, nullsFirst: false }).limit(15),
    supabase.from("todos").select("title, priority").eq("user_id", user.id).eq("done", false).lt("due_date", today).limit(10),
    supabase.from("todos").select("title, priority").eq("user_id", user.id).eq("done", false).eq("due_date", today).limit(10),
    supabase.from("habit_logs").select("*").eq("user_id", user.id).eq("log_date", today).maybeSingle(),
    supabase.from("habit_logs").select("gym_done, english_done, diet_clean, log_date").eq("user_id", user.id).gte("log_date", sevenDaysAgo).order("log_date", { ascending: false }).limit(7),
    supabase.from("finance_entries").select("type, amount, category, source, entry_date").eq("user_id", user.id).gte("entry_date", monthStart).order("entry_date", { ascending: false }),
    supabase.from("wellness_logs").select("*").eq("user_id", user.id).eq("log_date", today).maybeSingle(),
    supabase.from("time_entries").select("id, description, started_at").eq("user_id", user.id).is("ended_at", null).limit(1),
    supabase.from("goals").select("title, category, status, progress, due_date").eq("user_id", user.id).eq("status", "active").limit(5),
    supabase.from("daily_notes").select("note_date, content").eq("user_id", user.id).order("note_date", { ascending: false }).limit(3),
  ])

  const monthIncome = recentFinance?.filter(e => e.type === "income").reduce((s, e) => s + e.amount, 0) ?? 0
  const monthExpense = recentFinance?.filter(e => e.type === "expense").reduce((s, e) => s + e.amount, 0) ?? 0
  const activeTimer = runningTimer?.[0] ?? null

  // Compute habit streak from recent logs
  const habitStreak = (() => {
    if (!recentHabits?.length) return 0
    let streak = 0
    let cursor = today
    for (const log of recentHabits) {
      if (log.log_date === cursor && log.gym_done && log.english_done && log.diet_clean) {
        streak++
        const d = new Date(cursor)
        d.setDate(d.getDate() - 1)
        cursor = d.toISOString().split("T")[0]
      } else if (log.log_date === cursor) {
        break
      }
    }
    return streak
  })()

  // Top expense categories this month
  const expenseByCategory = new Map<string, number>()
  recentFinance?.filter(e => e.type === "expense").forEach(e => {
    expenseByCategory.set(e.category, (expenseByCategory.get(e.category) ?? 0) + e.amount)
  })
  const topExpenseCategories = Array.from(expenseByCategory.entries()).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([cat, amt]) => `${cat} ₹${amt.toLocaleString("en-IN")}`).join(", ")

  const result = streamText({
    model,
    stopWhen: stepCountIs(10),
    system: `You are the Life OS AI — a personal assistant deeply integrated into the user's life management system. You have live access to their habits, todos, finances, wellness, goals, and notes. Your job is to give genuinely useful, personalised responses that reference their actual data.

Today: ${today} (${now.toLocaleDateString("en-IN", { weekday: "long" })}). Currency: INR (₹).

━━ LIVE CONTEXT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TODOS (${todos?.length ?? 0} pending):
${overdueTodos?.length ? `• OVERDUE (${overdueTodos.length}): ${overdueTodos.map(t => `"${t.title}" [${t.priority}]`).join(", ")}` : "• No overdue todos"}
${dueTodayTodos?.length ? `• DUE TODAY (${dueTodayTodos.length}): ${dueTodayTodos.map(t => `"${t.title}"`).join(", ")}` : "• Nothing due today"}
${todos?.filter(t => !t.due_date || t.due_date > today).slice(0, 5).map(t => `• ${t.title} [${t.priority}${t.due_date ? `, due ${t.due_date}` : ""}]`).join("\n") || "• No upcoming todos"}

HABITS:
• Today: ${todayHabits ? `gym=${todayHabits.gym_done ? "✓" : "✗"}, english=${todayHabits.english_done ? "✓" : "✗"}, diet=${todayHabits.diet_clean ? "✓" : "✗"}${todayHabits.sleep_hrs ? `, sleep=${todayHabits.sleep_hrs}h` : ""}` : "not logged yet"}
• Streak: ${habitStreak > 0 ? `${habitStreak} day${habitStreak > 1 ? "s" : ""} (all 3 habits)` : "no active streak"}
• Last 7 days: ${recentHabits?.map(l => `${l.log_date.slice(5)}(${[l.gym_done ? "G" : "-", l.english_done ? "E" : "-", l.diet_clean ? "D" : "-"].join("")})`).join(" ") || "no data"}

WELLNESS TODAY: ${wellness ? `mood=${wellness.mood ?? "?"}/5, energy=${wellness.energy ?? "?"}/5, sleep=${wellness.sleep_hours ?? "?"}h, water=${wellness.water_glasses ?? 0} glasses${wellness.steps ? `, steps=${wellness.steps}` : ""}${wellness.notes ? `, notes: "${wellness.notes}"` : ""}` : "not logged yet"}

FINANCE (${now.toLocaleDateString("en-IN", { month: "long" })}):
• Income: ₹${monthIncome.toLocaleString("en-IN")} | Expenses: ₹${monthExpense.toLocaleString("en-IN")} | Net: ${monthIncome - monthExpense >= 0 ? "+" : ""}₹${(monthIncome - monthExpense).toLocaleString("en-IN")}
${topExpenseCategories ? `• Top spending: ${topExpenseCategories}` : ""}
${recentFinance?.slice(0, 3).map(e => `• ${e.entry_date} — ${e.type === "income" ? "+" : "-"}₹${e.amount.toLocaleString("en-IN")} (${e.category}${e.source ? ` · ${e.source}` : ""})`).join("\n") || ""}

GOALS (${activeGoals?.length ?? 0} active):
${activeGoals?.map(g => `• ${g.title} [${g.category}, ${g.progress}%${g.due_date ? `, due ${g.due_date}` : ""}]`).join("\n") || "• No active goals"}

TIMER: ${activeTimer ? `RUNNING — "${activeTimer.description}" since ${new Date(activeTimer.started_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}` : "idle"}

RECENT NOTES: ${recentNotes?.map(n => n.note_date).join(", ") || "none"}
${agentMemory.length > 0 ? `\nREMEMBERED:\n${agentMemory.map(m => `• ${m}`).join("\n")}` : ""}
${currentPage ? `\nCURRENT VIEW: User has the ${PAGE_LABELS[currentPage] ?? currentPage} page open — lean into context relevant to that section.` : ""}

━━ INSTRUCTIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Thinking: Before responding, reason through the user's request in <think>…</think> tags. Think about:
- What exactly is the user asking for?
- Which pieces of their live context are relevant?
- What tools do you need to call, and in what order?
- What would be the most useful, specific response given what you know about their life right now?
Be thorough — this reasoning is hidden from the user and directly improves response quality.

Response guidelines:
- Be specific and personal — reference their actual data, not generic advice. "You have 3 overdue todos including X" beats "you should check your todos."
- Be concise in the final answer. Put depth in the thinking, not the reply.
- For greetings or casual messages, give a warm short reply and optionally note something relevant from context (e.g. overdue todos, unlogged habit).
- Use tools immediately when intent is clear — don't ask permission with words, just call the tool.
- After tool success, give a brief confirmation with specifics: "Logged ✓ gym + diet for today."
- When multiple things need doing, chain tools across steps — you have up to 10 steps.
- Only mention approval when a tool actually returns _approval_needed.
- For "what should I do today?" — synthesise overdue todos, today's habits, and active goals into a prioritised plan.
- For "how am I doing?" — use getInsights for data, then give a personalised assessment.`,
    messages: await convertToModelMessages(messages),
    tools: {
      // ── READ TOOLS ────────────────────────────────────────────────────────

      listTodos: tool({
        description: "List pending todos with optional priority filter. Use when user asks about their task list.",
        inputSchema: z.object({ priority: z.enum(["low", "normal", "high", "all"]).default("all") }),
        execute: async ({ priority }) => {
          let q = supabase.from("todos").select("title, priority, due_date, category").eq("user_id", user.id).eq("done", false).order("priority", { ascending: false }).order("due_date", { ascending: true, nullsFirst: false }).limit(20)
          if (priority !== "all") q = q.eq("priority", priority)
          const { data } = await q
          const overdue = data?.filter(t => t.due_date && t.due_date < today) ?? []
          const dueToday = data?.filter(t => t.due_date === today) ?? []
          const upcoming = data?.filter(t => !t.due_date || t.due_date > today) ?? []
          return { overdue, dueToday, upcoming, total: data?.length ?? 0 }
        },
      }),

      listNotes: tool({
        description: "List or search daily notes. Use when user asks about past notes or wants to review entries.",
        inputSchema: z.object({ limit: z.number().int().min(1).max(30).default(7) }),
        execute: async ({ limit }) => {
          const { data } = await supabase
            .from("daily_notes")
            .select("note_date, content, updated_at")
            .eq("user_id", user.id)
            .order("note_date", { ascending: false })
            .limit(limit)
          return { notes: data?.map(n => ({ date: n.note_date, preview: (n.content ?? "").slice(0, 200) })) ?? [], count: data?.length ?? 0 }
        },
      }),

      getFinanceSummary: tool({
        description: "Get detailed finance data: monthly breakdown, category analysis, or recent transactions",
        inputSchema: z.object({ view: z.enum(["summary", "expenses", "income", "recent"]).default("summary") }),
        execute: async ({ view }) => {
          if (view === "recent") {
            const { data } = await supabase.from("finance_entries").select("type, amount, category, source, entry_date, notes").eq("user_id", user.id).order("entry_date", { ascending: false }).limit(10)
            return { entries: data ?? [] }
          }
          const catMap = new Map<string, number>()
          recentFinance?.filter(e => view === "income" ? e.type === "income" : view === "expenses" ? e.type === "expense" : true)
            .forEach(e => catMap.set(e.category, (catMap.get(e.category) ?? 0) + e.amount))
          return {
            monthIncome, monthExpense, net: monthIncome - monthExpense,
            topCategories: Array.from(catMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([cat, amount]) => ({ cat, amount })),
            transactionCount: recentFinance?.length ?? 0,
          }
        },
      }),

      listProjects: tool({
        description: "List active projects with task progress counts",
        inputSchema: z.object({}),
        execute: async () => {
          const { data: projects } = await supabase.from("projects").select("id, name, status, description").eq("user_id", user.id).eq("status", "active")
          const { data: tasks } = await supabase.from("product_tasks").select("project_id, status, title").eq("user_id", user.id)
          return {
            projects: (projects ?? []).map(p => {
              const pt = tasks?.filter(t => t.project_id === p.id) ?? []
              const inProgress = pt.filter(t => t.status === "in_progress").map(t => t.title)
              return { name: p.name, total: pt.length, done: pt.filter(t => t.status === "done").length, inProgress }
            })
          }
        },
      }),

      getInsights: tool({
        description: "Get stats and trends for a module over the last 30 days. Use for weekly review questions or 'how am I doing' type queries.",
        inputSchema: z.object({ module: z.enum(["habits", "wellness", "todos", "time", "finance"]) }),
        execute: async ({ module }) => {
          const thirtyAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
          if (module === "habits") {
            const { data } = await supabase.from("habit_logs").select("gym_done, english_done, diet_clean, log_date").eq("user_id", user.id).gte("log_date", thirtyAgo).order("log_date", { ascending: false })
            const n = data?.length ?? 0
            if (!n) return { message: "No habit data in the last 30 days" }
            const gymDays = data!.filter(l => l.gym_done).length
            const engDays = data!.filter(l => l.english_done).length
            const dietDays = data!.filter(l => l.diet_clean).length
            const perfectDays = data!.filter(l => l.gym_done && l.english_done && l.diet_clean).length
            return { daysLogged: n, gymPct: Math.round(gymDays / n * 100), englishPct: Math.round(engDays / n * 100), dietPct: Math.round(dietDays / n * 100), perfectDays, currentStreak: habitStreak }
          }
          if (module === "wellness") {
            const { data } = await supabase.from("wellness_logs").select("mood, sleep_hours, water_glasses, energy, log_date").eq("user_id", user.id).gte("log_date", thirtyAgo).order("log_date", { ascending: false })
            const n = data?.length ?? 0
            if (!n) return { message: "No wellness data in the last 30 days" }
            const wm = data!.filter(l => l.mood); const ws = data!.filter(l => l.sleep_hours); const we = data!.filter(l => l.energy)
            return {
              daysLogged: n,
              avgMood: wm.length ? (wm.reduce((s, l) => s + l.mood!, 0) / wm.length).toFixed(1) : null,
              avgSleep: ws.length ? (ws.reduce((s, l) => s + l.sleep_hours!, 0) / ws.length).toFixed(1) : null,
              avgEnergy: we.length ? (we.reduce((s, l) => s + l.energy!, 0) / we.length).toFixed(1) : null,
            }
          }
          if (module === "todos") {
            const { data } = await supabase.from("todos").select("done, priority, due_date, created_at").eq("user_id", user.id)
            const overdueCount = data?.filter(t => !t.done && t.due_date && t.due_date < today).length ?? 0
            return { total: data?.length ?? 0, done: data?.filter(t => t.done).length ?? 0, pending: data?.filter(t => !t.done).length ?? 0, highPriority: data?.filter(t => !t.done && t.priority === "high").length ?? 0, overdue: overdueCount }
          }
          if (module === "time") {
            const { data } = await supabase.from("time_entries").select("duration_minutes, description, started_at").eq("user_id", user.id).gte("started_at", thirtyAgo + "T00:00:00Z").not("duration_minutes", "is", null)
            const totalMin = data?.reduce((s, e) => s + (e.duration_minutes ?? 0), 0) ?? 0
            return { sessions: data?.length ?? 0, totalHours: (totalMin / 60).toFixed(1), avgMin: data?.length ? Math.round(totalMin / data.length) : 0 }
          }
          if (module === "finance") {
            const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split("T")[0]
            const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split("T")[0]
            const { data: prevMonth } = await supabase.from("finance_entries").select("type, amount").eq("user_id", user.id).gte("entry_date", prevMonthStart).lte("entry_date", prevMonthEnd)
            const prevIncome = prevMonth?.filter(e => e.type === "income").reduce((s, e) => s + e.amount, 0) ?? 0
            const prevExpense = prevMonth?.filter(e => e.type === "expense").reduce((s, e) => s + e.amount, 0) ?? 0
            return { thisMonth: { income: monthIncome, expense: monthExpense, net: monthIncome - monthExpense }, lastMonth: { income: prevIncome, expense: prevExpense, net: prevIncome - prevExpense }, topCategories: topExpenseCategories }
          }
          return {}
        },
      }),

      listGoals: tool({
        description: "Get detailed goal information with milestones",
        inputSchema: z.object({ status: z.enum(["active", "completed", "all"]).default("active") }),
        execute: async ({ status }) => {
          let q = supabase.from("goals").select("title, description, category, progress, status, due_date").eq("user_id", user.id)
          if (status !== "all") q = q.eq("status", status)
          const { data } = await q.order("created_at", { ascending: false }).limit(10)
          return { goals: data ?? [], count: data?.length ?? 0 }
        },
      }),

      // ── WRITE TOOLS (permission-gated) ────────────────────────────────────

      addTodo: tool({
        description: "Add a new todo item",
        inputSchema: z.object({
          title: z.string().describe("The task description"),
          priority: z.enum(["low", "normal", "high"]).default("normal"),
          due_date: z.string().optional().describe("Due date YYYY-MM-DD"),
          category: z.string().optional().describe("Category e.g. work, personal, health"),
        }),
        execute: async (args) => {
          const perm = checkPerm(toolPermissions, "addTodo")
          if (perm === "blocked") return blockedResult("addTodo")
          if (perm === "needs_approval") return approvalResult("addTodo", args, `Add to-do: "${args.title}" [${args.priority}${args.due_date ? `, due ${args.due_date}` : ""}]`)
          return executeToolCall("addTodo", args, supabase, user.id)
        },
      }),

      completeTodo: tool({
        description: "Mark a todo as done by searching its title",
        inputSchema: z.object({ title_query: z.string().describe("Partial title to search for") }),
        execute: async (args) => {
          const perm = checkPerm(toolPermissions, "completeTodo")
          if (perm === "blocked") return blockedResult("completeTodo")
          if (perm === "needs_approval") return approvalResult("completeTodo", args, `Complete todo: "${args.title_query}"`)
          return executeToolCall("completeTodo", args, supabase, user.id)
        },
      }),

      logHabits: tool({
        description: "Log today's habit completion. Call this when user mentions gym, workout, exercise, English practice, diet, eating clean.",
        inputSchema: z.object({
          gym_done: z.boolean(),
          english_done: z.boolean(),
          diet_clean: z.boolean(),
          sleep_hrs: z.number().min(0).max(24).optional().describe("Hours of sleep last night"),
        }),
        execute: async (args) => {
          const perm = checkPerm(toolPermissions, "logHabits")
          if (perm === "blocked") return blockedResult("logHabits")
          const done = [args.gym_done && "Gym ✓", args.english_done && "English ✓", args.diet_clean && "Diet ✓"].filter(Boolean).join(", ") || "none"
          if (perm === "needs_approval") return approvalResult("logHabits", args, `Log habits for ${today}: ${done}`)
          return executeToolCall("logHabits", args, supabase, user.id)
        },
      }),

      logWellness: tool({
        description: "Log today's wellness data: mood, sleep, water intake, energy, steps",
        inputSchema: z.object({
          mood: z.number().int().min(1).max(5).optional().describe("1=awful, 3=okay, 5=great"),
          sleep_hours: z.number().min(0).max(24).optional(),
          water_glasses: z.number().int().min(0).max(30).optional(),
          energy: z.number().int().min(1).max(5).optional().describe("1=drained, 5=fired up"),
          steps: z.number().int().optional(),
          notes: z.string().optional(),
        }),
        execute: async (args) => {
          const perm = checkPerm(toolPermissions, "logWellness")
          if (perm === "blocked") return blockedResult("logWellness")
          const parts = [args.mood && `mood ${args.mood}/5`, args.sleep_hours && `${args.sleep_hours}h sleep`, args.water_glasses !== undefined && `${args.water_glasses} glasses water`, args.energy && `energy ${args.energy}/5`].filter(Boolean).join(", ")
          if (perm === "needs_approval") return approvalResult("logWellness", args, `Log wellness: ${parts || "entry"}`)
          return executeToolCall("logWellness", args, supabase, user.id)
        },
      }),

      addFinanceEntry: tool({
        description: "Log an income or expense transaction",
        inputSchema: z.object({
          amount: z.number().positive().describe("Amount in INR"),
          type: z.enum(["income", "expense"]),
          category: z.string().describe("E.g. food, transport, salary, freelance, rent, entertainment"),
          source: z.string().optional().describe("Where from/to: restaurant name, company, etc."),
          entry_date: z.string().optional().describe("YYYY-MM-DD, defaults to today"),
          notes: z.string().optional(),
        }),
        execute: async (args) => {
          const perm = checkPerm(toolPermissions, "addFinanceEntry")
          if (perm === "blocked") return blockedResult("addFinanceEntry")
          if (perm === "needs_approval") return approvalResult("addFinanceEntry", args, `Record ${args.type}: ₹${args.amount.toLocaleString("en-IN")} · ${args.category}${args.source ? ` · ${args.source}` : ""}`)
          return executeToolCall("addFinanceEntry", args, supabase, user.id)
        },
      }),

      startTimer: tool({
        description: "Start a time tracking session for a task or project",
        inputSchema: z.object({
          description: z.string().describe("What are you working on?"),
          tag: z.string().optional().describe("Project or category tag"),
        }),
        execute: async (args) => {
          const perm = checkPerm(toolPermissions, "startTimer")
          if (perm === "blocked") return blockedResult("startTimer")
          if (perm === "needs_approval") return approvalResult("startTimer", args, `Start timer: "${args.description}"`)
          return executeToolCall("startTimer", args, supabase, user.id)
        },
      }),

      stopTimer: tool({
        description: "Stop the currently running timer",
        inputSchema: z.object({}),
        execute: async (args) => {
          const perm = checkPerm(toolPermissions, "stopTimer")
          if (perm === "blocked") return blockedResult("stopTimer")
          if (perm === "needs_approval") {
            const desc = activeTimer ? `Stop timer: "${activeTimer.description}"` : "Stop running timer"
            return approvalResult("stopTimer", args, desc)
          }
          return executeToolCall("stopTimer", args, supabase, user.id)
        },
      }),

      appendToNote: tool({
        description: "Append text to today's daily note",
        inputSchema: z.object({ content: z.string().describe("Text to append to today's note") }),
        execute: async (args) => {
          const perm = checkPerm(toolPermissions, "appendToNote")
          if (perm === "blocked") return blockedResult("appendToNote")
          if (perm === "needs_approval") return approvalResult("appendToNote", args, `Append to note: "${args.content.slice(0, 80)}${args.content.length > 80 ? "…" : ""}"`)
          return executeToolCall("appendToNote", args, supabase, user.id)
        },
      }),

      addProjectTask: tool({
        description: "Add a task to an existing project",
        inputSchema: z.object({
          project_name: z.string().describe("Project name (partial match ok)"),
          title: z.string(),
          priority: z.number().int().min(1).max(3).default(2).describe("1=low, 2=normal, 3=high"),
          due_date: z.string().optional().describe("YYYY-MM-DD"),
        }),
        execute: async (args) => {
          const perm = checkPerm(toolPermissions, "addProjectTask")
          if (perm === "blocked") return blockedResult("addProjectTask")
          if (perm === "needs_approval") return approvalResult("addProjectTask", args, `Add task to "${args.project_name}": "${args.title}"`)
          return executeToolCall("addProjectTask", args, supabase, user.id)
        },
      }),
    },
  })

  return result.toUIMessageStreamResponse()
}

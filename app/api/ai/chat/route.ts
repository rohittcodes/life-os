import { createClient } from "@/lib/supabase/server"
import { createAnthropic } from "@ai-sdk/anthropic"
import { createOpenAI } from "@ai-sdk/openai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createGroq } from "@ai-sdk/groq"
import { streamText, tool, stepCountIs, convertToModelMessages } from "ai"
import { z } from "zod"
import { executeToolCall } from "@/lib/ai/tool-executor"

export const maxDuration = 30

const DEFAULT_MODELS: Record<string, string> = {
  anthropic: "claude-haiku-4-5-20251001",
  openai: "gpt-4o-mini",
  gemini: "gemini-2.0-flash",
  groq: "llama-3.3-70b-versatile",
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

// ── Route ─────────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  const body = await req.json()
  const messages = body.messages ?? []
  // Client can override provider/model mid-chat
  const bodyProvider: string | undefined = body.provider
  const bodyModel: string | undefined = body.model

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
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0]

  const [{ data: todos }, { data: todayHabits }, { data: recentFinance }, { data: wellness }, { data: runningTimer }] = await Promise.all([
    supabase.from("todos").select("id, title, priority, due_date, done").eq("user_id", user.id).eq("done", false).order("created_at", { ascending: false }).limit(10),
    supabase.from("habit_logs").select("*").eq("user_id", user.id).eq("log_date", today).maybeSingle(),
    supabase.from("finance_entries").select("type, amount, category").eq("user_id", user.id).gte("entry_date", monthStart),
    supabase.from("wellness_logs").select("*").eq("user_id", user.id).eq("log_date", today).maybeSingle(),
    supabase.from("time_entries").select("id, description, started_at").eq("user_id", user.id).is("ended_at", null).limit(1),
  ])

  const monthIncome = recentFinance?.filter(e => e.type === "income").reduce((s, e) => s + e.amount, 0) ?? 0
  const monthExpense = recentFinance?.filter(e => e.type === "expense").reduce((s, e) => s + e.amount, 0) ?? 0
  const activeTimer = runningTimer?.[0] ?? null

  const result = streamText({
    model,
    stopWhen: stepCountIs(5),
    system: `You are a personal productivity assistant in Life OS — an all-in-one personal OS for habits, finance, todos, wellness, projects, goals, and time tracking.

Today: ${today}. Currency: INR (₹).

Live context:
- Pending todos (${todos?.length ?? 0}): ${JSON.stringify(todos?.slice(0, 5))}
- Today's habits: ${todayHabits ? `gym=${todayHabits.gym_done}, english=${todayHabits.english_done}, diet=${todayHabits.diet_clean}` : "not logged yet"}
- Today's wellness: ${wellness ? `mood=${wellness.mood}/5, sleep=${wellness.sleep_hours}h, water=${wellness.water_glasses}` : "not logged yet"}
- This month: income ₹${monthIncome.toLocaleString("en-IN")}, expenses ₹${monthExpense.toLocaleString("en-IN")}, net ₹${(monthIncome - monthExpense).toLocaleString("en-IN")}
- Timer: ${activeTimer ? `RUNNING — "${activeTimer.description}" since ${activeTimer.started_at}` : "idle"}
${agentMemory.length > 0 ? `\nRemembered:\n${agentMemory.map(m => `- ${m}`).join("\n")}` : ""}

Reasoning: Before each response, briefly outline your plan inside <think>…</think> tags (1–2 sentences max). Example: <think>User wants to log gym. I'll call logHabits with gym_done=true.</think>

Guidelines:
- Be concise and action-oriented. Use tools immediately when intent is clear.
- Keep the reasoning inside <think>…</think> tags only.
- For greetings or small talk (e.g., "hey", "hi"), reply with a short friendly greeting and an optional question; do not summarize context unless asked.
- If there are zero pending todos, do not say you will list them or imply a list; simply state there are no pending todos if asked about todos.
- Only mention approvals when a tool actually returns _approval_needed; never request approval in plain text.
- When a tool returns _approval_needed, acknowledge it: "I'd like to [action], but I need your approval — click a button below."
- When a tool returns _blocked, say it's disabled and suggest Settings → AI → Permissions.
- After successful tool actions, give a brief confirmation.`,
    messages: await convertToModelMessages(messages),
    tools: {
      // ── READ TOOLS (always auto-execute) ─────────────────────────────────

      listTodos: tool({
        description: "List pending todos, optionally filtered by priority",
        inputSchema: z.object({ priority: z.enum(["low", "normal", "high", "all"]).default("all") }),
        execute: async ({ priority }) => {
          let q = supabase.from("todos").select("title, priority, due_date").eq("user_id", user.id).eq("done", false).order("created_at", { ascending: false }).limit(15)
          if (priority !== "all") q = q.eq("priority", priority)
          const { data } = await q
          return { todos: data ?? [], count: data?.length ?? 0 }
        },
      }),

      listNotes: tool({
        description: "List daily notes by date (most recent first)",
        inputSchema: z.object({ limit: z.number().int().min(1).max(200).default(30) }),
        execute: async ({ limit }) => {
          const { data } = await supabase
            .from("daily_notes")
            .select("note_date, updated_at")
            .eq("user_id", user.id)
            .order("note_date", { ascending: false })
            .limit(limit)
          return { notes: data ?? [], count: data?.length ?? 0 }
        },
      }),

      getFinanceSummary: tool({
        description: "Get finance summary: monthly totals, top categories, or recent transactions",
        inputSchema: z.object({ view: z.enum(["summary", "expenses", "income", "recent"]).default("summary") }),
        execute: async ({ view }) => {
          if (view === "recent") {
            const { data } = await supabase.from("finance_entries").select("type, amount, category, source, entry_date").eq("user_id", user.id).order("entry_date", { ascending: false }).limit(8)
            return { entries: data ?? [] }
          }
          const catMap = new Map<string, number>()
          recentFinance?.filter(e => view === "income" ? e.type === "income" : view === "expenses" ? e.type === "expense" : true)
            .forEach(e => catMap.set(e.category, (catMap.get(e.category) ?? 0) + e.amount))
          return {
            monthIncome, monthExpense, net: monthIncome - monthExpense,
            topCategories: Array.from(catMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([cat, amount]) => ({ cat, amount })),
          }
        },
      }),

      listProjects: tool({
        description: "List active projects with task counts",
        inputSchema: z.object({}),
        execute: async () => {
          const { data: projects } = await supabase.from("projects").select("id, name, status").eq("user_id", user.id).eq("status", "active")
          const { data: tasks } = await supabase.from("product_tasks").select("project_id, status").eq("user_id", user.id)
          return {
            projects: (projects ?? []).map(p => {
              const pt = tasks?.filter(t => t.project_id === p.id) ?? []
              return { name: p.name, total: pt.length, done: pt.filter(t => t.status === "done").length }
            })
          }
        },
      }),

      getInsights: tool({
        description: "Get stats and insights for a module over the last 30 days",
        inputSchema: z.object({ module: z.enum(["habits", "wellness", "todos", "time"]) }),
        execute: async ({ module }) => {
          const thirtyAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
          if (module === "habits") {
            const { data } = await supabase.from("habit_logs").select("gym_done, english_done, diet_clean").eq("user_id", user.id).gte("log_date", thirtyAgo)
            const n = data?.length ?? 0
            if (!n) return { message: "No habit data in the last 30 days" }
            return { daysLogged: n, gymPct: Math.round(data!.filter(l => l.gym_done).length / n * 100), englishPct: Math.round(data!.filter(l => l.english_done).length / n * 100), dietPct: Math.round(data!.filter(l => l.diet_clean).length / n * 100) }
          }
          if (module === "wellness") {
            const { data } = await supabase.from("wellness_logs").select("mood, sleep_hours, water_glasses, energy").eq("user_id", user.id).gte("log_date", thirtyAgo)
            const n = data?.length ?? 0
            if (!n) return { message: "No wellness data in the last 30 days" }
            const wm = data!.filter(l => l.mood)
            const ws = data!.filter(l => l.sleep_hours)
            return { daysLogged: n, avgMood: wm.length ? (wm.reduce((s, l) => s + l.mood!, 0) / wm.length).toFixed(1) : null, avgSleep: ws.length ? (ws.reduce((s, l) => s + l.sleep_hours!, 0) / ws.length).toFixed(1) : null }
          }
          if (module === "todos") {
            const { data } = await supabase.from("todos").select("done, priority").eq("user_id", user.id)
            return { total: data?.length ?? 0, done: data?.filter(t => t.done).length ?? 0, pending: data?.filter(t => !t.done).length ?? 0, highPriority: data?.filter(t => !t.done && t.priority === "high").length ?? 0 }
          }
          if (module === "time") {
            const { data } = await supabase.from("time_entries").select("duration_minutes").eq("user_id", user.id).gte("started_at", thirtyAgo + "T00:00:00Z").not("duration_minutes", "is", null)
            const totalMin = data?.reduce((s, e) => s + (e.duration_minutes ?? 0), 0) ?? 0
            return { sessions: data?.length ?? 0, totalHours: (totalMin / 60).toFixed(1), avgMin: data?.length ? Math.round(totalMin / data.length) : 0 }
          }
          return {}
        },
      }),

      // ── WRITE TOOLS (permission-gated) ────────────────────────────────────

      addTodo: tool({
        description: "Add a new todo item",
        inputSchema: z.object({
          title: z.string().describe("The task description"),
          priority: z.enum(["low", "normal", "high"]).default("normal"),
          due_date: z.string().optional().describe("Due date YYYY-MM-DD"),
        }),
        execute: async (args) => {
          const perm = checkPerm(toolPermissions, "addTodo")
          if (perm === "blocked") return blockedResult("addTodo")
          if (perm === "needs_approval") return approvalResult("addTodo", args, `Add to-do: "${args.title}" (${args.priority})`)
          return executeToolCall("addTodo", args, supabase, user.id)
        },
      }),

      completeTodo: tool({
        description: "Mark a todo as done by searching its title",
        inputSchema: z.object({ title_query: z.string().describe("Partial title to search for") }),
        execute: async (args) => {
          const perm = checkPerm(toolPermissions, "completeTodo")
          if (perm === "blocked") return blockedResult("completeTodo")
          if (perm === "needs_approval") return approvalResult("completeTodo", args, `Complete todo matching: "${args.title_query}"`)
          return executeToolCall("completeTodo", args, supabase, user.id)
        },
      }),

      logHabits: tool({
        description: "Log today's habit completion (gym, English, diet)",
        inputSchema: z.object({
          gym_done: z.boolean(),
          english_done: z.boolean(),
          diet_clean: z.boolean(),
          notes: z.string().optional(),
        }),
        execute: async (args) => {
          const perm = checkPerm(toolPermissions, "logHabits")
          if (perm === "blocked") return blockedResult("logHabits")
          const desc = [args.gym_done && "Gym", args.english_done && "English", args.diet_clean && "Diet"].filter(Boolean).join(", ") || "none"
          if (perm === "needs_approval") return approvalResult("logHabits", args, `Log habits: ${desc}`)
          return executeToolCall("logHabits", args, supabase, user.id)
        },
      }),

      logWellness: tool({
        description: "Log today's wellness: mood (1-5), sleep, water, energy (1-5)",
        inputSchema: z.object({
          mood: z.number().int().min(1).max(5).optional(),
          sleep_hours: z.number().min(0).max(24).optional(),
          water_glasses: z.number().int().min(0).max(30).optional(),
          energy: z.number().int().min(1).max(5).optional(),
          steps: z.number().int().optional(),
          notes: z.string().optional(),
        }),
        execute: async (args) => {
          const perm = checkPerm(toolPermissions, "logWellness")
          if (perm === "blocked") return blockedResult("logWellness")
          const parts = [args.mood && `mood ${args.mood}/5`, args.sleep_hours && `${args.sleep_hours}h sleep`, args.water_glasses && `${args.water_glasses} glasses`].filter(Boolean).join(", ")
          if (perm === "needs_approval") return approvalResult("logWellness", args, `Log wellness: ${parts || "entry"}`)
          return executeToolCall("logWellness", args, supabase, user.id)
        },
      }),

      addFinanceEntry: tool({
        description: "Log an income or expense transaction",
        inputSchema: z.object({
          amount: z.number().positive().describe("Amount in INR"),
          type: z.enum(["income", "expense"]),
          category: z.string().describe("E.g. food, transport, salary, freelance"),
          source: z.string().optional(),
          entry_date: z.string().optional(),
        }),
        execute: async (args) => {
          const perm = checkPerm(toolPermissions, "addFinanceEntry")
          if (perm === "blocked") return blockedResult("addFinanceEntry")
          if (perm === "needs_approval") return approvalResult("addFinanceEntry", args, `Record ${args.type}: ₹${args.amount.toLocaleString("en-IN")} · ${args.category}`)
          return executeToolCall("addFinanceEntry", args, supabase, user.id)
        },
      }),

      startTimer: tool({
        description: "Start a time tracking session",
        inputSchema: z.object({
          description: z.string().describe("What are you working on?"),
          tag: z.string().optional(),
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
        description: "Append a quick note to today's daily note",
        inputSchema: z.object({ content: z.string() }),
        execute: async (args) => {
          const perm = checkPerm(toolPermissions, "appendToNote")
          if (perm === "blocked") return blockedResult("appendToNote")
          if (perm === "needs_approval") return approvalResult("appendToNote", args, `Append to note: "${args.content.slice(0, 60)}${args.content.length > 60 ? "…" : ""}"`)
          return executeToolCall("appendToNote", args, supabase, user.id)
        },
      }),

      addProjectTask: tool({
        description: "Add a task to an existing project",
        inputSchema: z.object({
          project_name: z.string().describe("Project name (partial match ok)"),
          title: z.string(),
          priority: z.number().int().min(1).max(3).default(2),
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

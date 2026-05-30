import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { hashKey } from "@/lib/api-key"

interface JsonRpcRequest {
  jsonrpc: "2.0"
  id: string | number | null
  method: string
  params?: Record<string, unknown>
}

function ok(id: JsonRpcRequest["id"], result: unknown) {
  return NextResponse.json({ jsonrpc: "2.0", id, result })
}

function rpcError(id: JsonRpcRequest["id"], code: number, message: string) {
  return NextResponse.json({ jsonrpc: "2.0", id, error: { code, message } })
}

async function getUserIdFromAuth(authHeader: string | null): Promise<string | null> {
  if (!authHeader?.startsWith("Bearer ")) return null
  const key = authHeader.slice(7).trim()
  if (!key.startsWith("los_")) return null

  const hash = await hashKey(key)
  const admin = createAdminClient()

  const { data } = await admin
    .from("api_keys")
    .select("user_id")
    .eq("key_hash", hash)
    .eq("revoked", false)
    .single()

  if (!data) return null

  admin
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("key_hash", hash)
    .then(() => {})

  return data.user_id
}

const TOOLS = [
  {
    name: "list_todos",
    description: "List your todos. Optionally filter by status (pending/done/all).",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["pending", "done", "all"], description: "Filter by status (default: all)" },
      },
    },
  },
  {
    name: "create_todo",
    description: "Create a new todo item.",
    inputSchema: {
      type: "object",
      required: ["title"],
      properties: {
        title: { type: "string", description: "The todo title" },
        due_date: { type: "string", description: "Due date in YYYY-MM-DD format" },
        priority: { type: "string", enum: ["low", "normal", "high"], description: "Priority level (default: normal)" },
        category: { type: "string", description: "Category tag" },
      },
    },
  },
  {
    name: "list_finance_entries",
    description: "List finance entries. Optionally filter by type or month.",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["income", "expense", "all"], description: "Filter by entry type" },
        month: { type: "string", description: "Filter by month in YYYY-MM format" },
        limit: { type: "number", description: "Max entries to return (default: 50)" },
      },
    },
  },
  {
    name: "add_finance_entry",
    description: "Add an income or expense entry.",
    inputSchema: {
      type: "object",
      required: ["type", "amount", "category"],
      properties: {
        type: { type: "string", enum: ["income", "expense"] },
        amount: { type: "number", description: "Amount in your currency" },
        category: { type: "string", description: "Category (e.g. food, salary, freelance, misc)" },
        source: { type: "string", description: "Source or payee name" },
        notes: { type: "string", description: "Optional notes" },
        entry_date: { type: "string", description: "Date in YYYY-MM-DD format (defaults to today)" },
      },
    },
  },
  {
    name: "list_goals",
    description: "List your goals and milestones.",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["active", "completed", "all"], description: "Filter by status (default: active)" },
      },
    },
  },
  {
    name: "get_dashboard_summary",
    description: "Get a summary of your Life OS: pending todos, today's habits, this month's finances, and active goals.",
    inputSchema: { type: "object", properties: {} },
  },
]

export async function POST(req: NextRequest) {
  const userId = await getUserIdFromAuth(req.headers.get("Authorization"))
  if (!userId) {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32001,
          message: "Unauthorized. Generate an API key at /settings → API Keys and pass it as: Authorization: Bearer <key>",
        },
      },
      { status: 401 }
    )
  }

  let body: JsonRpcRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } })
  }

  const { method, id, params = {} } = body
  const admin = createAdminClient()

  if (method === "initialize") {
    return ok(id, {
      protocolVersion: "2024-11-05",
      capabilities: { tools: {} },
      serverInfo: { name: "Life OS MCP", version: "1.0.0" },
    })
  }

  if (method === "notifications/initialized") {
    return new NextResponse(null, { status: 204 })
  }

  if (method === "tools/list") {
    return ok(id, { tools: TOOLS })
  }

  if (method === "tools/call") {
    const { name, arguments: args = {} } = params as { name: string; arguments: Record<string, unknown> }

    try {
      // list_todos
      if (name === "list_todos") {
        let query = admin.from("todos").select("*").eq("user_id", userId).order("created_at", { ascending: false })
        const status = args.status as string | undefined
        if (status === "pending") query = query.eq("done", false)
        else if (status === "done") query = query.eq("done", true)
        const { data, error } = await query.limit(100)
        if (error) throw error
        return ok(id, { content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }] })
      }

      // create_todo
      if (name === "create_todo") {
        const { data, error } = await admin
          .from("todos")
          .insert({
            user_id: userId,
            title: args.title as string,
            due_date: (args.due_date as string) ?? null,
            priority: (args.priority as string) ?? "normal",
            category: (args.category as string) ?? null,
            done: false,
          })
          .select()
          .single()
        if (error) throw error
        return ok(id, { content: [{ type: "text", text: `Created todo: ${JSON.stringify(data, null, 2)}` }] })
      }

      // list_finance_entries
      if (name === "list_finance_entries") {
        let query = admin
          .from("finance_entries")
          .select("*")
          .eq("user_id", userId)
          .order("entry_date", { ascending: false })
        const type = args.type as string | undefined
        if (type === "income") query = query.eq("type", "income")
        else if (type === "expense") query = query.eq("type", "expense")
        if (args.month) {
          const m = args.month as string
          query = query.gte("entry_date", `${m}-01`).lte("entry_date", `${m}-31`)
        }
        const limit = Math.min((args.limit as number) ?? 50, 200)
        const { data, error } = await query.limit(limit)
        if (error) throw error
        return ok(id, { content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }] })
      }

      // add_finance_entry
      if (name === "add_finance_entry") {
        const entryDate = (args.entry_date as string) ?? new Date().toISOString().split("T")[0]
        const { data, error } = await admin
          .from("finance_entries")
          .insert({
            user_id: userId,
            type: args.type as "income" | "expense",
            amount: args.amount as number,
            category: args.category as string,
            source: (args.source as string) ?? null,
            notes: (args.notes as string) ?? null,
            entry_date: entryDate,
          })
          .select()
          .single()
        if (error) throw error
        return ok(id, { content: [{ type: "text", text: `Added finance entry: ${JSON.stringify(data, null, 2)}` }] })
      }

      // list_goals
      if (name === "list_goals") {
        const status = args.status as string | undefined
        let query = admin
          .from("goals")
          .select("*, goal_milestones(*)")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
        if (!status || status === "active") query = query.neq("status", "completed")
        else if (status === "completed") query = query.eq("status", "completed")
        const { data, error } = await query.limit(50)
        if (error) throw error
        return ok(id, { content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }] })
      }

      // get_dashboard_summary
      if (name === "get_dashboard_summary") {
        const today = new Date().toISOString().split("T")[0]
        const monthStart = today.slice(0, 7) + "-01"

        const [
          { data: todos },
          { data: habitLog },
          { data: finance },
          { data: goals },
        ] = await Promise.all([
          admin.from("todos").select("id, title, done, priority").eq("user_id", userId).eq("done", false).limit(10),
          admin.from("habit_logs").select("*").eq("user_id", userId).eq("log_date", today).maybeSingle(),
          admin.from("finance_entries").select("type, amount").eq("user_id", userId).gte("entry_date", monthStart).limit(500),
          admin.from("goals").select("id, title, status, progress").eq("user_id", userId).neq("status", "completed").limit(10),
        ])

        const monthIncome = (finance ?? []).filter((e) => e.type === "income").reduce((s, e) => s + e.amount, 0)
        const monthExpense = (finance ?? []).filter((e) => e.type === "expense").reduce((s, e) => s + e.amount, 0)

        const summary = {
          date: today,
          pending_todos: todos?.length ?? 0,
          todos_sample: todos?.slice(0, 5) ?? [],
          habits_today: habitLog ?? null,
          this_month_income: monthIncome,
          this_month_expense: monthExpense,
          this_month_net: monthIncome - monthExpense,
          active_goals: goals?.length ?? 0,
          goals_sample: goals?.slice(0, 5) ?? [],
        }

        return ok(id, { content: [{ type: "text", text: JSON.stringify(summary, null, 2) }] })
      }

      return rpcError(id, -32602, `Unknown tool: ${name}`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      return rpcError(id, -32603, `Tool execution error: ${msg}`)
    }
  }

  return rpcError(id, -32601, `Method not found: ${method}`)
}

export async function GET() {
  return NextResponse.json(
    {
      name: "Life OS MCP Server",
      version: "1.0.0",
      protocol: "JSON-RPC 2.0 over HTTP",
      usage: "POST /api/mcp with Authorization: Bearer <your-life-os-api-key>",
      tools: TOOLS.map((t) => ({ name: t.name, description: t.description })),
      generate_key: "Visit /settings → API Keys tab",
    }
  )
}

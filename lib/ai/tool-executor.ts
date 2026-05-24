import type { SupabaseClient } from "@supabase/supabase-js"

export type ToolResult = {
  success: boolean
  message: string
  [key: string]: unknown
}

/** All write tools that require user permission before executing */
export const WRITE_TOOLS = new Set([
  "addTodo", "completeTodo", "logHabits", "logWellness",
  "addFinanceEntry", "startTimer", "stopTimer", "appendToNote", "addProjectTask",
])

export const TOOL_LABELS: Record<string, string> = {
  addTodo: "Add To-Do",
  completeTodo: "Complete To-Do",
  logHabits: "Log Habits",
  logWellness: "Log Wellness",
  addFinanceEntry: "Record Transaction",
  startTimer: "Start Timer",
  stopTimer: "Stop Timer",
  appendToNote: "Add to Daily Note",
  addProjectTask: "Add Project Task",
}

const today = () => new Date().toISOString().split("T")[0]

/** Execute a write tool server-side. Called from both the approval API and (when permission=always) the chat route. */
export async function executeToolCall(
  toolName: string,
  args: unknown,
  supabase: SupabaseClient,
  userId: string,
): Promise<ToolResult> {
  const todayDate = today()
  const a = args as Record<string, unknown>

  switch (toolName) {
    case "addTodo": {
      const { title, priority = "normal", due_date } = a
      const { error } = await supabase.from("todos").insert({
        user_id: userId, title, priority, due_date: due_date ?? null, done: false,
      })
      if (error) return { success: false, message: error.message }
      return { success: true, message: `Added: "${title}" · ${priority}${due_date ? ` · due ${due_date}` : ""}` }
    }

    case "completeTodo": {
      const { title_query } = a
      const { data } = await supabase.from("todos").select("id, title")
        .eq("user_id", userId).eq("done", false).ilike("title", `%${title_query}%`).limit(1)
      if (!data?.length) return { success: false, message: `No pending todo matching "${title_query}"` }
      await supabase.from("todos").update({ done: true }).eq("id", data[0].id)
      return { success: true, message: `Completed: "${data[0].title}"` }
    }

    case "logHabits": {
      const { gym_done, english_done, diet_clean, notes } = a
      const { error } = await supabase.from("habit_logs").upsert(
        { user_id: userId, log_date: todayDate, gym_done, english_done, diet_clean, notes: notes ?? null },
        { onConflict: "user_id,log_date" }
      )
      if (error) return { success: false, message: error.message }
      const done = [gym_done && "Gym ✓", english_done && "English ✓", diet_clean && "Diet ✓"].filter(Boolean)
      return { success: true, message: `Habits logged — ${done.length ? done.join(", ") : "none marked"}` }
    }

    case "logWellness": {
      const { error } = await supabase.from("wellness_logs").upsert(
        { user_id: userId, log_date: todayDate, ...a, water_glasses: a.water_glasses ?? 0 },
        { onConflict: "user_id,log_date" }
      )
      if (error) return { success: false, message: error.message }
      const parts = [
        a.mood && `mood ${a.mood}/5`,
        a.sleep_hours && `${a.sleep_hours}h sleep`,
        a.water_glasses && `${a.water_glasses} glasses`,
        a.energy && `energy ${a.energy}/5`,
      ].filter(Boolean)
      return { success: true, message: `Wellness: ${parts.join(", ")}` }
    }

    case "addFinanceEntry": {
      const { amount, type, category, source, entry_date } = a
      const { error } = await supabase.from("finance_entries").insert({
        user_id: userId, amount, type, category, source: source ?? null,
        entry_date: entry_date ?? todayDate,
      })
      if (error) return { success: false, message: error.message }
      return {
        success: true,
        message: `Logged ${type}: ₹${(amount as number).toLocaleString("en-IN")} · ${category}${source ? ` (${source})` : ""}`,
      }
    }

    case "startTimer": {
      const { description, tag } = a
      const { data: running } = await supabase.from("time_entries")
        .select("id, description, started_at").eq("user_id", userId).is("ended_at", null).limit(1)
      const active = running?.[0]
      if (active) {
        const dur = Math.max(1, Math.round((Date.now() - new Date(active.started_at).getTime()) / 60000))
        await supabase.from("time_entries").update({ ended_at: new Date().toISOString(), duration_minutes: dur }).eq("id", active.id)
      }
      const { error } = await supabase.from("time_entries").insert({
        user_id: userId, description, tag: tag ?? null, started_at: new Date().toISOString(),
      })
      if (error) return { success: false, message: error.message }
      return {
        success: true,
        message: `Timer started: "${description}"${active ? ` (stopped: "${active.description}")` : ""}`,
      }
    }

    case "stopTimer": {
      const { data: running } = await supabase.from("time_entries")
        .select("id, description, started_at").eq("user_id", userId).is("ended_at", null).limit(1)
      const active = running?.[0]
      if (!active) return { success: false, message: "No timer running" }
      const dur = Math.max(1, Math.round((Date.now() - new Date(active.started_at).getTime()) / 60000))
      await supabase.from("time_entries").update({ ended_at: new Date().toISOString(), duration_minutes: dur }).eq("id", active.id)
      return {
        success: true,
        message: `Stopped: "${active.description}" · ${dur >= 60 ? `${Math.floor(dur / 60)}h ${dur % 60}m` : `${dur}m`}`,
      }
    }

    case "appendToNote": {
      const { content } = a
      const { data: existing } = await supabase.from("daily_notes")
        .select("id, content").eq("user_id", userId).eq("note_date", todayDate).maybeSingle()
      const ts = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
      if (existing) {
        await supabase.from("daily_notes")
          .update({ content: (existing.content ?? "") + `\n\n[${ts}] ${content}` }).eq("id", existing.id)
      } else {
        await supabase.from("daily_notes").insert({ user_id: userId, note_date: todayDate, content: String(content) })
      }
      return { success: true, message: "Note appended to today's journal" }
    }

    case "addProjectTask": {
      const { project_name, title, priority = 2 } = a
      const { data: projects } = await supabase.from("projects").select("id, name")
        .eq("user_id", userId).ilike("name", `%${project_name}%`).limit(1)
      if (!projects?.length) return { success: false, message: `No project matching "${project_name}"` }
      const { error } = await supabase.from("product_tasks").insert({
        user_id: userId, project_id: projects[0].id, title, priority, status: "todo",
      })
      if (error) return { success: false, message: error.message }
      return { success: true, message: `Added to "${projects[0].name}": "${title}"` }
    }

    default:
      return { success: false, message: `Unknown tool: ${toolName}` }
  }
}

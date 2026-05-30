import type { SupabaseClient } from "@supabase/supabase-js"

type Reminder = {
  id: string
  title: string
  body: string
  url: string
  urgent?: boolean
}

function todayString() {
  const now = new Date()
  return now.toISOString().slice(0, 10)
}

function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

// Server-side version — takes userId + admin client + explicit local hour (caller must convert timezone)
export async function collectDueReminders(
  userId: string,
  supabase: SupabaseClient,
  hour: number = new Date().getHours()
): Promise<Reminder[]> {
  const today = todayString()
  const weekAhead = addDays(today, 7)
  const startOfToday = `${today}T00:00:00`
  const reminders: Reminder[] = []

  const [
    habitLog,
    routineLog,
    routineItems,
    wellnessLog,
    runningTimers,
    todaySessions,
    overdueGoals,
    dueSoonGoals,
    overdueMilestones,
    dueTodos,
    followUps,
    jobActions,
    subscriptions,
  ] = await Promise.all([
    supabase.from("habit_logs").select("gym_done, english_done, diet_clean, custom_done").eq("user_id", userId).eq("log_date", today).maybeSingle(),
    supabase.from("routine_logs").select("completed_item_ids").eq("user_id", userId).eq("log_date", today).maybeSingle(),
    supabase.from("routine_items").select("id").eq("user_id", userId).eq("active", true),
    supabase.from("wellness_logs").select("mood, energy, sleep_hours, water_glasses").eq("user_id", userId).eq("log_date", today).maybeSingle(),
    supabase.from("time_entries").select("description, started_at").eq("user_id", userId).is("ended_at", null).limit(1),
    supabase.from("time_entries").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("started_at", startOfToday).not("duration_minutes", "is", null),
    supabase.from("goals").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "active").lte("due_date", today),
    supabase.from("goals").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "active").gt("due_date", today).lte("due_date", weekAhead).lt("progress", 80),
    supabase.from("goal_milestones").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("completed", false).lte("due_date", today),
    supabase.from("todos").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("done", false).lte("due_date", today),
    supabase.from("contacts").select("id", { count: "exact", head: true }).eq("user_id", userId).lte("next_follow_up", today),
    supabase.from("job_applications").select("id", { count: "exact", head: true }).eq("user_id", userId).not("status", "in", "(rejected,ghosted)").lte("next_action_date", today),
    supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("active", true).gte("next_billing_date", today).lte("next_billing_date", addDays(today, 3)),
  ])

  // Morning routine (after 8 AM)
  if (hour >= 8 && (routineItems.data?.length ?? 0) > 0) {
    const completed = new Set(routineLog.data?.completed_item_ids ?? [])
    const pending = (routineItems.data ?? []).filter((item) => !completed.has(item.id))
    if (pending.length > 0) {
      reminders.push({
        id: `routine:${today}`,
        title: "Morning routine is still open",
        body: `${pending.length} item${pending.length > 1 ? "s" : ""} left. Don't let the day start on autopilot.`,
        url: "/routine",
        urgent: hour >= 10,
      })
    }
  }

  // Habits (after 6 PM)
  if (hour >= 18) {
    const basePending = !habitLog.data || !habitLog.data.gym_done || !habitLog.data.english_done || !habitLog.data.diet_clean
    if (basePending) {
      reminders.push({
        id: `habits:${today}`,
        title: "Habits not complete",
        body: "Gym, English, and clean diet all need a final check before midnight.",
        url: "/habits",
        urgent: hour >= 21,
      })
    }
  }

  // Wellness (after 8 PM)
  if (hour >= 20) {
    const w = wellnessLog.data
    const missing = !w || !w.mood || !w.energy || !w.sleep_hours || w.water_glasses <= 0
    if (missing) {
      reminders.push({
        id: `wellness:${today}`,
        title: "Wellness check-in due",
        body: "Log mood, energy, sleep, and water before the day ends.",
        url: "/wellness",
        urgent: hour >= 22,
      })
    }
  }

  // Running timer > 90 min
  const running = runningTimers.data?.[0]
  if (running) {
    const mins = Math.floor((Date.now() - new Date(running.started_at).getTime()) / 60000)
    if (mins >= 90) {
      reminders.push({
        id: `timer-running:${running.started_at}`,
        title: "Timer running for 90+ minutes",
        body: `"${running.description || "Focus session"}" — stop or reset it.`,
        url: "/time",
        urgent: true,
      })
    }
  } else if ((todaySessions.count ?? 0) === 0 && hour >= 11) {
    reminders.push({
      id: `timer-none:${today}`,
      title: "No focus session today",
      body: "Start a timer before the day gets away.",
      url: "/time",
      urgent: hour >= 15,
    })
  }

  // Overdue items (any time)
  const overdueTotal = (overdueGoals.count ?? 0) + (overdueMilestones.count ?? 0)
  const dueSoonCount = dueSoonGoals.count ?? 0
  if (overdueTotal > 0 || dueSoonCount > 0) {
    reminders.push({
      id: `goals:${today}`,
      title: "Goals need attention",
      body: `${overdueTotal} overdue · ${dueSoonCount} due soon. Pick the next move.`,
      url: "/goals",
      urgent: overdueTotal > 0,
    })
  }

  if ((dueTodos.count ?? 0) > 0) {
    reminders.push({
      id: `todos:${today}`,
      title: `${dueTodos.count} due todo${dueTodos.count! > 1 ? "s" : ""}`,
      body: "Clear, defer, or finish these tasks now.",
      url: "/todos",
      urgent: true,
    })
  }

  if ((followUps.count ?? 0) > 0) {
    reminders.push({
      id: `contacts:${today}`,
      title: "Follow-ups overdue",
      body: `${followUps.count} relationship follow-up${followUps.count! > 1 ? "s" : ""} waiting.`,
      url: "/contacts",
    })
  }

  if ((jobActions.count ?? 0) > 0) {
    reminders.push({
      id: `jobs:${today}`,
      title: "Job action due",
      body: `${jobActions.count} application${jobActions.count! > 1 ? "s need" : " needs"} a next action.`,
      url: "/jobs",
      urgent: true,
    })
  }

  if ((subscriptions.count ?? 0) > 0) {
    reminders.push({
      id: `subscriptions:${today}`,
      title: "Subscription billing soon",
      body: `${subscriptions.count} subscription${subscriptions.count! > 1 ? "s are" : " is"} billing within 3 days.`,
      url: "/contacts",
    })
  }

  return reminders
}

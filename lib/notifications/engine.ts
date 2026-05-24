import { createClient } from "@/lib/supabase/client"
import type { NotificationCategory, NotificationPreferences } from "@/lib/notifications/preferences"

type Reminder = {
  id: string
  category: NotificationCategory
  title: string
  body: string
  url: string
  urgent?: boolean
}

type CountResult = { count: number | null }

const REMINDER_STATE_KEY = "life-os-notification-reminder-state"

function todayString() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function minutesSince(value: string) {
  return Math.floor((Date.now() - new Date(value).getTime()) / 60000)
}

function hourNow() {
  return new Date().getHours()
}

function enabled(preferences: NotificationPreferences, category: NotificationCategory) {
  return preferences.enabled && preferences.categories[category]
}

function readReminderState(): Record<string, number> {
  try {
    return JSON.parse(window.localStorage.getItem(REMINDER_STATE_KEY) ?? "{}") as Record<string, number>
  } catch {
    return {}
  }
}

function writeReminderState(state: Record<string, number>) {
  window.localStorage.setItem(REMINDER_STATE_KEY, JSON.stringify(state))
}

async function count(query: PromiseLike<CountResult>) {
  const result = await query
  return result.count ?? 0
}

export async function collectDueReminders(preferences: NotificationPreferences): Promise<Reminder[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const today = todayString()
  const weekAhead = addDays(today, 7)
  const startOfToday = `${today}T00:00:00`
  const reminders: Reminder[] = []

  const [
    habitLog,
    customHabits,
    routineItems,
    routineLog,
    wellnessLog,
    runningTimers,
    todaySessions,
    overdueGoals,
    dueSoonGoals,
    overdueMilestones,
    dueTodos,
    dueTasks,
    financeEntriesToday,
    followUps,
    jobActions,
    subscriptions,
  ] = await Promise.all([
    enabled(preferences, "habits")
      ? supabase.from("habit_logs").select("gym_done, english_done, diet_clean, custom_done").eq("user_id", user.id).eq("log_date", today).maybeSingle()
      : Promise.resolve({ data: null }),
    enabled(preferences, "habits")
      ? supabase.from("habit_definitions").select("id, name").eq("user_id", user.id).eq("active", true)
      : Promise.resolve({ data: [] }),
    enabled(preferences, "routine")
      ? supabase.from("routine_items").select("id, title").eq("user_id", user.id).eq("active", true)
      : Promise.resolve({ data: [] }),
    enabled(preferences, "routine")
      ? supabase.from("routine_logs").select("completed_item_ids").eq("user_id", user.id).eq("log_date", today).maybeSingle()
      : Promise.resolve({ data: null }),
    enabled(preferences, "wellness")
      ? supabase.from("wellness_logs").select("mood, energy, sleep_hours, water_glasses").eq("user_id", user.id).eq("log_date", today).maybeSingle()
      : Promise.resolve({ data: null }),
    enabled(preferences, "time")
      ? supabase.from("time_entries").select("description, started_at").eq("user_id", user.id).is("ended_at", null).limit(1)
      : Promise.resolve({ data: [] }),
    enabled(preferences, "time")
      ? count(supabase.from("time_entries").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("started_at", startOfToday).not("duration_minutes", "is", null))
      : Promise.resolve(0),
    enabled(preferences, "goals")
      ? count(supabase.from("goals").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "active").lte("due_date", today))
      : Promise.resolve(0),
    enabled(preferences, "goals")
      ? count(supabase.from("goals").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "active").gt("due_date", today).lte("due_date", weekAhead).lt("progress", 80))
      : Promise.resolve(0),
    enabled(preferences, "goals")
      ? count(supabase.from("goal_milestones").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("completed", false).lte("due_date", today))
      : Promise.resolve(0),
    enabled(preferences, "todos")
      ? count(supabase.from("todos").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("done", false).lte("due_date", today))
      : Promise.resolve(0),
    enabled(preferences, "projects")
      ? count(supabase.from("product_tasks").select("id", { count: "exact", head: true }).eq("user_id", user.id).neq("status", "done").lte("due_date", today))
      : Promise.resolve(0),
    enabled(preferences, "finance")
      ? count(supabase.from("finance_entries").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("entry_date", today))
      : Promise.resolve(0),
    enabled(preferences, "contacts")
      ? count(supabase.from("contacts").select("id", { count: "exact", head: true }).eq("user_id", user.id).lte("next_follow_up", today))
      : Promise.resolve(0),
    enabled(preferences, "jobs")
      ? count(supabase.from("job_applications").select("id", { count: "exact", head: true }).eq("user_id", user.id).not("status", "in", "(rejected,ghosted)").lte("next_action_date", today))
      : Promise.resolve(0),
    enabled(preferences, "subscriptions")
      ? count(supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("active", true).gte("next_billing_date", today).lte("next_billing_date", addDays(today, 3)))
      : Promise.resolve(0),
  ])

  if (enabled(preferences, "routine") && hourNow() >= 8 && (routineItems.data?.length ?? 0) > 0) {
    const completed = new Set(routineLog.data?.completed_item_ids ?? [])
    const pending = (routineItems.data ?? []).filter((item) => !completed.has(item.id))
    if (pending.length > 0) {
      reminders.push({
        id: `routine:${today}`,
        category: "routine",
        title: "Morning routine is still open",
        body: `${pending.length} item${pending.length > 1 ? "s" : ""} left. Do not let the day start on autopilot.`,
        url: "/routine",
        urgent: hourNow() >= 10,
      })
    }
  }

  if (enabled(preferences, "habits") && hourNow() >= 18) {
    const basePending = !habitLog.data || !habitLog.data.gym_done || !habitLog.data.english_done || !habitLog.data.diet_clean
    const customDone = (habitLog.data?.custom_done ?? {}) as Record<string, boolean>
    const customPending = (customHabits.data ?? []).some((habit) => !customDone[habit.id])
    if (basePending || customPending) {
      reminders.push({
        id: `habits:${today}`,
        category: "habits",
        title: "Habits are not complete",
        body: "Gym, learning, diet, and custom habits need a final check-in.",
        url: "/habits",
        urgent: hourNow() >= 20,
      })
    }
  }

  if (enabled(preferences, "wellness") && hourNow() >= 20) {
    const missingWellness = !wellnessLog.data || !wellnessLog.data.mood || !wellnessLog.data.energy || !wellnessLog.data.sleep_hours || wellnessLog.data.water_glasses <= 0
    if (missingWellness) {
      reminders.push({
        id: `wellness:${today}`,
        category: "wellness",
        title: "Wellness check-in due",
        body: "Log mood, energy, sleep, and water before the day disappears.",
        url: "/wellness",
        urgent: hourNow() >= 22,
      })
    }
  }

  if (enabled(preferences, "time")) {
    const running = runningTimers.data?.[0]
    if (running && minutesSince(running.started_at) >= 90) {
      reminders.push({
        id: `time-running:${running.started_at}`,
        category: "time",
        title: "Long timer still running",
        body: `${running.description || "Focus session"} has been running for ${minutesSince(running.started_at)} minutes. Stop or reset it.`,
        url: "/time",
        urgent: true,
      })
    } else if (!running && todaySessions === 0 && hourNow() >= 11) {
      reminders.push({
        id: `time-none:${today}`,
        category: "time",
        title: "No focus session logged",
        body: "Start a timer before the day gets away from you.",
        url: "/time",
        urgent: hourNow() >= 14,
      })
    }
  }

  if (enabled(preferences, "goals") && (overdueGoals > 0 || dueSoonGoals > 0 || overdueMilestones > 0)) {
    reminders.push({
      id: `goals:${today}`,
      category: "goals",
      title: "Goals need attention",
      body: `${overdueGoals + overdueMilestones} overdue and ${dueSoonGoals} due soon. Pick the next move now.`,
      url: "/goals",
      urgent: overdueGoals + overdueMilestones > 0,
    })
  }

  if (enabled(preferences, "todos") && dueTodos > 0) {
    reminders.push({
      id: `todos:${today}`,
      category: "todos",
      title: "Due todos are waiting",
      body: `${dueTodos} task${dueTodos > 1 ? "s are" : " is"} due. Clear, defer, or finish.`,
      url: "/todos",
      urgent: true,
    })
  }

  if (enabled(preferences, "projects") && dueTasks > 0) {
    reminders.push({
      id: `projects:${today}`,
      category: "projects",
      title: "Project tasks are due",
      body: `${dueTasks} product task${dueTasks > 1 ? "s need" : " needs"} a status update.`,
      url: "/product",
      urgent: true,
    })
  }

  if (enabled(preferences, "finance") && hourNow() >= 21 && financeEntriesToday === 0) {
    reminders.push({
      id: `finance:${today}`,
      category: "finance",
      title: "Money log is empty",
      body: "Capture today’s spending or income before you forget the details.",
      url: "/finance",
    })
  }

  if (enabled(preferences, "contacts") && followUps > 0) {
    reminders.push({
      id: `contacts:${today}`,
      category: "contacts",
      title: "Follow-ups due",
      body: `${followUps} relationship follow-up${followUps > 1 ? "s are" : " is"} due today.`,
      url: "/contacts",
    })
  }

  if (enabled(preferences, "jobs") && jobActions > 0) {
    reminders.push({
      id: `jobs:${today}`,
      category: "jobs",
      title: "Job search action due",
      body: `${jobActions} application${jobActions > 1 ? "s need" : " needs"} a next action.`,
      url: "/jobs",
      urgent: true,
    })
  }

  if (enabled(preferences, "subscriptions") && subscriptions > 0) {
    reminders.push({
      id: `subscriptions:${today}`,
      category: "subscriptions",
      title: "Upcoming subscription billing",
      body: `${subscriptions} subscription${subscriptions > 1 ? "s are" : " is"} billing within 3 days.`,
      url: "/contacts",
    })
  }

  return reminders
}

export async function sendDueReminders(preferences: NotificationPreferences) {
  if (!preferences.enabled || !("Notification" in window) || Notification.permission !== "granted") return
  if (!("serviceWorker" in navigator)) return

  const reminders = await collectDueReminders(preferences)
  if (reminders.length === 0) return

  const registration = await navigator.serviceWorker.ready
  const state = readReminderState()
  const now = Date.now()
  const repeatMs = Math.max(5, preferences.strict ? preferences.repeatMinutes : 180) * 60 * 1000

  for (const reminder of reminders) {
    const lastSent = state[reminder.id] ?? 0
    const interval = reminder.urgent && preferences.strict ? Math.min(repeatMs, 15 * 60 * 1000) : repeatMs
    if (now - lastSent < interval) continue

    registration.active?.postMessage({
      type: "SHOW_REMINDER_NOTIFICATION",
      reminder,
      requireInteraction: preferences.strict || reminder.urgent,
    })
    state[reminder.id] = now
  }

  writeReminderState(state)
}

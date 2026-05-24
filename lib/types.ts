export type JobStatus = "applied" | "screen" | "interview" | "offer" | "rejected" | "ghosted"
export type FreelanceStatus = "negotiating" | "active" | "delivered" | "paid" | "on_hold"
export type TaskStatus = "todo" | "in_progress" | "blocked" | "done"
export type TaskPriority = 1 | 2 | 3
export type FinanceType = "income" | "expense"
export type RateType = "hourly" | "fixed"
export type GoalStatus = "active" | "completed" | "abandoned"
export type GoalCategory = "health" | "career" | "finance" | "personal" | "learning" | "relationships"
export type ReadingType = "book" | "article" | "course" | "podcast" | "video"
export type ReadingStatus = "want_to_read" | "reading" | "done" | "dropped"
export type BillingCycle = "weekly" | "monthly" | "quarterly" | "yearly"
export type ContactRelationship = "friend" | "colleague" | "mentor" | "client" | "recruiter" | "professional" | "other"

export interface JobApplication {
  id: string; user_id: string; company: string; role: string
  salary_lpa: number | null; status: JobStatus; applied_at: string
  next_action_date: string | null; notes: string | null; created_at: string
}

export interface FreelanceClient {
  id: string; user_id: string; client_name: string; project: string
  rate: number | null; rate_type: RateType | null; status: FreelanceStatus
  deadline: string | null; amount_agreed: number | null; amount_paid: number | null
  notes: string | null; created_at: string
}

export interface ProductTask {
  id: string; user_id: string; title: string; milestone: string | null
  status: TaskStatus; priority: TaskPriority; due_date: string | null
  notes: string | null; created_at: string
}

export interface HabitLog {
  id: string; user_id: string; log_date: string; gym_done: boolean
  english_done: boolean; sleep_hrs: number | null; diet_clean: boolean
  custom_done: Record<string, boolean>; created_at: string
}

export interface HabitDefinition {
  id: string; user_id: string; name: string; icon: string
  color: string; sort_order: number; active: boolean; created_at: string
}

export interface FinanceEntry {
  id: string; user_id: string; type: FinanceType; source: string | null
  category: string; amount: number; entry_date: string; notes: string | null; created_at: string
}

export interface WeeklyReview {
  id: string; user_id: string; week_start: string; wins: string | null
  blockers: string | null; next_week_focus: string | null; energy_score: number | null; created_at: string
}

export interface BlogPost {
  id: string; user_id: string; title: string; slug: string
  content: string | null; excerpt: string | null; published: boolean
  published_at: string | null; tags: string[]; created_at: string; updated_at: string
}

export interface ApiKey {
  id: string; user_id: string; name: string; key_prefix: string
  last_used_at: string | null; revoked: boolean; created_at: string
}

export interface DailyNote {
  id: string; user_id: string; note_date: string
  content: string | null; created_at: string; updated_at: string
}

export interface Goal {
  id: string; user_id: string; title: string; description: string | null
  category: GoalCategory; timeframe: string | null; status: GoalStatus
  progress: number; due_date: string | null; created_at: string
}

export interface GoalMilestone {
  id: string; user_id: string; goal_id: string; title: string
  completed: boolean; due_date: string | null; created_at: string
}

export interface Bookmark {
  id: string; user_id: string; url: string; title: string
  description: string | null; tags: string[]; created_at: string
}

export interface ReadingItem {
  id: string; user_id: string; title: string; author: string | null
  type: ReadingType; url: string | null; status: ReadingStatus
  rating: number | null; notes: string | null; finished_at: string | null; created_at: string
}

export interface Contact {
  id: string; user_id: string; name: string; email: string | null
  phone: string | null; company: string | null; role: string | null
  relationship: ContactRelationship; warmth: number; last_contacted_at: string | null
  next_follow_up: string | null; notes: string | null; created_at: string
}

export interface Subscription {
  id: string; user_id: string; name: string; amount: number
  billing_cycle: BillingCycle; category: string; next_billing_date: string | null
  active: boolean; url: string | null; notes: string | null; created_at: string
}

export interface Todo {
  id: string; user_id: string; title: string; done: boolean
  priority: "low" | "normal" | "high"; due_date: string | null
  category: string | null; created_at: string
}

export interface WellnessLog {
  id: string; user_id: string; log_date: string
  mood: number | null; energy: number | null
  sleep_hours: number | null; water_glasses: number
  steps: number | null; notes: string | null; created_at: string
}

export type ProjectStatus = "active" | "on_hold" | "completed" | "archived"

export interface Project {
  id: string; user_id: string; name: string; description: string | null
  color: string; emoji: string; status: ProjectStatus
  created_at: string; updated_at: string
}

export interface TimeEntry {
  id: string; user_id: string; description: string
  project_id: string | null; tag: string | null
  started_at: string; ended_at: string | null
  duration_minutes: number | null; created_at: string
}

export interface BudgetLimit {
  id: string; user_id: string; category: string
  monthly_limit: number; created_at: string
}

export interface KnowledgeArticle {
  id: string; user_id: string; title: string
  content: string | null; tags: string[]
  pinned: boolean; created_at: string; updated_at: string
}

export interface RoutineItem {
  id: string; user_id: string; title: string
  icon: string; sort_order: number; active: boolean; created_at: string
}

export interface RoutineLog {
  id: string; user_id: string; log_date: string
  completed_item_ids: string[]; notes: string | null
  mood_start: number | null; created_at: string
}

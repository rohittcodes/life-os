import { createClient } from "@/lib/supabase/server"

export const metadata = { title: "Goals" }
import { GoalCard } from "@/components/goals/goal-card"
import { GoalForm } from "@/components/goals/goal-form"
import type { Goal, GoalMilestone } from "@/lib/types"

const categoryColors: Record<string, string> = {
  health: "bg-green-500/10 text-green-600 dark:text-green-400",
  career: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  finance: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  personal: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  learning: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  relationships: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
}

export { categoryColors }

export default async function GoalsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: goals }, { data: milestones }] = await Promise.all([
    supabase.from("goals").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }),
    supabase.from("goal_milestones").select("*").eq("user_id", user!.id).order("created_at"),
  ])

  const allGoals: Goal[] = goals ?? []
  const allMilestones: GoalMilestone[] = milestones ?? []

  const active = allGoals.filter((g) => g.status === "active")
  const completed = allGoals.filter((g) => g.status === "completed")

  return (
    <div className="space-y-8 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Goals</h1>
          <p className="text-sm text-muted-foreground">{active.length} active · {completed.length} completed</p>
        </div>
        <GoalForm />
      </div>

      {allGoals.length === 0 && (
        <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
          No goals yet — add your first goal
        </div>
      )}

      {active.length > 0 && (
        <div className="space-y-4">
          {active.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              milestones={allMilestones.filter((m) => m.goal_id === goal.id)}
              categoryColors={categoryColors}
            />
          ))}
        </div>
      )}

      {completed.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Completed</h2>
          {completed.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              milestones={allMilestones.filter((m) => m.goal_id === goal.id)}
              categoryColors={categoryColors}
              compact
            />
          ))}
        </div>
      )}
    </div>
  )
}

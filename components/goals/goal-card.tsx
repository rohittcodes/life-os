"use client"

import { useState, useTransition } from "react"
import { updateGoalProgress, toggleMilestone, addMilestone, deleteGoal } from "@/app/(app)/goals/actions"
import { Input } from "@/components/ui/input"
import type { Goal, GoalMilestone } from "@/lib/types"

interface GoalCardProps {
  goal: Goal
  milestones: GoalMilestone[]
  categoryColors: Record<string, string>
  compact?: boolean
}

export function GoalCard({ goal, milestones, categoryColors, compact }: GoalCardProps) {
  const [progress, setProgress] = useState(goal.progress)
  const [newMs, setNewMs] = useState("")
  const [, startTransition] = useTransition()

  function handleProgress(val: number) {
    setProgress(val)
    startTransition(() => updateGoalProgress(goal.id, val))
  }

  function handleToggleMilestone(id: string, completed: boolean) {
    startTransition(() => toggleMilestone(id, !completed))
  }

  function handleAddMilestone(e: React.FormEvent) {
    e.preventDefault()
    if (!newMs.trim()) return
    const fd = new FormData()
    fd.set("goal_id", goal.id)
    fd.set("title", newMs)
    startTransition(async () => { await addMilestone(fd); setNewMs("") })
  }

  if (compact) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-border/50 bg-card/50 px-4 py-3 opacity-60">
        <div>
          <span className="text-sm font-medium line-through">{goal.title}</span>
          <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${categoryColors[goal.category]}`}>{goal.category}</span>
        </div>
        <span className="text-xs text-muted-foreground">100%</span>
      </div>
    )
  }

  const done = milestones.filter((m) => m.completed).length

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold">{goal.title}</h3>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${categoryColors[goal.category]}`}>
              {goal.category}
            </span>
            {goal.timeframe && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{goal.timeframe}</span>
            )}
          </div>
          {goal.description && <p className="text-sm text-muted-foreground">{goal.description}</p>}
          {goal.due_date && (
            <p className="text-xs text-muted-foreground">
              Due {new Date(goal.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          )}
        </div>
        <button
          onClick={() => { if (confirm("Delete this goal?")) startTransition(() => deleteGoal(goal.id)) }}
          className="shrink-0 text-muted-foreground hover:text-destructive transition-colors text-xs"
        >
          Delete
        </button>
      </div>

      {/* Progress slider */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">{progress}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={progress}
          onChange={(e) => handleProgress(parseInt(e.target.value))}
          className="w-full accent-foreground"
        />
      </div>

      {/* Milestones */}
      {milestones.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Milestones · {done}/{milestones.length}</p>
          {milestones.map((m) => (
            <label key={m.id} className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={m.completed}
                onChange={() => handleToggleMilestone(m.id, m.completed)}
                className="rounded accent-foreground"
              />
              <span className={`text-sm ${m.completed ? "line-through text-muted-foreground" : ""}`}>{m.title}</span>
            </label>
          ))}
        </div>
      )}

      {/* Add milestone */}
      <form onSubmit={handleAddMilestone} className="flex gap-2">
        <Input
          value={newMs}
          onChange={(e) => setNewMs(e.target.value)}
          placeholder="Add milestone…"
          className="h-7 text-xs"
        />
        <button type="submit" className="shrink-0 rounded-lg border border-border px-2 text-xs hover:bg-muted transition-colors">
          Add
        </button>
      </form>
    </div>
  )
}

"use client"

import { useState, useTransition } from "react"
import { saveReview } from "@/app/(app)/review/actions"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { WeeklyReview } from "@/lib/types"

interface ReviewFormProps {
  existing: WeeklyReview | null
  weekStart: string
}

export function ReviewForm({ existing, weekStart }: ReviewFormProps) {
  const [energyScore, setEnergyScore] = useState(existing?.energy_score ?? 7)
  const [saved, setSaved] = useState(false)
  const [, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set("energy_score", String(energyScore))
    fd.set("week_start", weekStart)
    startTransition(async () => {
      await saveReview(fd)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">
          Week of {new Date(weekStart).toLocaleDateString("en-IN", { day: "numeric", month: "long" })}
        </h2>
        {saved && <span className="text-xs text-green-600 dark:text-green-400">Saved ✓</span>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="wins">🏆 Wins this week</Label>
        <Textarea
          id="wins"
          name="wins"
          defaultValue={existing?.wins ?? ""}
          placeholder="What went well? What are you proud of?"
          rows={3}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="blockers">🚧 Blockers / what went wrong</Label>
        <Textarea
          id="blockers"
          name="blockers"
          defaultValue={existing?.blockers ?? ""}
          placeholder="What slowed you down? What would you do differently?"
          rows={3}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="next_week_focus">🎯 Focus for next week</Label>
        <Textarea
          id="next_week_focus"
          name="next_week_focus"
          defaultValue={existing?.next_week_focus ?? ""}
          placeholder="What's the single most important thing to accomplish?"
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>⚡ Energy / mood</Label>
          <span className="text-lg font-bold">{energyScore}/10</span>
        </div>
        <input
          type="range"
          min={1}
          max={10}
          value={energyScore}
          onChange={(e) => setEnergyScore(parseInt(e.target.value))}
          className="w-full accent-foreground"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Burnt out</span>
          <span>Energized</span>
        </div>
      </div>

      <Button type="submit" className="w-full">Save review</Button>
    </form>
  )
}

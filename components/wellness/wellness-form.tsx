"use client"

import { useState, useTransition } from "react"
import { upsertWellness } from "@/app/(app)/wellness/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import type { WellnessLog } from "@/lib/types"

const moodEmoji = ["", "😣", "😕", "😐", "🙂", "😄"]
const moodLabel = ["", "Rough", "Meh", "Okay", "Good", "Great"]
const energyEmoji = ["", "🪫", "😴", "⚡", "💪", "🚀"]

interface Props {
  date: string
  existing: WellnessLog | null
}

export function WellnessForm({ date, existing }: Props) {
  const [, startTransition] = useTransition()
  const [mood, setMood] = useState(existing?.mood ?? 0)
  const [energy, setEnergy] = useState(existing?.energy ?? 0)
  const [saved, setSaved] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set("mood", String(mood))
    fd.set("energy", String(energy))
    startTransition(async () => {
      await upsertWellness(fd)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-border bg-card p-6">
      <input type="hidden" name="log_date" value={date} />

      <div className="grid grid-cols-2 gap-6">
        {/* Mood */}
        <div className="space-y-3">
          <Label>Mood</Label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setMood(n)}
                className={`flex-1 rounded-lg border py-2 text-xl transition-all ${
                  mood === n ? "border-foreground bg-accent scale-110" : "border-border hover:border-foreground/40"
                }`}
                title={moodLabel[n]}
              >
                {moodEmoji[n]}
              </button>
            ))}
          </div>
          {mood > 0 && <p className="text-xs text-center text-muted-foreground">{moodLabel[mood]}</p>}
        </div>

        {/* Energy */}
        <div className="space-y-3">
          <Label>Energy</Label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setEnergy(n)}
                className={`flex-1 rounded-lg border py-2 text-xl transition-all ${
                  energy === n ? "border-foreground bg-accent scale-110" : "border-border hover:border-foreground/40"
                }`}
              >
                {energyEmoji[n]}
              </button>
            ))}
          </div>
          {energy > 0 && <p className="text-xs text-center text-muted-foreground">Energy {energy}/5</p>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label>Sleep (hours)</Label>
          <Input
            name="sleep_hours"
            type="number"
            step="0.5"
            min="0"
            max="24"
            defaultValue={existing?.sleep_hours ?? ""}
            placeholder="7.5"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Water (glasses)</Label>
          <Input
            name="water_glasses"
            type="number"
            min="0"
            max="20"
            defaultValue={existing?.water_glasses ?? ""}
            placeholder="8"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Steps</Label>
          <Input
            name="steps"
            type="number"
            min="0"
            defaultValue={existing?.steps ?? ""}
            placeholder="8000"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Notes</Label>
        <Textarea
          name="notes"
          rows={2}
          defaultValue={existing?.notes ?? ""}
          placeholder="How are you feeling today? Anything notable?"
        />
      </div>

      <div className="flex items-center justify-between">
        <span className={`text-sm transition-opacity ${saved ? "text-green-600 dark:text-green-400 opacity-100" : "opacity-0"}`}>
          Saved ✓
        </span>
        <Button type="submit">Save today&apos;s log</Button>
      </div>
    </form>
  )
}

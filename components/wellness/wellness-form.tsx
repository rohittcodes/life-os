"use client"

import { useState, useTransition, useEffect } from "react"
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
  const [sleep, setSleep] = useState(existing?.sleep_hours?.toString() ?? "")
  const [water, setWater] = useState(existing?.water_glasses ? existing.water_glasses.toString() : "")
  const [steps, setSteps] = useState(existing?.steps?.toString() ?? "")
  const [notes, setNotes] = useState(existing?.notes ?? "")
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setMood(existing?.mood ?? 0)
    setEnergy(existing?.energy ?? 0)
    setSleep(existing?.sleep_hours?.toString() ?? "")
    setWater(existing?.water_glasses ? existing.water_glasses.toString() : "")
    setSteps(existing?.steps?.toString() ?? "")
    setNotes(existing?.notes ?? "")
  }, [existing])

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData()
    fd.set("log_date", date)
    fd.set("mood", String(mood))
    fd.set("energy", String(energy))
    fd.set("sleep_hours", sleep)
    fd.set("water_glasses", water)
    fd.set("steps", steps)
    fd.set("notes", notes)
    startTransition(async () => {
      await upsertWellness(fd)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-border bg-card p-6">

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
            type="number"
            step="0.5"
            min="0"
            max="24"
            value={sleep}
            onChange={(e) => setSleep(e.target.value)}
            placeholder="7.5"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Water (glasses)</Label>
          <Input
            type="number"
            min="0"
            max="20"
            value={water}
            onChange={(e) => setWater(e.target.value)}
            placeholder="8"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Steps</Label>
          <Input
            type="number"
            min="0"
            value={steps}
            onChange={(e) => setSteps(e.target.value)}
            placeholder="8000"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Notes</Label>
        <Textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
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

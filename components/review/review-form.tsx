"use client"

import { useState, useRef, useTransition } from "react"
import { saveReview } from "@/app/(app)/review/actions"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Sparkles, Loader2 } from "lucide-react"
import type { WeeklyReview } from "@/lib/types"

interface WeekContext {
  gymDays: number
  englishDays: number
  dietDays: number
  fullDays: number
  completedTodos: number
  createdTodos: number
  weekIncome: number
  weekExpense: number
  avgMood: string | null
  avgSleep: string | null
  activeGoals: Array<{ title: string; progress: number }>
}

interface ReviewFormProps {
  existing: WeeklyReview | null
  weekStart: string
  weekContext?: WeekContext
  hasAiKey?: boolean
}

export function ReviewForm({ existing, weekStart, weekContext, hasAiKey }: ReviewFormProps) {
  const [energyScore, setEnergyScore] = useState(existing?.energy_score ?? 7)
  const [wins, setWins] = useState(existing?.wins ?? "")
  const [blockers, setBlockers] = useState(existing?.blockers ?? "")
  const [focus, setFocus] = useState(existing?.next_week_focus ?? "")
  const [saved, setSaved] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set("energy_score", String(energyScore))
    fd.set("week_start", weekStart)
    fd.set("wins", wins)
    fd.set("blockers", blockers)
    fd.set("next_week_focus", focus)
    startTransition(async () => {
      await saveReview(fd)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  async function generateWithAI() {
    if (!weekContext) return
    setGenerating(true)
    try {
      const ctx = weekContext
      const prompt = `You are helping a user write their weekly review for Life OS.

Here is their data for this week:
- Habit completion: ${ctx.fullDays}/7 full days (Gym: ${ctx.gymDays}d, English: ${ctx.englishDays}d, Diet: ${ctx.dietDays}d)
- Todos: ${ctx.completedTodos} completed, ${ctx.createdTodos} created
- Finance: ₹${ctx.weekIncome} income, ₹${ctx.weekExpense} expenses (net: ${ctx.weekIncome - ctx.weekExpense >= 0 ? "+" : ""}₹${ctx.weekIncome - ctx.weekExpense})
${ctx.avgMood ? `- Average mood: ${ctx.avgMood}/5` : ""}
${ctx.avgSleep ? `- Average sleep: ${ctx.avgSleep}h` : ""}
${ctx.activeGoals.length > 0 ? `- Active goals: ${ctx.activeGoals.map(g => `${g.title} (${g.progress}%)`).join(", ")}` : ""}

Write a concise weekly review with three sections. Be honest, direct, and actionable. Use bullet points (• ) where helpful. Keep it under 80 words per section.

Return ONLY valid JSON in this exact format (no markdown, no explanation):
{"wins":"...","blockers":"...","focus":"..."}`

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: prompt }],
          provider: "anthropic",
          stream: false,
        }),
      })

      if (!res.ok) throw new Error("AI request failed")
      const text = await res.text()

      // Extract JSON from the response (might be wrapped in stream events)
      const jsonMatch = text.match(/\{"wins"[\s\S]*?\}(?=\s*$|\s*data:|\s*\n)/m)
        ?? text.match(/\{"wins"[\s\S]*\}/)
      if (!jsonMatch) throw new Error("Could not parse AI response")

      const parsed = JSON.parse(jsonMatch[0]) as { wins?: string; blockers?: string; focus?: string }
      if (parsed.wins) setWins(parsed.wins)
      if (parsed.blockers) setBlockers(parsed.blockers)
      if (parsed.focus) setFocus(parsed.focus)
    } catch (err) {
      console.error("AI generate failed:", err)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-6 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="font-semibold">
          Week of {new Date(weekStart + "T12:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "long" })}
        </h2>
        <div className="flex items-center gap-2">
          {saved && <span className="text-xs text-green-600 dark:text-green-400">Saved ✓</span>}
          {hasAiKey && weekContext && (
            <button
              type="button"
              onClick={generateWithAI}
              disabled={generating}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60"
            >
              {generating
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Generating…</>
                : <><Sparkles className="h-3.5 w-3.5" />Generate with AI</>
              }
            </button>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="wins">🏆 Wins this week</Label>
        <Textarea
          id="wins"
          name="wins"
          value={wins}
          onChange={(e) => setWins(e.target.value)}
          placeholder="What went well? What are you proud of?"
          rows={3}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="blockers">🚧 Blockers / what went wrong</Label>
        <Textarea
          id="blockers"
          name="blockers"
          value={blockers}
          onChange={(e) => setBlockers(e.target.value)}
          placeholder="What slowed you down? What would you do differently?"
          rows={3}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="next_week_focus">🎯 Focus for next week</Label>
        <Textarea
          id="next_week_focus"
          name="next_week_focus"
          value={focus}
          onChange={(e) => setFocus(e.target.value)}
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
          type="range" min={1} max={10} value={energyScore}
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

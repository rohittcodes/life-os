"use client"

import { useState, useTransition } from "react"
import { Dumbbell, BookOpen, Leaf, Moon } from "lucide-react"
import { upsertHabitLog, toggleCustomHabit } from "@/app/(app)/habits/actions"
import type { HabitLog, HabitDefinition } from "@/lib/types"

interface HabitCheckerProps {
  log: HabitLog | null
  date: string
  customHabits: HabitDefinition[]
}

const CORE_HABITS = [
  { key: "gym_done" as const, label: "Gym", icon: Dumbbell },
  { key: "english_done" as const, label: "English shadowing", icon: BookOpen },
  { key: "diet_clean" as const, label: "Clean diet", icon: Leaf },
]

export function HabitChecker({ log, date, customHabits }: HabitCheckerProps) {
  const [state, setState] = useState({
    gym_done: log?.gym_done ?? false,
    english_done: log?.english_done ?? false,
    diet_clean: log?.diet_clean ?? false,
    sleep_hrs: log?.sleep_hrs?.toString() ?? "",
    custom_done: (log?.custom_done ?? {}) as Record<string, boolean>,
  })
  const [, startTransition] = useTransition()

  function toggle(key: "gym_done" | "english_done" | "diet_clean") {
    const next = { ...state, [key]: !state[key] }
    setState(next)
    const fd = new FormData()
    fd.set("log_date", date)
    fd.set("gym_done", String(next.gym_done))
    fd.set("english_done", String(next.english_done))
    fd.set("diet_clean", String(next.diet_clean))
    fd.set("sleep_hrs", next.sleep_hrs)
    startTransition(() => upsertHabitLog(fd))
  }

  function toggleCustom(id: string) {
    const newDone = !state.custom_done[id]
    setState((s) => ({ ...s, custom_done: { ...s.custom_done, [id]: newDone } }))
    startTransition(() => toggleCustomHabit(date, id, newDone))
  }

  function updateSleep(value: string) {
    setState((s) => ({ ...s, sleep_hrs: value }))
  }

  function saveSleep() {
    const fd = new FormData()
    fd.set("log_date", date)
    fd.set("gym_done", String(state.gym_done))
    fd.set("english_done", String(state.english_done))
    fd.set("diet_clean", String(state.diet_clean))
    fd.set("sleep_hrs", state.sleep_hrs)
    startTransition(() => upsertHabitLog(fd))
  }

  const coreDone = CORE_HABITS.filter((h) => state[h.key]).length
  const customDone = customHabits.filter((h) => state.custom_done[h.id]).length
  const total = CORE_HABITS.length + customHabits.length
  const done = coreDone + customDone

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">
          {done}/{total} done
        </span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-foreground transition-all"
            style={{ width: total > 0 ? `${(done / total) * 100}%` : "0%" }}
          />
        </div>
      </div>

      <div className="space-y-2">
        {CORE_HABITS.map((h) => {
          const Icon = h.icon
          return (
            <button
              key={h.key}
              onClick={() => toggle(h.key)}
              className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                state[h.key]
                  ? "border-foreground/20 bg-foreground/5"
                  : "border-border bg-card hover:bg-muted/50"
              }`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${state[h.key] ? "text-foreground" : "text-muted-foreground"}`} />
              <span className="flex-1 text-sm font-medium">{h.label}</span>
              <div
                className={`size-5 rounded-full border-2 transition-colors ${
                  state[h.key] ? "border-foreground bg-foreground" : "border-muted-foreground/40"
                }`}
              >
                {state[h.key] && (
                  <svg className="size-4 text-background" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                )}
              </div>
            </button>
          )
        })}

        {customHabits.map((h) => {
          const checked = !!state.custom_done[h.id]
          return (
            <button
              key={h.id}
              onClick={() => toggleCustom(h.id)}
              className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                checked ? "border-foreground/20 bg-foreground/5" : "border-border bg-card hover:bg-muted/50"
              }`}
            >
              <span className="size-3 rounded-full shrink-0" style={{ backgroundColor: h.color }} />
              <span className="flex-1 text-sm font-medium">{h.name}</span>
              <div
                className={`size-5 rounded-full border-2 transition-colors ${
                  checked ? "border-foreground bg-foreground" : "border-muted-foreground/40"
                }`}
              >
                {checked && (
                  <svg className="size-4 text-background" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                )}
              </div>
            </button>
          )
        })}
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
        <Moon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="flex-1 text-sm font-medium">Sleep hours</span>
        <input
          type="number"
          min={0}
          max={24}
          step={0.5}
          value={state.sleep_hrs}
          onChange={(e) => updateSleep(e.target.value)}
          onBlur={saveSleep}
          className="w-16 rounded-md border border-border bg-background px-2 py-1 text-right text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          placeholder="7.5"
        />
        <span className="text-sm text-muted-foreground">hrs</span>
      </div>
    </div>
  )
}

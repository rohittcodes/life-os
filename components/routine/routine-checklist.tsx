"use client"

import { useState, useTransition } from "react"
import { saveRoutineLog, addRoutineItem, deleteRoutineItem } from "@/app/(app)/routine/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X } from "lucide-react"
import type { RoutineItem, RoutineLog } from "@/lib/types"

const MOOD_EMOJI = ["", "😣", "😕", "😐", "🙂", "😄"]
const DEFAULT_ICONS = ["☀️", "💧", "🏃", "📚", "🧘", "✅", "🍎", "💊", "📝", "🎯"]

interface Props {
  items: RoutineItem[]
  log: RoutineLog | null
  date: string
}

export function RoutineChecklist({ items, log, date }: Props) {
  const [, startTransition] = useTransition()
  const [checked, setChecked] = useState<Set<string>>(new Set(log?.completed_item_ids ?? []))
  const [mood, setMood] = useState<number | null>(log?.mood_start ?? null)
  const [notes, setNotes] = useState(log?.notes ?? "")
  const [saved, setSaved] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newIcon, setNewIcon] = useState("✅")

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleSave() {
    startTransition(async () => {
      await saveRoutineLog(date, [...checked], mood, notes)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  function handleAddItem(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return
    const fd = new FormData()
    fd.set("title", newTitle)
    fd.set("icon", newIcon)
    startTransition(() => addRoutineItem(fd))
    setNewTitle("")
  }

  const pct = items.length > 0 ? Math.round((checked.size / items.length) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Progress */}
      {items.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">{checked.size}/{items.length} done</span>
            <span className="text-2xl font-bold">{pct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {/* Checklist */}
      <div className="space-y-2">
        {items.length === 0 && (
          <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
            Add routine items below to get started
          </div>
        )}
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => toggle(item.id)}
            className={`group w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
              checked.has(item.id)
                ? "border-green-500/30 bg-green-500/5"
                : "border-border bg-card hover:border-foreground/20"
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span className={`flex-1 text-sm font-medium ${checked.has(item.id) ? "line-through text-muted-foreground" : ""}`}>
              {item.title}
            </span>
            <span className={`h-5 w-5 rounded-full border-2 flex items-center justify-center text-xs transition-colors ${
              checked.has(item.id) ? "border-green-500 bg-green-500 text-white" : "border-border"
            }`}>
              {checked.has(item.id) ? "✓" : ""}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); startTransition(() => deleteRoutineItem(item.id)) }}
              className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </button>
        ))}
      </div>

      {/* Mood */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <p className="text-sm font-medium">How are you feeling?</p>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => setMood(n)}
              className={`flex-1 rounded-lg border py-2 text-xl transition-all ${
                mood === n ? "border-foreground bg-accent scale-110" : "border-border hover:border-foreground/40"
              }`}
            >{MOOD_EMOJI[n]}</button>
          ))}
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Morning notes or intentions…"
          rows={2}
          className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <div className="flex items-center justify-between">
          <span className={`text-sm transition-opacity ${saved ? "text-green-600 dark:text-green-400 opacity-100" : "opacity-0"}`}>Saved ✓</span>
          <Button onClick={handleSave}>Save routine</Button>
        </div>
      </div>

      {/* Add item */}
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-sm font-medium mb-3">Customize routine</p>
        <form onSubmit={handleAddItem} className="flex gap-2">
          <Select value={newIcon} onValueChange={setNewIcon}>
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DEFAULT_ICONS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Add routine item…"
            className="flex-1"
          />
          <Button type="submit" variant="outline">Add</Button>
        </form>
      </div>
    </div>
  )
}

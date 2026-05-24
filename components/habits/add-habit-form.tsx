"use client"

import { useState, useTransition } from "react"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createHabitDefinition, deleteHabitDefinition } from "@/app/(app)/habits/actions"
import type { HabitDefinition } from "@/lib/types"

const PRESET_COLORS = ["#6366f1", "#f97316", "#22c55e", "#3b82f6", "#ec4899", "#a855f7", "#14b8a6"]

interface Props { definitions: HabitDefinition[] }

export function AddHabitForm({ definitions }: Props) {
  const [name, setName] = useState("")
  const [color, setColor] = useState(PRESET_COLORS[0])
  const [open, setOpen] = useState(false)
  const [, startTransition] = useTransition()

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    const fd = new FormData()
    fd.set("name", name.trim())
    fd.set("color", color)
    startTransition(async () => {
      await createHabitDefinition(fd)
      setName("")
      setOpen(false)
    })
  }

  function handleDelete(id: string) {
    startTransition(() => deleteHabitDefinition(id))
  }

  return (
    <div className="space-y-3">
      {definitions.length > 0 && (
        <div className="space-y-2">
          {definitions.map((d) => (
            <div key={d.id} className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2">
              <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
              <span className="flex-1 text-sm">{d.name}</span>
              <button
                onClick={() => handleDelete(d.id)}
                className="text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {open ? (
        <form onSubmit={handleAdd} className="flex items-center gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Habit name (e.g. Meditate, Read)"
            className="flex-1 h-9 text-sm"
            autoFocus
          />
          <div className="flex gap-1">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`size-5 rounded-full transition-transform ${color === c ? "scale-125 ring-2 ring-offset-1 ring-ring" : ""}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <Button type="submit" size="sm" className="h-9">Add</Button>
          <Button type="button" variant="ghost" size="sm" className="h-9" onClick={() => setOpen(false)}>Cancel</Button>
        </form>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Add habit
        </Button>
      )}

      {definitions.length === 0 && !open && (
        <p className="text-xs text-muted-foreground">
          Add custom habits beyond the built-in Gym / English / Diet
        </p>
      )}
    </div>
  )
}

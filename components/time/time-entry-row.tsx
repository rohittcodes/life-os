"use client"

import { useTransition } from "react"
import { deleteEntry } from "@/app/(app)/time/actions"
import type { TimeEntry } from "@/lib/types"

interface Props {
  entry: TimeEntry
  projectName: string | null
  duration: string
}

export function TimeEntryRow({ entry, projectName, duration }: Props) {
  const [, startTransition] = useTransition()

  return (
    <div className="group flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{entry.description}</p>
        <p className="text-xs text-muted-foreground">
          {projectName ?? "No project"}
          {entry.tag && ` · ${entry.tag}`}
          {" · "}
          {new Date(entry.started_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
        </p>
      </div>
      <span className="text-sm font-mono font-medium shrink-0">{duration}</span>
      <button
        onClick={() => startTransition(() => deleteEntry(entry.id))}
        className="text-muted-foreground hover:text-destructive text-xs opacity-0 group-hover:opacity-100 transition-opacity"
      >✕</button>
    </div>
  )
}

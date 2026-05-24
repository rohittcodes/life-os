"use client"

import { useTransition } from "react"
import { deleteEntry } from "@/app/(app)/time/actions"
import type { TimeEntry } from "@/lib/types"
import { Trash2 } from "lucide-react"

interface Props {
  entry: TimeEntry
  projectName: string | null
  duration: string
}

export function TimeEntryRow({ entry, projectName, duration }: Props) {
  const [isPending, startTransition] = useTransition()

  return (
    <div className="group flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{entry.description}</p>
        <p className="text-xs text-muted-foreground">
          {projectName ?? "No project"}
          {entry.tag && ` · ${entry.tag}`}
          {" · "}
          {new Date(entry.started_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
        </p>
      </div>
      <span className="shrink-0 font-mono text-sm font-medium">{duration}</span>
      <button
        onClick={() => startTransition(() => deleteEntry(entry.id))}
        disabled={isPending}
        className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive
          opacity-100 md:opacity-0 md:group-hover:opacity-100"
        aria-label="Delete entry"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

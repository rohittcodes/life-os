"use client"

import { useState } from "react"
import { TimeEntryRow } from "./time-entry-row"
import { Input } from "@/components/ui/input"
import { Search, Monitor, Smartphone } from "lucide-react"
import { cn } from "@/lib/utils"
import type { TimeEntry, Project } from "@/lib/types"

function formatDuration(minutes: number | null): string {
  if (!minutes) return "—"
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

interface Props {
  entries: TimeEntry[]
  projects: Project[]
}

export function SessionList({ entries, projects }: Props) {
  const [search, setSearch] = useState("")
  const [projectFilter, setProjectFilter] = useState("all")

  const projectMap = new Map(projects.map((p) => [p.id, p]))

  const completed = entries.filter((e) => e.duration_minutes)

  const filtered = completed.filter((e) => {
    const matchSearch =
      !search ||
      e.description.toLowerCase().includes(search.toLowerCase()) ||
      (e.tag ?? "").toLowerCase().includes(search.toLowerCase())
    const matchProject =
      projectFilter === "all" ||
      (projectFilter === "none" && !e.project_id) ||
      e.project_id === projectFilter
    return matchSearch && matchProject
  })

  if (completed.length === 0) return null

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search sessions…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
        {projects.length > 0 && (
          <div className="flex rounded-lg border border-border bg-background overflow-hidden text-xs shrink-0">
            <button
              onClick={() => setProjectFilter("all")}
              className={cn("px-2.5 py-1.5 transition-colors", projectFilter === "all" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}
            >
              All
            </button>
            <button
              onClick={() => setProjectFilter("none")}
              className={cn("px-2.5 py-1.5 transition-colors border-l border-border", projectFilter === "none" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}
            >
              No project
            </button>
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => setProjectFilter(p.id)}
                className={cn("px-2.5 py-1.5 transition-colors border-l border-border truncate max-w-[100px]", projectFilter === p.id ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}
        <span className="text-xs text-muted-foreground shrink-0">{filtered.length} session{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">No sessions match your search</p>
        ) : (
          filtered.map((entry) => {
            const proj = entry.project_id ? projectMap.get(entry.project_id) : null
            return (
              <TimeEntryRow
                key={entry.id}
                entry={entry}
                projectName={proj ? proj.name : null}
                duration={formatDuration(entry.duration_minutes)}
              />
            )
          })
        )}
      </div>
    </div>
  )
}

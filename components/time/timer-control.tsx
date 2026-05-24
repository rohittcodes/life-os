"use client"

import { useState, useEffect, useTransition } from "react"
import { startTimer, stopTimer } from "@/app/(app)/time/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Project, TimeEntry } from "@/lib/types"
import { Play, Square, Loader2 } from "lucide-react"

interface Props {
  projects: Project[]
  running: TimeEntry | null
}

function formatElapsed(startedAt: string): string {
  const seconds = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

export function TimerControl({ projects, running }: Props) {
  const [isPending, startTransition] = useTransition()
  const [description, setDescription] = useState("")
  const [projectId, setProjectId] = useState("none")
  const [tag, setTag] = useState("")
  const [elapsed, setElapsed] = useState("00:00")

  useEffect(() => {
    if (!running) { setElapsed("00:00"); return }
    const tick = () => setElapsed(formatElapsed(running.started_at))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [running])

  function handleStart() {
    startTransition(() => startTimer(description, projectId === "none" ? null : projectId, tag || null))
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 md:p-5 space-y-4">
      {running ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{running.description || "Untitled session"}</p>
            <p className="text-xs text-muted-foreground">{running.tag ?? "No tag"}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="font-mono text-3xl font-bold tabular-nums">{elapsed}</span>
            <Button
              variant="destructive"
              size="sm"
              disabled={isPending}
              onClick={() => startTransition(() => stopTimer(running.id))}
            >
              {isPending
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <><Square className="h-4 w-4 mr-1" />Stop</>
              }
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What are you working on?"
            className="flex-1"
            onKeyDown={(e) => { if (e.key === "Enter") handleStart() }}
          />
          <div className="flex gap-2">
            {projects.length > 0 && (
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger className="h-9 flex-1 sm:w-40 sm:flex-none">
                  <SelectValue placeholder="No project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No project</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Input
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="Tag"
              className="w-20 sm:w-24"
            />
            <Button onClick={handleStart} disabled={isPending}>
              <Play className="h-4 w-4 mr-1" />Start
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

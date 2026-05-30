"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, Dumbbell, BookOpen, Leaf, Moon, MinusCircle, CheckCircle2, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { HabitLog, HabitDefinition } from "@/lib/types"

interface Props {
  logs: HabitLog[]
  definitions: HabitDefinition[]
}

const CORE_HABITS = [
  { key: "gym_done" as const,     label: "Gym",     icon: Dumbbell },
  { key: "english_done" as const, label: "English", icon: BookOpen },
  { key: "diet_clean" as const,   label: "Diet",    icon: Leaf },
]

function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate() }
function getFirstDay(y: number, m: number)    { return new Date(y, m, 1).getDay() }

function cellBg(log: HabitLog | undefined) {
  if (!log) return "bg-muted/60"
  const n = [log.gym_done, log.english_done, log.diet_clean].filter(Boolean).length
  if (n === 3) return "bg-foreground text-background"
  if (n === 2) return "bg-foreground/55 text-background"
  if (n === 1) return "bg-foreground/25 text-foreground"
  return "bg-muted/60"
}

function StatusIcon({ done, absent }: { done: boolean; absent: boolean }) {
  if (absent) return <MinusCircle className="h-3.5 w-3.5 text-muted-foreground/40" />
  if (done)   return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
  return             <XCircle      className="h-3.5 w-3.5 text-red-400" />
}

export function HabitCalendarPanel({ logs, definitions }: Props) {
  const today     = new Date()
  const todayStr  = today.toISOString().split("T")[0]
  const [year,  setYear]  = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selected, setSelected] = useState<string>(todayStr)

  const logMap    = new Map(logs.map((l) => [l.log_date, l]))
  const daysInMon = getDaysInMonth(year, month)
  const firstDay  = getFirstDay(year, month)

  const dateStr = (d: number) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    const n = new Date(year, month + 1)
    if (n > today) return
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  const canGoNext = new Date(year, month + 1) <= today

  // Build cells
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMon }, (_, i) => i + 1),
  ]
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null)

  const selectedLog = logMap.get(selected)

  // Completion dots for a day
  function HabitDots({ log }: { log: HabitLog | undefined }) {
    if (!log) return null
    const all = [
      ...CORE_HABITS.map(h => ({ done: log[h.key], color: "bg-background/70" })),
      ...definitions.map(d => ({
        done: (log.custom_done as Record<string, boolean> | null)?.[d.id] ?? false,
        color: d.color,
      })),
    ]
    return (
      <div className="flex flex-wrap gap-[3px] mt-0.5">
        {all.map((h, i) => (
          <span
            key={i}
            className={cn("size-1 rounded-full", h.done ? (h.color === "bg-background/70" ? h.color : "") : "opacity-30")}
            style={h.color !== "bg-background/70" ? { backgroundColor: h.done ? h.color : undefined, opacity: h.done ? 1 : 0.25 } : undefined}
          />
        ))}
      </div>
    )
  }

  const monthLabel = new Date(year, month).toLocaleString("default", { month: "long" })

  return (
    <div className="space-y-4">
      {/* Calendar header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{monthLabel} {year}</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={prevMonth}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={nextMonth}
            disabled={!canGoNext}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-default"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="inline-block size-2.5 rounded-sm bg-foreground" />All done</span>
        <span className="flex items-center gap-1.5"><span className="inline-block size-2.5 rounded-sm bg-foreground/25" />Partial</span>
        <span className="flex items-center gap-1.5"><span className="inline-block size-2.5 rounded-sm bg-muted border border-border" />None</span>
      </div>

      {/* Day-of-week labels */}
      <div className="grid grid-cols-7 gap-1.5">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="py-1 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {d}
          </div>
        ))}

        {/* Day cells */}
        {cells.map((d, i) =>
          d === null ? (
            <div key={`e-${i}`} />
          ) : (() => {
            const ds      = dateStr(d)
            const log     = logMap.get(ds)
            const isFut   = ds > todayStr
            const isTod   = ds === todayStr
            const isSel   = ds === selected
            return (
              <button
                key={ds}
                disabled={isFut}
                onClick={() => setSelected(ds)}
                className={cn(
                  "relative flex flex-col rounded-xl p-1.5 text-left transition-all min-h-[52px]",
                  cellBg(isFut ? undefined : log),
                  isFut   && "opacity-25 cursor-default",
                  !isFut  && "cursor-pointer hover:ring-2 hover:ring-ring/40 hover:ring-offset-1 hover:ring-offset-background",
                  isSel   && "ring-2 ring-ring ring-offset-1 ring-offset-background scale-[1.04] z-10",
                  isTod && !isSel && "ring-1 ring-ring/60 ring-offset-1 ring-offset-background",
                )}
              >
                <span className={cn("text-xs font-bold leading-none", isSel && log ? "" : "")}>
                  {d}
                </span>
                {!isFut && <HabitDots log={log} />}
              </button>
            )
          })()
        )}
      </div>

      {/* Selected day detail */}
      {selected && (
        <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">
              {new Date(selected + "T12:00:00").toLocaleDateString("en-IN", {
                weekday: "long", day: "numeric", month: "long",
              })}
            </p>
            {selectedLog ? (
              <span className={cn(
                "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                [selectedLog.gym_done, selectedLog.english_done, selectedLog.diet_clean].every(Boolean)
                  ? "bg-green-500/10 text-green-700 dark:text-green-400"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
              )}>
                {[selectedLog.gym_done, selectedLog.english_done, selectedLog.diet_clean].filter(Boolean).length}/3 core
              </span>
            ) : (
              <span className="text-[11px] text-muted-foreground">No log</span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
            {CORE_HABITS.map((h) => {
              const Icon = h.icon
              return (
                <div key={h.key} className="flex items-center gap-2">
                  <StatusIcon done={selectedLog?.[h.key] ?? false} absent={!selectedLog} />
                  <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs">{h.label}</span>
                </div>
              )
            })}
            {definitions.map((def) => (
              <div key={def.id} className="flex items-center gap-2">
                <StatusIcon
                  done={(selectedLog?.custom_done as Record<string, boolean> | null)?.[def.id] ?? false}
                  absent={!selectedLog}
                />
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: def.color }} />
                <span className="text-xs">{def.name}</span>
              </div>
            ))}
            {selectedLog?.sleep_hrs != null && (
              <div className="flex items-center gap-2">
                <Moon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground">Sleep</span>
                <span className="ml-auto text-xs font-semibold">{selectedLog.sleep_hrs}h</span>
              </div>
            )}
          </div>

          {!selectedLog && (
            <p className="text-xs text-muted-foreground/60 text-center">No habits logged this day</p>
          )}
        </div>
      )}
    </div>
  )
}

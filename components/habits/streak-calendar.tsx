"use client"

import type { HabitLog } from "@/lib/types"

interface StreakCalendarProps {
  logs: HabitLog[]
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

export function StreakCalendar({ logs }: StreakCalendarProps) {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)

  const logMap = new Map(logs.map((l) => [l.log_date, l]))

  const monthName = today.toLocaleString("default", { month: "long" })

  function completionColor(log: HabitLog | undefined) {
    if (!log) return "bg-muted"
    const done = [log.gym_done, log.english_done, log.diet_clean].filter(Boolean).length
    if (done === 3) return "bg-foreground"
    if (done === 2) return "bg-foreground/60"
    if (done === 1) return "bg-foreground/30"
    return "bg-muted"
  }

  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const dateStr = (d: number) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{monthName} {year}</h3>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="inline-block size-2.5 rounded-sm bg-foreground" /> All done
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block size-2.5 rounded-sm bg-muted" /> None
          </span>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {["Su","Mo","Tu","We","Th","Fr","Sa"].map((d) => (
          <div key={d} className="text-center text-xs text-muted-foreground py-1">{d}</div>
        ))}
        {cells.map((d, i) =>
          d === null ? (
            <div key={`empty-${i}`} />
          ) : (
            <div
              key={d}
              title={dateStr(d)}
              className={`relative flex aspect-square items-center justify-center rounded-md text-xs font-medium transition-colors ${completionColor(logMap.get(dateStr(d)))} ${
                d === today.getDate() ? "ring-2 ring-ring ring-offset-1 ring-offset-background" : ""
              } ${logMap.get(dateStr(d)) ? "text-background" : "text-muted-foreground"}`}
            >
              {d}
            </div>
          )
        )}
      </div>
    </div>
  )
}

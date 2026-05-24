"use client"

import { useRouter } from "next/navigation"

interface DayActivity {
  date: string
  hasNote: boolean
  habitDone: boolean
  habitPartial: boolean
  hasFinance: boolean
  hasTodo: boolean
}

interface Props {
  activity: DayActivity[]
  year: number
  month: number
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export function ActivityCalendar({ activity, year, month }: Props) {
  const router = useRouter()
  const activityMap = new Map(activity.map((a) => [a.date, a]))

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date().toISOString().split("T")[0]

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  function pad(n: number) { return String(n).padStart(2, "0") }
  function dateStr(day: number) {
    return `${year}-${pad(month + 1)}-${pad(day)}`
  }

  return (
    <div className="select-none">
      <div className="grid grid-cols-7 gap-1 mb-2">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center text-xs text-muted-foreground font-medium py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />
          const ds = dateStr(day)
          const act = activityMap.get(ds)
          const isToday = ds === today
          const isFuture = ds > today

          return (
            <button
              key={ds}
              onClick={() => router.push(`/notes?date=${ds}`)}
              disabled={isFuture}
              className={`group relative flex flex-col items-center rounded-lg py-1.5 transition-colors ${
                isToday
                  ? "bg-foreground text-background font-semibold"
                  : isFuture
                    ? "text-muted-foreground/30 cursor-default"
                    : act && (act.hasNote || act.habitDone || act.hasFinance)
                      ? "hover:bg-accent text-foreground"
                      : "hover:bg-muted text-muted-foreground"
              }`}
            >
              <span className="text-xs leading-none">{day}</span>
              {!isFuture && act && (
                <div className="mt-1 flex gap-0.5">
                  {(act.habitDone || act.habitPartial) && (
                    <span className={`h-1 w-1 rounded-full ${act.habitDone ? "bg-green-500" : "bg-yellow-500"}`} />
                  )}
                  {act.hasNote && <span className={`h-1 w-1 rounded-full ${isToday ? "bg-background/60" : "bg-blue-400"}`} />}
                  {act.hasFinance && <span className={`h-1 w-1 rounded-full ${isToday ? "bg-background/60" : "bg-purple-400"}`} />}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-green-500" />All habits done</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-yellow-500" />Partial habits</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-400" />Note written</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-purple-400" />Finance entry</span>
      </div>
    </div>
  )
}

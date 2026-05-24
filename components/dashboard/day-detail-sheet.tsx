"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { CheckCircle2, StickyNote, Wallet, ListTodo, Calendar } from "lucide-react"

interface DayActivity {
  date: string
  hasNote: boolean
  habitDone: boolean
  habitPartial: boolean
  hasFinance: boolean
  hasTodo: boolean
  habitDetails?: { gym_done: boolean; english_done: boolean; diet_clean: boolean }
  financeEntries?: { type: string; amount: number; category: string; source: string | null }[]
  todosDone?: number
  todosPending?: number
}

interface Props {
  activity: DayActivity[]
  year: number
  month: number
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export function ActivityCalendarWithSheet({ activity, year, month }: Props) {
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const activityMap = new Map(activity.map((a) => [a.date, a]))

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date().toISOString().split("T")[0]

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  function pad(n: number) { return String(n).padStart(2, "0") }
  function dateStr(day: number) { return `${year}-${pad(month + 1)}-${pad(day)}` }

  const selectedActivity = selectedDate ? activityMap.get(selectedDate) : null

  return (
    <>
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
            const isSelected = ds === selectedDate

            return (
              <button
                key={ds}
                onClick={() => { if (!isFuture) setSelectedDate(isSelected ? null : ds) }}
                disabled={isFuture}
                className={`group relative flex flex-col items-center rounded-lg py-1.5 transition-colors ${
                  isSelected
                    ? "bg-foreground text-background ring-2 ring-foreground"
                    : isToday
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
                      <span className={`h-1 w-1 rounded-full ${act.habitDone ? "bg-green-500" : "bg-yellow-500"} ${isToday || isSelected ? "bg-opacity-60" : ""}`} />
                    )}
                    {act.hasNote && <span className={`h-1 w-1 rounded-full ${isToday || isSelected ? "bg-background/60" : "bg-blue-400"}`} />}
                    {act.hasFinance && <span className={`h-1 w-1 rounded-full ${isToday || isSelected ? "bg-background/60" : "bg-purple-400"}`} />}
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-green-500" />All habits</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-yellow-500" />Partial habits</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-400" />Note</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-purple-400" />Finance</span>
        </div>
      </div>

      {/* Day detail sheet */}
      <Sheet open={!!selectedDate} onOpenChange={(open) => { if (!open) setSelectedDate(null) }}>
        <SheetContent className="w-80 sm:w-96">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {selectedDate && new Date(selectedDate + "T12:00:00").toLocaleDateString("en-IN", {
                weekday: "long", day: "numeric", month: "long"
              })}
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-5 px-6 pb-6">
            {/* Habits */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Habits
              </div>
              {selectedActivity?.habitDetails ? (
                <div className="space-y-1.5 pl-6">
                  {[
                    { label: "Gym", done: selectedActivity.habitDetails.gym_done },
                    { label: "English", done: selectedActivity.habitDetails.english_done },
                    { label: "Diet", done: selectedActivity.habitDetails.diet_clean },
                  ].map((h) => (
                    <div key={h.label} className="flex items-center gap-2 text-xs">
                      <span className={`h-4 w-4 rounded-full border flex items-center justify-center text-xs ${h.done ? "bg-green-500 border-green-500 text-white" : "border-border"}`}>
                        {h.done ? "✓" : ""}
                      </span>
                      <span className={h.done ? "text-foreground" : "text-muted-foreground line-through"}>{h.label}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="pl-6 text-xs text-muted-foreground">No habit log</p>
              )}
            </div>

            {/* Note */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <StickyNote className="h-4 w-4 text-blue-400" />
                Daily Note
              </div>
              {selectedActivity?.hasNote ? (
                <button
                  onClick={() => { router.push(`/notes?date=${selectedDate}`); setSelectedDate(null) }}
                  className="ml-6 text-xs text-blue-500 hover:underline"
                >
                  View note →
                </button>
              ) : (
                <p className="pl-6 text-xs text-muted-foreground">No note written</p>
              )}
            </div>

            {/* Finance */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Wallet className="h-4 w-4 text-purple-400" />
                Finance
              </div>
              {selectedActivity?.financeEntries && selectedActivity.financeEntries.length > 0 ? (
                <div className="space-y-1.5 pl-6">
                  {selectedActivity.financeEntries.map((e, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{e.source ?? e.category}</span>
                      <span className={e.type === "income" ? "text-green-600 dark:text-green-400" : "text-foreground"}>
                        {e.type === "income" ? "+" : "−"}₹{e.amount.toLocaleString("en-IN")}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="pl-6 text-xs text-muted-foreground">No entries</p>
              )}
            </div>

            {/* Todos */}
            {selectedActivity && (selectedActivity.todosDone !== undefined || selectedActivity.todosPending !== undefined) && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <ListTodo className="h-4 w-4 text-orange-400" />
                  Todos
                </div>
                <p className="pl-6 text-xs text-muted-foreground">
                  {selectedActivity.todosDone ?? 0} completed · {selectedActivity.todosPending ?? 0} pending
                </p>
              </div>
            )}

            {/* No activity */}
            {selectedActivity && !selectedActivity.hasNote && !selectedActivity.habitDone && !selectedActivity.habitPartial && !selectedActivity.hasFinance && (
              <p className="text-sm text-muted-foreground text-center py-4">No activity recorded</p>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

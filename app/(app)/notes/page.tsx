import { createClient } from "@/lib/supabase/server"

export const metadata = { title: "Daily Notes" }
import { DailyNoteEditor } from "@/components/notes/daily-note-editor"
import { DatePickerNav } from "@/components/notes/date-picker-nav"
import Link from "next/link"
import type { DailyNote } from "@/lib/types"

interface Props { searchParams: Promise<{ date?: string }> }

export default async function NotesPage({ searchParams }: Props) {
  const { date: dateParam } = await searchParams
  const today = new Date().toISOString().split("T")[0]
  const activeDate = dateParam ?? today

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: note }, { data: recentNotes }] = await Promise.all([
    supabase
      .from("daily_notes")
      .select("*")
      .eq("user_id", user!.id)
      .eq("note_date", activeDate)
      .single(),
    supabase
      .from("daily_notes")
      .select("note_date, updated_at")
      .eq("user_id", user!.id)
      .order("note_date", { ascending: false })
      .limit(14),
  ])

  const dateLabel = activeDate === today
    ? "Today"
    : new Date(activeDate + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })

  // Build last 7 days for quick nav
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - i)
    return d.toISOString().split("T")[0]
  })

  const noteDates = new Set((recentNotes ?? []).map((n: { note_date: string }) => n.note_date))

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Daily Notes</h1>
          <p className="text-sm text-muted-foreground">{dateLabel}</p>
        </div>
        <DatePickerNav value={activeDate} />
      </div>

      {/* Quick day nav */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {days.map((d) => {
          const isActive = d === activeDate
          const hasNote = noteDates.has(d)
          const label = d === today ? "Today" : new Date(d + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric" })
          return (
            <Link
              key={d}
              href={`/notes?date=${d}`}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? "bg-foreground text-background"
                  : hasNote
                    ? "bg-muted text-foreground hover:bg-muted/80"
                    : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {label}
              {hasNote && !isActive && <span className="ml-1 inline-block size-1 rounded-full bg-foreground/40 align-middle" />}
            </Link>
          )
        })}
      </div>

      <DailyNoteEditor note={note as DailyNote | null} date={activeDate} />
    </div>
  )
}

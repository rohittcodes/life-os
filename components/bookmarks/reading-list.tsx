"use client"

import { useTransition } from "react"
import { updateReadingStatus, deleteReadingItem } from "@/app/(app)/bookmarks/actions"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BookOpen, FileText, GraduationCap, Mic, Video, X } from "lucide-react"
import type { ReadingItem, ReadingStatus } from "@/lib/types"

const statusColors: Record<ReadingStatus, string> = {
  want_to_read: "bg-muted text-muted-foreground",
  reading: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  done: "bg-green-500/10 text-green-600 dark:text-green-400",
  dropped: "bg-red-500/10 text-red-600 dark:text-red-400",
}

const statuses: ReadingStatus[] = ["want_to_read","reading","done","dropped"]

const TypeIcon = ({ type }: { type: string }) => {
  const props = { className: "h-4 w-4 text-muted-foreground shrink-0" }
  if (type === "article") return <FileText {...props} />
  if (type === "course") return <GraduationCap {...props} />
  if (type === "podcast") return <Mic {...props} />
  if (type === "video") return <Video {...props} />
  return <BookOpen {...props} />
}

export function ReadingList({ items }: { items: ReadingItem[] }) {
  const [, startTransition] = useTransition()

  const byStatus = {
    reading: items.filter((i) => i.status === "reading"),
    want_to_read: items.filter((i) => i.status === "want_to_read"),
    done: items.filter((i) => i.status === "done"),
    dropped: items.filter((i) => i.status === "dropped"),
  }

  if (items.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
        Reading list is empty — add a book or article
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {(["reading","want_to_read","done","dropped"] as ReadingStatus[]).map((status) => {
        const group = byStatus[status]
        if (group.length === 0) return null
        return (
          <div key={status} className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground capitalize">{status.replace("_", " ")}</h3>
            {group.map((item) => (
              <div key={item.id} className="group flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
                <TypeIcon type={item.type} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{item.title}</span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[item.status]}`}>
                      {item.status.replace("_", " ")}
                    </span>
                  </div>
                  {item.author && <p className="mt-0.5 text-xs text-muted-foreground">{item.author}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Select
                    value={item.status}
                    onValueChange={(v) => startTransition(() => updateReadingStatus(item.id, v))}
                  >
                    <SelectTrigger className="h-7 w-32 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map((s) => (
                        <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <button
                    onClick={() => startTransition(() => deleteReadingItem(item.id))}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

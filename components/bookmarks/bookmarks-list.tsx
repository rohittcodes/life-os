"use client"

import { useTransition } from "react"
import { deleteBookmark } from "@/app/(app)/bookmarks/actions"
import type { Bookmark } from "@/lib/types"

export function BookmarksList({ bookmarks }: { bookmarks: Bookmark[] }) {
  const [, startTransition] = useTransition()

  if (bookmarks.length === 0) {
    return <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">No bookmarks yet — save your first link</div>
  }

  return (
    <div className="space-y-2">
      {bookmarks.map((b) => (
        <div key={b.id} className="group flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3 hover:border-foreground/20 transition-colors">
          <div className="flex-1 min-w-0">
            <a href={b.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:underline truncate block">
              {b.title}
            </a>
            {b.description && <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{b.description}</p>}
            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground truncate">{new URL(b.url).hostname}</span>
              {b.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{tag}</span>
              ))}
            </div>
          </div>
          <button
            onClick={() => startTransition(() => deleteBookmark(b.id))}
            className="opacity-0 group-hover:opacity-100 shrink-0 text-muted-foreground hover:text-destructive transition-all text-xs"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}

"use client"

import { useTransition } from "react"
import { togglePin, deleteArticle } from "@/app/(app)/knowledge/actions"
import type { KnowledgeArticle } from "@/lib/types"

export function KnowledgeActions({ article }: { article: KnowledgeArticle }) {
  const [, startTransition] = useTransition()

  return (
    <div className="flex gap-1">
      <button
        onClick={(e) => { e.preventDefault(); startTransition(() => togglePin(article.id, !article.pinned)) }}
        className="text-sm hover:scale-110 transition-transform"
        title={article.pinned ? "Unpin" : "Pin"}
      >
        {article.pinned ? "📌" : "📍"}
      </button>
      <button
        onClick={(e) => { e.preventDefault(); if (confirm("Delete this article?")) startTransition(() => deleteArticle(article.id)) }}
        className="text-muted-foreground hover:text-destructive text-xs px-1"
      >
        ✕
      </button>
    </div>
  )
}

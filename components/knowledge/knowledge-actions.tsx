"use client"

import { useTransition } from "react"
import { togglePin, deleteArticle } from "@/app/(app)/knowledge/actions"
import { ConfirmButton } from "@/components/ui/confirm-button"
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
      <ConfirmButton
        title="Delete article"
        description="This article will be permanently removed from your knowledge base."
        confirmLabel="Delete"
        onConfirm={() => startTransition(() => deleteArticle(article.id))}
      >
        <button
          onClick={(e) => e.preventDefault()}
          className="text-muted-foreground hover:text-destructive text-xs px-1"
        >
          ✕
        </button>
      </ConfirmButton>
    </div>
  )
}

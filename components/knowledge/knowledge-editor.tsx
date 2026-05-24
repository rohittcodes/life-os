"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { createArticle, updateArticle } from "@/app/(app)/knowledge/actions"
import { NovelEditor } from "@/components/editor/novel-editor"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { JSONContent } from "novel"
import type { KnowledgeArticle } from "@/lib/types"

interface Props { article?: KnowledgeArticle }

export function KnowledgeEditor({ article }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [title, setTitle] = useState(article?.title ?? "")
  const [tags, setTags] = useState(article?.tags.join(", ") ?? "")
  const [content, setContent] = useState<JSONContent | null>(
    article?.content ? (() => { try { return JSON.parse(article.content!) } catch { return null } })() : null
  )

  function handleSave() {
    const fd = new FormData()
    fd.set("title", title)
    fd.set("tags", tags)
    fd.set("content", content ? JSON.stringify(content) : "")

    startTransition(async () => {
      if (article) {
        await updateArticle(article.id, fd)
        router.push("/knowledge")
      } else {
        await createArticle(fd)
        router.push("/knowledge")
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Article title…" />
        </div>
        <div className="space-y-1.5">
          <Label>Tags (comma-separated)</Label>
          <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="react, typescript, notes…" />
        </div>
      </div>

      <NovelEditor initialContent={content} onChange={setContent} className="min-h-[500px]" />

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.push("/knowledge")}>Cancel</Button>
        <Button onClick={handleSave} disabled={!title.trim()}>Save article</Button>
      </div>
    </div>
  )
}

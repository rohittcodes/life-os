"use client"

import { useState, useTransition } from "react"
import { savePost } from "@/app/(app)/blog/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { NovelEditor } from "@/components/editor/novel-editor"
import type { JSONContent } from "novel"
import type { BlogPost } from "@/lib/types"

interface PostEditorProps {
  post?: BlogPost
}

export function PostEditor({ post }: PostEditorProps) {
  const initialContent = post?.content
    ? (() => { try { return JSON.parse(post.content) as JSONContent } catch { return null } })()
    : null

  const [content, setContent] = useState<JSONContent | null>(initialContent)
  const [, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set("content", content ? JSON.stringify(content) : "")
    const publish = (e.nativeEvent as SubmitEvent).submitter?.getAttribute("data-publish") === "true"
    fd.set("publish", String(publish))
    startTransition(() => savePost(fd, post?.id))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          name="title"
          required
          placeholder="My post title"
          defaultValue={post?.title ?? ""}
          className="text-lg font-medium"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="slug">Slug</Label>
          <Input
            id="slug"
            name="slug"
            placeholder="auto-generated from title"
            defaultValue={post?.slug ?? ""}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tags">Tags</Label>
          <Input
            id="tags"
            name="tags"
            placeholder="ai, productivity, india"
            defaultValue={post?.tags?.join(", ") ?? ""}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="excerpt">Excerpt</Label>
        <Textarea
          id="excerpt"
          name="excerpt"
          rows={2}
          placeholder="Short summary shown in post lists and previews…"
          defaultValue={post?.excerpt ?? ""}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Content</Label>
        <NovelEditor initialContent={initialContent} onChange={setContent} />
      </div>

      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-muted-foreground">
          {post?.published ? "Currently published" : "Draft — not visible publicly"}
        </p>
        <div className="flex items-center gap-2">
          <Button type="submit" variant="outline" data-publish="false">
            Save draft
          </Button>
          <Button type="submit" data-publish="true">
            {post?.published ? "Update" : "Publish"}
          </Button>
        </div>
      </div>
    </form>
  )
}

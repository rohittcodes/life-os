"use client"

import Link from "next/link"
import { useTransition } from "react"
import { deletePost, togglePublish } from "@/app/(app)/blog/actions"
import { Button } from "@/components/ui/button"
import type { BlogPost } from "@/lib/types"

export function BlogPostActions({ post }: { post: BlogPost }) {
  const [, startTransition] = useTransition()

  return (
    <div className="flex items-center gap-2 shrink-0">
      <Button variant="outline" size="sm" asChild>
        <Link href={`/blog/${post.id}`}>Edit</Link>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => startTransition(() => togglePublish(post.id, !post.published))}
      >
        {post.published ? "Unpublish" : "Publish"}
      </Button>
      {post.published && (
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/p/${post.slug}`} target="_blank">View ↗</Link>
        </Button>
      )}
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground hover:text-destructive"
        onClick={() => {
          if (confirm("Delete this post?")) {
            startTransition(() => deletePost(post.id))
          }
        }}
      >
        Delete
      </Button>
    </div>
  )
}

import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { BlogPostActions } from "@/components/blog/post-actions"
import type { BlogPost } from "@/lib/types"

export default async function BlogAdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: posts = [] } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })

  const allPosts: BlogPost[] = posts ?? []
  const published = allPosts.filter((p) => p.published).length
  const drafts = allPosts.filter((p) => !p.published).length

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Blog</h1>
          <p className="text-sm text-muted-foreground">{published} published · {drafts} drafts</p>
        </div>
        <Button asChild>
          <Link href="/blog/new">New post</Link>
        </Button>
      </div>

      {allPosts.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
          No posts yet — write your first one
        </div>
      ) : (
        <div className="space-y-3">
          {allPosts.map((post) => (
            <div key={post.id} className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Link href={`/blog/${post.id}`} className="font-medium hover:underline truncate">
                    {post.title}
                  </Link>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                    post.published
                      ? "bg-green-500/10 text-green-600 dark:text-green-400"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {post.published ? "Published" : "Draft"}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>/{post.slug}</span>
                  {post.tags.length > 0 && <span>{post.tags.join(", ")}</span>}
                  <span>{new Date(post.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                </div>
              </div>
              <BlogPostActions post={post} />
            </div>
          ))}
        </div>
      )}

      {published > 0 && (
        <div className="rounded-xl border border-border bg-muted/40 p-4">
          <p className="text-sm font-medium">Public API endpoints</p>
          <div className="mt-2 space-y-1">
            <code className="block rounded-md bg-background px-3 py-1.5 text-xs font-mono">GET /api/blog</code>
            <code className="block rounded-md bg-background px-3 py-1.5 text-xs font-mono">GET /api/blog/[slug]</code>
          </div>
        </div>
      )}
    </div>
  )
}

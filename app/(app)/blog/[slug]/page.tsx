import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { PostEditor } from "@/components/blog/post-editor"
import type { BlogPost } from "@/lib/types"

interface Props {
  params: Promise<{ slug: string }>
}

export default async function EditPostPage({ params }: Props) {
  const { slug: id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: post } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("id", id)
    .eq("user_id", user!.id)
    .single()

  if (!post) notFound()

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Edit post</h1>
        <p className="text-sm text-muted-foreground">
          {post.published ? "Published" : "Draft"} ·{" "}
          {new Date(post.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>
      <PostEditor post={post as BlogPost} />
    </div>
  )
}

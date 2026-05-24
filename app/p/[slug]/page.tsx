import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { generateHTML } from "@tiptap/core"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import Link from "@tiptap/extension-link"
import Highlight from "@tiptap/extension-highlight"
import TaskList from "@tiptap/extension-task-list"
import TaskItem from "@tiptap/extension-task-item"
import type { Metadata } from "next"
import type { BlogPost } from "@/lib/types"

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data: post } = await supabase
    .from("blog_posts")
    .select("title, excerpt")
    .eq("slug", slug)
    .eq("published", true)
    .single()
  if (!post) return { title: "Not found" }
  return { title: post.title, description: post.excerpt ?? undefined }
}

function renderContent(content: string | null): string {
  if (!content) return ""
  try {
    const json = JSON.parse(content)
    return generateHTML(json, [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
      Highlight,
      TaskList,
      TaskItem.configure({ nested: true }),
    ])
  } catch {
    // Fallback: treat as plain text
    return `<p>${content.replace(/\n/g, "</p><p>")}</p>`
  }
}

export default async function PublicPostPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: post } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .single()

  if (!post) notFound()

  const p = post as BlogPost
  const html = renderContent(p.content)

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <header className="mb-10 space-y-3">
        {p.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {p.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                {tag}
              </span>
            ))}
          </div>
        )}
        <h1 className="text-3xl font-bold tracking-tight">{p.title}</h1>
        {p.excerpt && <p className="text-lg text-muted-foreground leading-relaxed">{p.excerpt}</p>}
        <p className="text-sm text-muted-foreground">
          {p.published_at
            ? new Date(p.published_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
            : ""}
        </p>
      </header>

      <article
        className="prose prose-neutral dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}

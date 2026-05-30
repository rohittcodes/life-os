import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { renderToHTMLString } from "@tiptap/static-renderer"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import Link from "@tiptap/extension-link"
import Highlight from "@tiptap/extension-highlight"
import TaskList from "@tiptap/extension-task-list"
import TaskItem from "@tiptap/extension-task-item"
import ImageExt from "@tiptap/extension-image"
import { Node, mergeAttributes } from "@tiptap/core"
import NextImage from "next/image"
import type { Metadata } from "next"
import type { BlogPost } from "@/lib/types"

interface Props { params: Promise<{ slug: string }> }

// Mirror the custom nodes from the editor
const VideoNode = Node.create({
  name: "video", group: "block", atom: true,
  addAttributes() { return { src: { default: null }, controls: { default: true } } },
  parseHTML() { return [{ tag: "video[src]" }] },
  renderHTML({ HTMLAttributes }) {
    return ["video", mergeAttributes(HTMLAttributes, { controls: true, class: "w-full rounded-xl max-h-96 my-4" })]
  },
})
const AudioNode = Node.create({
  name: "audio", group: "block", atom: true,
  addAttributes() { return { src: { default: null } } },
  parseHTML() { return [{ tag: "audio[src]" }] },
  renderHTML({ HTMLAttributes }) {
    return ["audio", mergeAttributes(HTMLAttributes, { controls: true, class: "w-full my-3" })]
  },
})

const RENDER_EXTENSIONS = [
  StarterKit,
  Underline,
  Link.configure({ openOnClick: false }),
  Highlight,
  TaskList,
  TaskItem.configure({ nested: true }),
  ImageExt,
  VideoNode,
  AudioNode,
]

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const [{ data: post }, { data: siteProfile }] = await Promise.all([
    supabase.from("blog_posts").select("title, excerpt, cover_image, published_at, tags").eq("slug", slug).eq("published", true).single(),
    // Try to get the site author's display name
    supabase.from("user_profiles").select("display_name, avatar_url").limit(1).single(),
  ])
  if (!post) return { title: "Not found" }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://life-os.app"
  const postUrl = `${siteUrl}/p/${slug}`
  const authorName = siteProfile?.display_name ?? "Life OS"
  const images = post.cover_image
    ? [{ url: post.cover_image, width: 1200, height: 630, alt: post.title }]
    : [{ url: `${siteUrl}/icon-512`, width: 512, height: 512, alt: "Life OS" }]

  return {
    title: post.title,
    description: post.excerpt ?? `A post by ${authorName}`,
    authors: [{ name: authorName }],
    keywords: post.tags ?? [],
    alternates: { canonical: postUrl },
    openGraph: {
      type: "article",
      url: postUrl,
      title: post.title,
      description: post.excerpt ?? `A post by ${authorName}`,
      images,
      publishedTime: post.published_at ?? undefined,
      authors: [authorName],
      tags: post.tags ?? [],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt ?? `A post by ${authorName}`,
      images: images.map((i) => i.url),
    },
    robots: { index: true, follow: true },
  }
}

function renderContent(content: string | null): string {
  if (!content) return ""
  try {
    const json = JSON.parse(content)
    // renderToHTMLString is DOM-free — safe in Node.js server components
    return renderToHTMLString({ content: json, extensions: RENDER_EXTENSIONS })
  } catch (err) {
    console.error("[renderContent] failed:", err)
    if (!content.startsWith("{")) {
      return `<p>${content.replace(/\n/g, "</p><p>")}</p>`
    }
    return ""
  }
}

export default async function PublicPostPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: post } = await supabase
    .from("blog_posts").select("*").eq("slug", slug).eq("published", true).single()
  if (!post) notFound()

  const p = post as BlogPost

  // Fetch author profile
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("display_name, author_bio, avatar_url, website_url")
    .eq("id", p.user_id)
    .single()

  const { data: authUser } = await supabase.auth.getUser()
  const authorName = profile?.display_name ?? authUser?.user?.email?.split("@")[0] ?? "Author"
  const html = renderContent(p.content)

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://life-os.app"
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": p.title,
    "description": p.excerpt ?? undefined,
    "image": p.cover_image ?? undefined,
    "datePublished": p.published_at ?? undefined,
    "author": {
      "@type": "Person",
      "name": authorName,
      "url": profile?.website_url ?? siteUrl,
    },
    "publisher": {
      "@type": "Organization",
      "name": authorName,
      "logo": { "@type": "ImageObject", "url": `${siteUrl}/icon-192` },
    },
    "url": `${siteUrl}/p/${p.slug}`,
    "keywords": p.tags.join(", ") || undefined,
  }

  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/* Cover image */}
      {p.cover_image && (
        <div className="relative h-64 w-full sm:h-80 md:h-96 overflow-hidden bg-muted">
          <NextImage
            src={p.cover_image}
            alt={p.title}
            fill
            className="object-cover"
            unoptimized
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        </div>
      )}

      <div className="mx-auto max-w-2xl px-6 py-10">
        {/* Tags */}
        {p.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {p.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Title + excerpt */}
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl leading-tight">{p.title}</h1>
        {p.excerpt && (
          <p className="mt-3 text-lg text-muted-foreground leading-relaxed">{p.excerpt}</p>
        )}

        {/* Author + date */}
        <div className="mt-6 flex items-center gap-3 border-y border-border py-4">
          {profile?.avatar_url ? (
            <div className="relative h-10 w-10 overflow-hidden rounded-full bg-muted shrink-0">
              <NextImage
                src={profile.avatar_url}
                alt={authorName}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-foreground text-background font-semibold text-sm">
              {authorName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {profile?.website_url ? (
                <a
                  href={profile.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold hover:underline"
                >
                  {authorName}
                </a>
              ) : (
                <span className="text-sm font-semibold">{authorName}</span>
              )}
              {profile?.author_bio && (
                <span className="text-xs text-muted-foreground truncate">{profile.author_bio}</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {p.published_at
                ? new Date(p.published_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
                : ""}
            </p>
          </div>
        </div>

        {/* Content */}
        <article
          className="prose prose-neutral dark:prose-invert max-w-none mt-8 prose-img:rounded-xl prose-img:shadow-md prose-video:rounded-xl prose-a:text-primary"
          dangerouslySetInnerHTML={{ __html: html }}
        />

        {/* Footer author card */}
        <div className="mt-12 rounded-2xl border border-border bg-card/60 p-6 flex items-start gap-4">
          {profile?.avatar_url ? (
            <div className="relative h-14 w-14 overflow-hidden rounded-full bg-muted shrink-0">
              <NextImage src={profile.avatar_url} alt={authorName} fill className="object-cover" unoptimized />
            </div>
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-foreground text-background font-bold text-xl">
              {authorName.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-semibold">{authorName}</p>
            {profile?.author_bio && (
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{profile.author_bio}</p>
            )}
            {profile?.website_url && (
              <a
                href={profile.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-xs text-primary hover:underline"
              >
                {profile.website_url.replace(/^https?:\/\//, "")}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

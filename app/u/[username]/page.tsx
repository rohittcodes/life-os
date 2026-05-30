import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import NextImage from "next/image"
import type { Metadata } from "next"
import type { BlogPost } from "@/lib/types"

interface Props { params: Promise<{ username: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("display_name, author_bio, avatar_url")
    .eq("username", username)
    .maybeSingle()
  const name = profile?.display_name ?? username
  return {
    title: `${name} · Life OS`,
    description: profile?.author_bio ?? `Posts by ${name}`,
    openGraph: {
      title: `${name} · Life OS`,
      description: profile?.author_bio ?? `Posts by ${name}`,
      images: profile?.avatar_url ? [profile.avatar_url] : [],
    },
  }
}

export default async function PublicProfilePage({ params }: Props) {
  const { username } = await params
  const supabase = await createClient()

  // Look up user by username or display_name (case insensitive)
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id, display_name, author_bio, avatar_url, website_url")
    .or(`username.eq.${username},display_name.ilike.${username}`)
    .maybeSingle()

  if (!profile) notFound()

  // Fetch published blog posts
  const { data: posts } = await supabase
    .from("blog_posts")
    .select("id, title, slug, excerpt, cover_image, tags, published_at, created_at")
    .eq("user_id", profile.id)
    .eq("published", true)
    .order("published_at", { ascending: false })
    .limit(50)

  const authorName = profile.display_name ?? username
  const allPosts: BlogPost[] = (posts ?? []) as BlogPost[]

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border/60 bg-background/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-foreground text-background text-[9px] font-bold">OS</div>
            Life OS
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-3xl px-6 py-12">
        {/* Author header */}
        <div className="flex items-start gap-5 mb-10">
          {profile.avatar_url ? (
            <div className="relative h-20 w-20 overflow-hidden rounded-full border border-border bg-muted shrink-0">
              <NextImage src={profile.avatar_url} alt={authorName} fill className="object-cover" unoptimized />
            </div>
          ) : (
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-foreground text-background text-2xl font-bold">
              {authorName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">{authorName}</h1>
            {profile.author_bio && (
              <p className="mt-1.5 text-muted-foreground leading-relaxed">{profile.author_bio}</p>
            )}
            {profile.website_url && (
              <a
                href={profile.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-sm text-primary hover:underline"
              >
                {profile.website_url.replace(/^https?:\/\//, "")}
              </a>
            )}
            <p className="mt-2 text-xs text-muted-foreground">{allPosts.length} post{allPosts.length !== 1 ? "s" : ""}</p>
          </div>
        </div>

        {/* Posts */}
        {allPosts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
            No published posts yet
          </div>
        ) : (
          <div className="space-y-6">
            {allPosts.map((post) => (
              <Link
                key={post.id}
                href={`/p/${post.slug}`}
                className="group flex gap-5 rounded-2xl border border-border bg-card p-5 hover:border-foreground/20 transition-colors"
              >
                {post.cover_image && (
                  <div className="relative h-24 w-36 shrink-0 overflow-hidden rounded-xl bg-muted">
                    <NextImage src={post.cover_image} alt={post.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" unoptimized />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold leading-snug group-hover:underline">{post.title}</h2>
                  {post.excerpt && (
                    <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2 leading-relaxed">{post.excerpt}</p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {post.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{tag}</span>
                    ))}
                    <span className="text-xs text-muted-foreground ml-auto">
                      {post.published_at
                        ? new Date(post.published_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                        : ""}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <footer className="border-t border-border mt-16 px-6 py-6 text-center text-xs text-muted-foreground">
        Published on <Link href="/" className="hover:underline">Life OS</Link>
      </footer>
    </div>
  )
}

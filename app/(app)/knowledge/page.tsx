import Link from "next/link"

export const metadata = { title: "Knowledge Base" }
import { createClient } from "@/lib/supabase/server"
import { KnowledgeActions } from "@/components/knowledge/knowledge-actions"
import type { KnowledgeArticle } from "@/lib/types"

interface Props { searchParams: Promise<{ q?: string; tag?: string }> }

export default async function KnowledgePage({ searchParams }: Props) {
  const { q, tag } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let query = supabase.from("knowledge_articles").select("*").eq("user_id", user!.id).order("pinned", { ascending: false }).order("updated_at", { ascending: false })
  if (q) query = query.ilike("title", `%${q}%`)
  if (tag) query = query.contains("tags", [tag])

  const { data: articles = [] } = await query

  const allArticles: KnowledgeArticle[] = articles ?? []
  const allTags = [...new Set(allArticles.flatMap((a) => a.tags))].sort()
  const pinned = allArticles.filter((a) => a.pinned)
  const rest = allArticles.filter((a) => !a.pinned)

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Knowledge Base</h1>
          <p className="text-sm text-muted-foreground">{allArticles.length} notes · personal wiki</p>
        </div>
        <Link
          href="/knowledge/new"
          className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 transition-opacity"
        >
          New article
        </Link>
      </div>

      {/* Search + tag filter */}
      <div className="flex gap-3">
        <form className="flex-1">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search articles…"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </form>
        {allTags.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {allTags.slice(0, 6).map((t) => (
              <Link
                key={t}
                href={tag === t ? "/knowledge" : `/knowledge?tag=${t}`}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                  tag === t ? "bg-foreground text-background" : "bg-muted hover:bg-muted/80"
                }`}
              >
                {t}
              </Link>
            ))}
          </div>
        )}
      </div>

      {allArticles.length === 0 && (
        <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
          No articles yet — start building your knowledge base
        </div>
      )}

      {pinned.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">📌 Pinned</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pinned.map((article) => <ArticleCard key={article.id} article={article} />)}
          </div>
        </div>
      )}

      {rest.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((article) => <ArticleCard key={article.id} article={article} />)}
        </div>
      )}
    </div>
  )
}

function ArticleCard({ article }: { article: KnowledgeArticle }) {
  const preview = article.content
    ? article.content.replace(/[#*`\[\]]/g, "").slice(0, 120)
    : "No content yet"

  return (
    <div className="group relative rounded-xl border border-border bg-card p-4 hover:border-foreground/20 transition-colors">
      <Link href={`/knowledge/${article.id}`} className="block space-y-2">
        <h3 className="font-medium text-sm leading-tight">{article.title}</h3>
        <p className="text-xs text-muted-foreground line-clamp-3">{preview}</p>
        {article.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {article.tags.slice(0, 3).map((t) => (
              <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-xs">{t}</span>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground/60">
          {new Date(article.updated_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
        </p>
      </Link>
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <KnowledgeActions article={article} />
      </div>
    </div>
  )
}

import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { KnowledgeEditor } from "@/components/knowledge/knowledge-editor"
import type { KnowledgeArticle } from "@/lib/types"

interface Props { params: Promise<{ id: string }> }

export default async function EditArticlePage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: article } = await supabase.from("knowledge_articles").select("*").eq("id", id).eq("user_id", user!.id).single()
  if (!article) notFound()

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">{article.title}</h1>
        <p className="text-sm text-muted-foreground">
          Updated {new Date(article.updated_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>
      <KnowledgeEditor article={article as KnowledgeArticle} />
    </div>
  )
}

import { KnowledgeEditor } from "@/components/knowledge/knowledge-editor"

export default function NewArticlePage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">New article</h1>
        <p className="text-sm text-muted-foreground">Add to your personal knowledge base</p>
      </div>
      <KnowledgeEditor />
    </div>
  )
}

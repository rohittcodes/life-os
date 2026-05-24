import { PostEditor } from "@/components/blog/post-editor"

export default function NewPostPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">New post</h1>
        <p className="text-sm text-muted-foreground">Write in Markdown, preview before publishing</p>
      </div>
      <PostEditor />
    </div>
  )
}

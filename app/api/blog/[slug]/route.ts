import { createClient } from "@/lib/supabase/server"
import { verifyApiKey } from "@/lib/api-key"
import { NextResponse } from "next/server"

interface Params { params: Promise<{ slug: string }> }

export async function GET(request: Request, { params }: Params) {
  const authorized = await verifyApiKey(request.headers.get("Authorization"))
  if (!authorized) {
    return NextResponse.json(
      { error: "Unauthorized. Provide a valid API key via Authorization: Bearer <key>" },
      { status: 401 }
    )
  }

  const { slug } = await params
  const supabase = await createClient()

  const { data: post, error } = await supabase
    .from("blog_posts")
    .select("id, title, slug, content, excerpt, tags, published_at, created_at")
    .eq("slug", slug)
    .eq("published", true)
    .single()

  if (error || !post) return NextResponse.json({ error: "Post not found" }, { status: 404 })

  return NextResponse.json(post)
}

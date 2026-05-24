import { createClient } from "@/lib/supabase/server"
import { verifyApiKey } from "@/lib/api-key"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const authorized = await verifyApiKey(request.headers.get("Authorization"))
  if (!authorized) {
    return NextResponse.json(
      { error: "Unauthorized. Provide a valid API key via Authorization: Bearer <key>" },
      { status: 401 }
    )
  }

  const supabase = await createClient()
  const { data: posts, error } = await supabase
    .from("blog_posts")
    .select("id, title, slug, excerpt, tags, published_at, created_at")
    .eq("published", true)
    .order("published_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ posts: posts ?? [], total: posts?.length ?? 0 })
}

"use server"

import { requireUser } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

function toSlug(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}

export async function savePost(formData: FormData, postId?: string) {
  const { supabase, user } = await requireUser()

  const title = (formData.get("title") as string)?.trim()
  if (!title) return

  const rawSlug = (formData.get("slug") as string)?.trim()
  const baseSlug = rawSlug ? toSlug(rawSlug) : toSlug(title)

  // Ensure slug is unique (skip current post if editing)
  let slug = baseSlug
  let attempt = 1
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data: existing } = await supabase
      .from("blog_posts")
      .select("id")
      .eq("slug", slug)
      .maybeSingle()
    if (!existing || existing.id === postId) break
    attempt++
    slug = `${baseSlug}-${attempt}`
  }

  const content = (formData.get("content") as string) || null
  const excerpt = (formData.get("excerpt") as string)?.trim() || null
  const tagsRaw = (formData.get("tags") as string)?.trim()
  const tags = tagsRaw ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean) : []
  const publish = formData.get("publish") === "true"
  const cover_image = (formData.get("cover_image") as string)?.trim() || null

  if (postId) {
    await supabase
      .from("blog_posts")
      .update({
        title,
        slug,
        content,
        excerpt,
        tags,
        cover_image,
        published: publish,
        published_at: publish ? new Date().toISOString() : null,
      })
      .eq("id", postId)
      .eq("user_id", user.id)
  } else {
    const { data } = await supabase
      .from("blog_posts")
      .insert({
        user_id: user.id,
        title,
        slug,
        content,
        excerpt,
        tags,
        cover_image,
        published: publish,
        published_at: publish ? new Date().toISOString() : null,
      })
      .select("id")
      .single()

    if (data) {
      revalidatePath("/blog")
      redirect(`/blog/${data.id}`)
    }
    return
  }

  revalidatePath("/blog")
  revalidatePath(`/blog/${slug}`)
  redirect("/blog")
}

export async function deletePost(id: string) {
  const { supabase, user } = await requireUser()
  await supabase.from("blog_posts").delete().eq("id", id).eq("user_id", user.id)
  revalidatePath("/blog")
}

export async function togglePublish(id: string, published: boolean) {
  const { supabase, user } = await requireUser()
  await supabase
    .from("blog_posts")
    .update({
      published,
      published_at: published ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .eq("user_id", user.id)
  revalidatePath("/blog")
}

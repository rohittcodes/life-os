"use server"

import { revalidatePath } from "next/cache"
import { requireUser } from "@/lib/auth"

export async function createArticle(fd: FormData) {
  const { supabase, user } = await requireUser()
  const title = (fd.get("title") as string)?.trim()
  if (!title) return
  const content = (fd.get("content") as string) || null
  const tagsRaw = (fd.get("tags") as string) || ""
  const tags = tagsRaw.split(",").map((t) => t.trim()).filter(Boolean)
  const { data } = await supabase.from("knowledge_articles").insert({ user_id: user.id, title, content, tags }).select("id").single()
  revalidatePath("/knowledge")
  return data?.id
}

export async function updateArticle(id: string, fd: FormData) {
  const { supabase, user } = await requireUser()
  const title = (fd.get("title") as string)?.trim()
  if (!title) return
  const content = (fd.get("content") as string) || null
  const tagsRaw = (fd.get("tags") as string) || ""
  const tags = tagsRaw.split(",").map((t) => t.trim()).filter(Boolean)
  await supabase.from("knowledge_articles").update({ title, content, tags }).eq("id", id).eq("user_id", user.id)
  revalidatePath("/knowledge")
  revalidatePath(`/knowledge/${id}`)
}

export async function togglePin(id: string, pinned: boolean) {
  const { supabase, user } = await requireUser()
  await supabase.from("knowledge_articles").update({ pinned }).eq("id", id).eq("user_id", user.id)
  revalidatePath("/knowledge")
}

export async function deleteArticle(id: string) {
  const { supabase, user } = await requireUser()
  await supabase.from("knowledge_articles").delete().eq("id", id).eq("user_id", user.id)
  revalidatePath("/knowledge")
}

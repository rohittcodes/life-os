"use server"

import { requireUser } from "@/lib/auth"
import { revalidatePath } from "next/cache"

const VALID_READING_STATUSES = new Set(["want_to_read","reading","done","dropped"])
const VALID_READING_TYPES = new Set(["book","article","course","podcast","video"])

export async function addBookmark(formData: FormData) {
  const { supabase, user } = await requireUser()
  const url = (formData.get("url") as string)?.trim()
  const title = (formData.get("title") as string)?.trim()
  if (!url || !title) return

  const tagsRaw = (formData.get("tags") as string)?.trim()
  const tags = tagsRaw ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean) : []

  await supabase.from("bookmarks").insert({
    user_id: user.id, url, title,
    description: (formData.get("description") as string)?.trim() || null,
    tags,
  })
  revalidatePath("/bookmarks")
}

export async function deleteBookmark(id: string) {
  const { supabase, user } = await requireUser()
  await supabase.from("bookmarks").delete().eq("id", id).eq("user_id", user.id)
  revalidatePath("/bookmarks")
}

export async function addReadingItem(formData: FormData) {
  const { supabase, user } = await requireUser()
  const title = (formData.get("title") as string)?.trim()
  const type = formData.get("type") as string
  if (!title || !VALID_READING_TYPES.has(type)) return

  await supabase.from("reading_list").insert({
    user_id: user.id,
    title,
    type,
    author: (formData.get("author") as string)?.trim() || null,
    url: (formData.get("url") as string)?.trim() || null,
    status: "want_to_read",
    notes: (formData.get("notes") as string)?.trim() || null,
  })
  revalidatePath("/bookmarks")
}

export async function updateReadingStatus(id: string, status: string) {
  if (!VALID_READING_STATUSES.has(status)) return
  const { supabase, user } = await requireUser()
  const extra = status === "done" ? { finished_at: new Date().toISOString().split("T")[0] } : {}
  await supabase.from("reading_list").update({ status, ...extra }).eq("id", id).eq("user_id", user.id)
  revalidatePath("/bookmarks")
}

export async function deleteReadingItem(id: string) {
  const { supabase, user } = await requireUser()
  await supabase.from("reading_list").delete().eq("id", id).eq("user_id", user.id)
  revalidatePath("/bookmarks")
}

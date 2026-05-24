"use server"

import { requireUser } from "@/lib/auth"
import { revalidatePath } from "next/cache"

// content can be a JSON string (unencrypted) or an encrypted string (v1:enc:...)
export async function saveNote(date: string, content: string) {
  const { supabase, user } = await requireUser()
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return

  await supabase.from("daily_notes").upsert(
    { user_id: user.id, note_date: date, content },
    { onConflict: "user_id,note_date" }
  )

  revalidatePath("/notes")
}

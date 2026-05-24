"use server"

import { revalidatePath } from "next/cache"
import { requireUser } from "@/lib/auth"

export async function createProject(fd: FormData) {
  const { supabase, user } = await requireUser()
  const name = (fd.get("name") as string)?.trim()
  if (!name) return
  const description = (fd.get("description") as string) || null
  const color = (fd.get("color") as string) || "#6366f1"
  const emoji = (fd.get("emoji") as string) || "📁"
  await supabase.from("projects").insert({ user_id: user.id, name, description, color, emoji })
  revalidatePath("/projects")
}

export async function updateProject(id: string, fd: FormData) {
  const { supabase, user } = await requireUser()
  const name = (fd.get("name") as string)?.trim()
  if (!name) return
  const description = (fd.get("description") as string) || null
  const color = (fd.get("color") as string) || "#6366f1"
  const emoji = (fd.get("emoji") as string) || "📁"
  const status = (fd.get("status") as string) || "active"
  await supabase.from("projects").update({ name, description, color, emoji, status })
    .eq("id", id).eq("user_id", user.id)
  revalidatePath("/projects")
  revalidatePath(`/projects/${id}`)
}

export async function archiveProject(id: string) {
  const { supabase, user } = await requireUser()
  await supabase.from("projects").update({ status: "archived" }).eq("id", id).eq("user_id", user.id)
  revalidatePath("/projects")
}

export async function addTask(projectId: string, fd: FormData) {
  const { supabase, user } = await requireUser()
  const title = (fd.get("title") as string)?.trim()
  if (!title) return
  const milestone = (fd.get("milestone") as string) || null
  const priority = parseInt(fd.get("priority") as string) || 2
  const due_date = (fd.get("due_date") as string) || null
  await supabase.from("product_tasks").insert({
    user_id: user.id, project_id: projectId, title, milestone, priority, due_date,
  })
  revalidatePath(`/projects/${projectId}`)
}

export async function updateTaskStatus(taskId: string, status: string, projectId: string) {
  const { supabase, user } = await requireUser()
  if (!["todo", "in_progress", "blocked", "done"].includes(status)) return
  await supabase.from("product_tasks").update({ status }).eq("id", taskId).eq("user_id", user.id)
  revalidatePath(`/projects/${projectId}`)
}

export async function deleteTask(taskId: string, projectId: string) {
  const { supabase, user } = await requireUser()
  await supabase.from("product_tasks").delete().eq("id", taskId).eq("user_id", user.id)
  revalidatePath(`/projects/${projectId}`)
}

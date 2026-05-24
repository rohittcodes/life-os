"use client"

import { useState, useTransition } from "react"
import { createProject } from "@/app/(app)/projects/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

const COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316", "#eab308", "#22c55e", "#14b8a6", "#3b82f6", "#64748b"]
const EMOJIS = ["📁", "🚀", "💡", "🎯", "⚡", "🌟", "🔧", "🎨", "📱", "🤖", "💼", "📊", "🛠️", "🧪", "🎮"]

export function ProjectForm() {
  const [open, setOpen] = useState(false)
  const [selectedColor, setSelectedColor] = useState(COLORS[0])
  const [selectedEmoji, setSelectedEmoji] = useState(EMOJIS[0])
  const [, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set("color", selectedColor)
    fd.set("emoji", selectedEmoji)
    startTransition(async () => { await createProject(fd); setOpen(false) })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button>New project</Button></DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Create project</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Emoji</Label>
            <div className="flex flex-wrap gap-1.5">
              {EMOJIS.map((e) => (
                <button
                  key={e} type="button"
                  onClick={() => setSelectedEmoji(e)}
                  className={`h-8 w-8 rounded-lg text-lg transition-all ${selectedEmoji === e ? "ring-2 ring-foreground" : "hover:bg-muted"}`}
                >{e}</button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input name="name" required placeholder="My awesome project" />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea name="description" rows={2} placeholder="What are you building?" />
          </div>
          <div className="space-y-1.5">
            <Label>Color accent</Label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c} type="button"
                  onClick={() => setSelectedColor(c)}
                  style={{ backgroundColor: c }}
                  className={`h-6 w-6 rounded-full transition-transform ${selectedColor === c ? "scale-125 ring-2 ring-offset-2 ring-foreground" : "hover:scale-110"}`}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit">Create</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

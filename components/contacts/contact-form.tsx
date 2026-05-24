"use client"

import { useState, useTransition } from "react"
import { addContact } from "@/app/(app)/contacts/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const relationships = ["friend","colleague","mentor","client","recruiter","professional","other"]

const warmthLabels: Record<string, string> = {
  "1": "1 — Cold", "2": "2 — Acquaintance", "3": "3 — Warm", "4": "4 — Good friend", "5": "5 — Close"
}

export function ContactForm() {
  const [open, setOpen] = useState(false)
  const [relationship, setRelationship] = useState("professional")
  const [warmth, setWarmth] = useState("3")
  const [, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set("relationship", relationship)
    fd.set("warmth", warmth)
    startTransition(async () => { await addContact(fd); setOpen(false) })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline">Add contact</Button></DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>New contact</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input name="name" required placeholder="Priya Sharma" />
            </div>
            <div className="space-y-1.5">
              <Label>Relationship</Label>
              <Select value={relationship} onValueChange={setRelationship}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {relationships.map((r) => (
                    <SelectItem key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input name="email" type="email" placeholder="priya@company.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input name="phone" placeholder="+91 98765 43210" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Company</Label>
              <Input name="company" placeholder="Acme Corp" />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Input name="role" placeholder="Engineering Manager" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Warmth (1–5)</Label>
              <Select value={warmth} onValueChange={setWarmth}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["1","2","3","4","5"].map((n) => (
                    <SelectItem key={n} value={n}>{warmthLabels[n]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Follow-up date</Label>
              <Input name="next_follow_up" type="date" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea name="notes" rows={2} placeholder="Met at conference, interested in AI..." />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

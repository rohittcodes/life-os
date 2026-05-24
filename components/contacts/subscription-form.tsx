"use client"

import { useState, useTransition } from "react"
import { addSubscription } from "@/app/(app)/contacts/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const cycles = ["weekly","monthly","quarterly","yearly"]
const categories = ["streaming","productivity","cloud","learning","health","finance","misc"]

export function SubscriptionForm() {
  const [open, setOpen] = useState(false)
  const [cycle, setCycle] = useState("monthly")
  const [category, setCategory] = useState("misc")
  const [, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set("billing_cycle", cycle)
    fd.set("category", category)
    startTransition(async () => { await addSubscription(fd); setOpen(false) })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button>Add subscription</Button></DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>New subscription</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input name="name" required placeholder="Netflix, Notion, GitHub..." />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Amount (₹)</Label>
              <Input name="amount" type="number" step="0.01" required placeholder="649" />
            </div>
            <div className="space-y-1.5">
              <Label>Cycle</Label>
              <Select value={cycle} onValueChange={setCycle}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {cycles.map((c) => (
                    <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Next billing date</Label>
              <Input name="next_billing_date" type="date" />
            </div>
            <div className="space-y-1.5">
              <Label>URL</Label>
              <Input name="url" type="url" placeholder="https://..." />
            </div>
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

"use client"

import { useState, useTransition } from "react"
import { addClient } from "@/app/(app)/freelance/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const statuses = ["negotiating", "active", "delivered", "paid", "on_hold"]

export function ClientForm() {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState("negotiating")
  const [rateType, setRateType] = useState("fixed")
  const [, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set("status", status)
    fd.set("rate_type", rateType)
    startTransition(async () => {
      await addClient(fd)
      setOpen(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add work item</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New work item</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="client_name">Company / client</Label>
              <Input id="client_name" name="client_name" required placeholder="Acme Corp" />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.replace("_", " ").replace(/^\w/, (c) => c.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="project">Work / project</Label>
            <Input id="project" name="project" required placeholder="Take-home task, redesign, contract work" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rate">Rate (₹)</Label>
              <Input id="rate" name="rate" type="number" placeholder="5000" />
            </div>
            <div className="space-y-1.5">
              <Label>Rate type</Label>
              <Select value={rateType} onValueChange={setRateType}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed</SelectItem>
                  <SelectItem value="hourly">Hourly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="amount_agreed">Agreed (₹)</Label>
              <Input id="amount_agreed" name="amount_agreed" type="number" placeholder="50000" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="deadline">Deadline</Label>
            <Input id="deadline" name="deadline" type="date" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={2} placeholder="Recruiter/client contact, contract details, next steps..." />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

"use client"

import { useState, useTransition } from "react"
import { updateJob } from "@/app/(app)/jobs/actions"
import { Pencil, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { JobApplication } from "@/lib/types"

interface Props {
  job: JobApplication
}

const STATUSES = ["applied", "screen", "interview", "offer", "rejected", "ghosted"] as const

export function JobEditSheet({ job }: Props) {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState(job.status)
  const [pending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set("status", status)
    startTransition(async () => {
      await updateJob(job.id, fd)
      setSaved(true)
      setTimeout(() => { setSaved(false); setOpen(false) }, 800)
    })
  }

  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(true) }}
        className="shrink-0 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 sm:opacity-60 transition-all p-0.5"
        title="Edit"
      >
        <Pencil className="h-3 w-3" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          onClick={() => setOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />

          {/* Sheet */}
          <div
            className="relative w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-border bg-card p-5 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm">Edit application</h2>
              <button onClick={() => setOpen(false)} className="rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-company" className="text-xs">Company</Label>
                  <Input id="edit-company" name="company" defaultValue={job.company} required className="h-8 text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-role" className="text-xs">Role</Label>
                  <Input id="edit-role" name="role" defaultValue={job.role} required className="h-8 text-xs" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Status</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s} className="text-xs capitalize">{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-salary" className="text-xs">Salary (LPA)</Label>
                  <Input id="edit-salary" name="salary_lpa" type="number" defaultValue={job.salary_lpa ?? ""} placeholder="e.g. 18" className="h-8 text-xs" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-applied" className="text-xs">Applied date</Label>
                  <Input id="edit-applied" name="applied_at" type="date" defaultValue={job.applied_at} className="h-8 text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-next" className="text-xs">Next action date</Label>
                  <Input id="edit-next" name="next_action_date" type="date" defaultValue={job.next_action_date ?? ""} className="h-8 text-xs" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-notes" className="text-xs">Notes</Label>
                <Textarea id="edit-notes" name="notes" defaultValue={job.notes ?? ""} rows={2} placeholder="Interview prep, contacts, links…" className="text-xs" />
              </div>

              <Button type="submit" disabled={pending || saved} className={cn("w-full", saved && "bg-green-500 hover:bg-green-500")}>
                {pending ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />Saving…</> : saved ? "Saved ✓" : "Save changes"}
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

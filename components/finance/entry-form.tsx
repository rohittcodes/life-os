"use client"

import { useState, useTransition } from "react"
import { addEntry } from "@/app/(app)/finance/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const incomeCategories = ["salary", "freelance", "other"]
const expenseCategories = ["food", "transport", "subscriptions", "learning", "misc"]
const categoryLabels: Record<string, string> = {
  freelance: "Contract work",
}

export function EntryForm({ currency = "INR" }: { currency?: string }) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<"income" | "expense">("expense")
  const [category, setCategory] = useState(expenseCategories[0])
  const [, startTransition] = useTransition()

  const categories = type === "income" ? incomeCategories : expenseCategories

  function handleTypeChange(t: "income" | "expense") {
    setType(t)
    setCategory(t === "income" ? incomeCategories[0] : expenseCategories[0])
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set("type", type)
    fd.set("category", category)
    startTransition(async () => {
      await addEntry(fd)
      setOpen(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add entry</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New finance entry</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex rounded-lg border border-border overflow-hidden">
            {(["income", "expense"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => handleTypeChange(t)}
                className={`flex-1 py-1.5 text-sm font-medium transition-colors ${
                  type === t ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>{categoryLabels[c] ?? c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="amount">Amount ({currency})</Label>
              <Input id="amount" name="amount" type="number" step="0.01" required placeholder="5000" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="source">Source / Payee</Label>
              <Input id="source" name="source" placeholder="Company name" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="entry_date">Date</Label>
              <Input id="entry_date" name="entry_date" type="date" defaultValue={new Date().toISOString().split("T")[0]} required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={2} placeholder="Invoice #, receipt..." />
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

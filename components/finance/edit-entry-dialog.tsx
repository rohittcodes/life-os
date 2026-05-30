"use client"

import { useState, useTransition } from "react"
import { updateEntry } from "@/app/(app)/finance/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import type { FinanceEntry } from "@/lib/types"

const incomeCategories = ["salary", "freelance", "other"]
const expenseCategories = ["food", "transport", "subscriptions", "learning", "misc"]
const categoryLabels: Record<string, string> = { freelance: "Contract work" }

interface Props {
  entry: FinanceEntry
  open: boolean
  onClose: () => void
  currency?: string
}

export function EditEntryDialog({ entry, open, onClose, currency = "INR" }: Props) {
  const [type, setType] = useState<"income" | "expense">(entry.type as "income" | "expense")
  const [category, setCategory] = useState(entry.category)
  const [, startTransition] = useTransition()

  const categories = type === "income" ? incomeCategories : expenseCategories

  function handleTypeChange(t: "income" | "expense") {
    setType(t)
    const validCats = t === "income" ? incomeCategories : expenseCategories
    if (!validCats.includes(category)) setCategory(validCats[0])
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set("type", type)
    fd.set("category", category)
    startTransition(async () => {
      await updateEntry(entry.id, fd)
      onClose()
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit entry</DialogTitle>
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
                    <SelectItem key={c} value={c}>
                      {categoryLabels[c] ?? c.charAt(0).toUpperCase() + c.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-amount">Amount ({currency})</Label>
              <Input
                id="edit-amount"
                name="amount"
                type="number"
                step="0.01"
                required
                defaultValue={entry.amount}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-source">Source / Payee</Label>
              <Input id="edit-source" name="source" defaultValue={entry.source ?? ""} placeholder="Company name" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-date">Date</Label>
              <Input id="edit-date" name="entry_date" type="date" defaultValue={entry.entry_date} required />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-notes">Notes</Label>
            <Textarea id="edit-notes" name="notes" rows={2} defaultValue={entry.notes ?? ""} placeholder="Invoice #, receipt…" />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">
              <Loader2 className="hidden h-4 w-4 mr-1.5 animate-spin" />
              Save changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

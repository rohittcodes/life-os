"use client"

import { useTransition } from "react"
import { deleteEntry } from "@/app/(app)/finance/actions"
import type { FinanceEntry } from "@/lib/types"

interface LedgerProps {
  entries: FinanceEntry[]
}

export function Ledger({ entries }: LedgerProps) {
  const [, startTransition] = useTransition()

  function handleDelete(id: string) {
    startTransition(() => deleteEntry(id))
  }

  if (entries.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
        No entries yet — add income or expenses
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="grid grid-cols-[1fr,auto,auto,auto] gap-x-4 border-b border-border px-4 py-2 text-xs font-medium text-muted-foreground">
        <span>Description</span>
        <span className="text-right">Category</span>
        <span className="text-right">Date</span>
        <span className="text-right">Amount</span>
      </div>
      {entries.map((entry) => (
        <div key={entry.id} className="group grid grid-cols-[1fr,auto,auto,auto] gap-x-4 border-b border-border/50 px-4 py-2.5 last:border-0 hover:bg-muted/30 transition-colors">
          <div className="min-w-0">
            <span className="text-sm font-medium">{entry.source || entry.category}</span>
            {entry.notes && <span className="ml-2 text-xs text-muted-foreground">{entry.notes}</span>}
          </div>
          <span className="text-xs text-muted-foreground self-center">
            {entry.category.charAt(0).toUpperCase() + entry.category.slice(1)}
          </span>
          <span className="text-xs text-muted-foreground self-center">
            {new Date(entry.entry_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
          </span>
          <div className="flex items-center gap-2 self-center">
            <span className={`text-sm font-medium ${entry.type === "income" ? "text-green-600 dark:text-green-400" : "text-foreground"}`}>
              {entry.type === "income" ? "+" : "−"}₹{entry.amount.toLocaleString("en-IN")}
            </span>
            <button
              onClick={() => handleDelete(entry.id)}
              className="opacity-0 group-hover:opacity-100 rounded p-0.5 text-muted-foreground hover:text-destructive transition-all"
            >
              <svg className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

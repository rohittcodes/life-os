"use client"

import { useState, useTransition } from "react"
import { upsertBudget, deleteBudget } from "@/app/(app)/finance/budgets/actions"
import { Plus, X, Pencil } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatAmount, currencySymbol } from "@/lib/currency"
import type { FinanceBudget } from "@/lib/types"

interface Props {
  budgets: FinanceBudget[]
  categories: { category: string; spent: number }[]
  month: string
  currency?: string
}

const barColor = (pct: number) =>
  pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-foreground/70"

export function BudgetTargets({ budgets, categories, month, currency = "INR" }: Props) {
  const [editing, setEditing] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [, startTransition] = useTransition()

  const budgetMap = new Map(budgets.map(b => [b.category, b]))

  // Merge: all categories with spending + all budgeted categories
  const allCategories = Array.from(new Set([
    ...categories.map(c => c.category),
    ...budgets.map(b => b.category),
  ])).sort()

  function handleUpsert(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const category = (fd.get("category") as string).trim().toLowerCase()
    const limit = parseFloat(fd.get("limit") as string)
    if (!category || isNaN(limit) || limit <= 0) return
    startTransition(async () => {
      await upsertBudget(category, limit)
      setEditing(null)
      setAdding(false)
    })
  }

  function handleDelete(id: string) {
    startTransition(() => deleteBudget(id))
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Budget vs Actual · {month}</h3>
        <button
          onClick={() => setAdding(v => !v)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add budget
        </button>
      </div>

      {adding && (
        <form onSubmit={handleUpsert} className="flex items-center gap-2">
          <input
            name="category"
            placeholder="Category (e.g. food)"
            className="flex-1 h-8 rounded-lg border border-border bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            autoFocus
          />
          <input
            name="limit"
            type="number"
            placeholder={`${currencySymbol(currency)} limit`}
            className="w-24 h-8 rounded-lg border border-border bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button type="submit" className="h-8 rounded-lg bg-foreground text-background px-3 text-xs font-medium hover:opacity-90 transition-opacity">
            Save
          </button>
          <button type="button" onClick={() => setAdding(false)} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </form>
      )}

      {allCategories.length === 0 && !adding && (
        <p className="text-xs text-muted-foreground text-center py-4">
          No expenses this month. Add budget targets to track spending limits.
        </p>
      )}

      <div className="space-y-3">
        {allCategories.map(cat => {
          const spent = categories.find(c => c.category === cat)?.spent ?? 0
          const budget = budgetMap.get(cat)
          const pct = budget ? Math.min((spent / budget.monthly_limit) * 100, 100) : 0

          return (
            <div key={cat} className="group space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs capitalize font-medium">{cat}</span>
                  {budget && (
                    <button
                      onClick={() => setEditing(editing === cat ? null : cat)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className={cn("font-medium", pct >= 100 ? "text-red-500" : pct >= 80 ? "text-amber-500" : "")}>
                    {formatAmount(spent, currency)}
                  </span>
                  {budget && (
                    <>
                      <span className="text-muted-foreground">/</span>
                      <span className="text-muted-foreground">{formatAmount(budget.monthly_limit, currency)}</span>
                      <button
                        onClick={() => handleDelete(budget.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive ml-1"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </>
                  )}
                  {!budget && (
                    <span className="text-muted-foreground/50 text-[10px]">no budget</span>
                  )}
                </div>
              </div>

              {budget && (
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full transition-all", barColor(pct))}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              )}

              {editing === cat && budget && (
                <form onSubmit={handleUpsert} className="flex items-center gap-2 pt-1">
                  <input name="category" type="hidden" value={cat} />
                  <input
                    name="limit"
                    type="number"
                    defaultValue={budget.monthly_limit}
                    className="flex-1 h-7 rounded-lg border border-border bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                    autoFocus
                  />
                  <button type="submit" className="h-7 rounded-lg bg-foreground text-background px-3 text-xs font-medium hover:opacity-90">
                    Update
                  </button>
                  <button type="button" onClick={() => setEditing(null)} className="text-muted-foreground hover:text-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </form>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

"use client"

import { useState, useMemo } from "react"
import { deleteEntry } from "@/app/(app)/finance/actions"
import { formatAmount } from "@/lib/currency"
import { EditEntryDialog } from "./edit-entry-dialog"
import { Input } from "@/components/ui/input"
import type { FinanceEntry } from "@/lib/types"
import { ChevronUp, ChevronDown, ChevronsUpDown, Pencil, Trash2, Search, X } from "lucide-react"

type SortKey = "entry_date" | "amount" | "category" | "type" | "source"
type SortDir = "asc" | "desc"

interface LedgerProps {
  entries: FinanceEntry[]
  currency?: string
}

function SortIcon({ col, active, dir }: { col: string; active: boolean; dir: SortDir }) {
  if (!active) return <ChevronsUpDown className="h-3 w-3 text-muted-foreground/50" />
  return dir === "asc"
    ? <ChevronUp className="h-3 w-3 text-foreground" />
    : <ChevronDown className="h-3 w-3 text-foreground" />
}

export function Ledger({ entries: initialEntries, currency = "INR" }: LedgerProps) {
  const [entries, setEntries] = useState(initialEntries)
  const [editing, setEditing] = useState<FinanceEntry | null>(null)

  // Sort
  const [sortKey, setSortKey] = useState<SortKey>("entry_date")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  // Filters
  const [search, setSearch] = useState("")
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all")
  const [filterCategory, setFilterCategory] = useState("all")

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(initialEntries.map((e) => e.category))).sort()],
    [initialEntries]
  )

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    else { setSortKey(key); setSortDir("desc") }
  }

  const filtered = useMemo(() => {
    let rows = [...entries]

    if (filterType !== "all") rows = rows.filter((e) => e.type === filterType)
    if (filterCategory !== "all") rows = rows.filter((e) => e.category === filterCategory)
    if (search.trim()) {
      const q = search.toLowerCase()
      rows = rows.filter(
        (e) =>
          (e.source ?? "").toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q) ||
          (e.notes ?? "").toLowerCase().includes(q)
      )
    }

    rows.sort((a, b) => {
      let av: string | number = a[sortKey] ?? ""
      let bv: string | number = b[sortKey] ?? ""
      if (sortKey === "amount") { av = a.amount; bv = b.amount }
      const cmp = av < bv ? -1 : av > bv ? 1 : 0
      return sortDir === "asc" ? cmp : -cmp
    })

    return rows
  }, [entries, filterType, filterCategory, search, sortKey, sortDir])

  async function handleDelete(id: string) {
    const prev = entries
    setEntries((e) => e.filter((x) => x.id !== id))
    try { await deleteEntry(id) } catch { setEntries(prev) }
  }

  const hasFilters = filterType !== "all" || filterCategory !== "all" || search.trim() !== ""

  function clearFilters() {
    setFilterType("all"); setFilterCategory("all"); setSearch("")
  }

  // Header cell helper
  function Th({ col, label, right }: { col: SortKey; label: string; right?: boolean }) {
    return (
      <th
        onClick={() => toggleSort(col)}
        className={`cursor-pointer select-none whitespace-nowrap px-3 py-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors ${right ? "text-right" : "text-left"}`}
      >
        <span className={`inline-flex items-center gap-1 ${right ? "flex-row-reverse" : ""}`}>
          {label}
          <SortIcon col={col} active={sortKey === col} dir={sortDir} />
        </span>
      </th>
    )
  }

  return (
    <>
      {editing && (
        <EditEntryDialog entry={editing} open currency={currency} onClose={() => setEditing(null)} />
      )}

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
          {/* Search */}
          <div className="relative min-w-[160px] flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search entries…"
              className="h-8 pl-8 text-xs"
            />
          </div>

          {/* Type filter */}
          <div className="flex rounded-lg border border-border overflow-hidden text-xs">
            {(["all", "income", "expense"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-3 py-1.5 font-medium capitalize transition-colors ${
                  filterType === t
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Category filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="h-8 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring capitalize"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === "all" ? "All categories" : c.charAt(0).toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>

          {/* Clear */}
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" /> Clear
            </button>
          )}

          <span className="ml-auto text-xs text-muted-foreground">
            {filtered.length} of {entries.length}
          </span>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
            {hasFilters ? "No entries match the current filters." : "No entries yet — add income or expenses."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  <Th col="source" label="Description" />
                  <Th col="type" label="Type" />
                  <Th col="category" label="Category" />
                  <Th col="entry_date" label="Date" />
                  <Th col="amount" label="Amount" right />
                  <th className="w-16 px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry) => (
                  <tr
                    key={entry.id}
                    className="group border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-3 py-2.5 max-w-[200px]">
                      <span className="font-medium truncate block">{entry.source || "—"}</span>
                      {entry.notes && (
                        <span className="text-xs text-muted-foreground truncate block">{entry.notes}</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          entry.type === "income"
                            ? "bg-green-500/10 text-green-700 dark:text-green-400"
                            : "bg-red-500/10 text-red-700 dark:text-red-400"
                        }`}
                      >
                        {entry.type}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-sm text-muted-foreground capitalize">
                      {entry.category}
                    </td>
                    <td className="px-3 py-2.5 text-sm text-muted-foreground whitespace-nowrap">
                      {new Date(entry.entry_date + "T00:00:00").toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className={`px-3 py-2.5 text-right font-medium whitespace-nowrap ${
                      entry.type === "income" ? "text-green-600 dark:text-green-400" : ""
                    }`}>
                      {entry.type === "income" ? "+" : "−"}{formatAmount(entry.amount, currency)}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setEditing(entry)}
                          className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}

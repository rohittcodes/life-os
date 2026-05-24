import { createClient } from "@/lib/supabase/server"
import { EntryForm } from "@/components/finance/entry-form"
import { Ledger } from "@/components/finance/ledger"
import { FinanceChart } from "@/components/finance/finance-chart"
import type { FinanceEntry } from "@/lib/types"

export default async function FinancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0]

  const { data: entries = [] } = await supabase
    .from("finance_entries")
    .select("*")
    .eq("user_id", user!.id)
    .order("entry_date", { ascending: false })

  const allEntries = entries ?? []

  const thisMonth = allEntries.filter(
    (e: FinanceEntry) => e.entry_date >= monthStart && e.entry_date <= monthEnd
  )

  const monthIncome = thisMonth
    .filter((e: FinanceEntry) => e.type === "income")
    .reduce((s: number, e: FinanceEntry) => s + e.amount, 0)

  const monthExpense = thisMonth
    .filter((e: FinanceEntry) => e.type === "expense")
    .reduce((s: number, e: FinanceEntry) => s + e.amount, 0)

  const monthNet = monthIncome - monthExpense

  const allIncome = allEntries
    .filter((e: FinanceEntry) => e.type === "income")
    .reduce((s: number, e: FinanceEntry) => s + e.amount, 0)
  const allExpense = allEntries
    .filter((e: FinanceEntry) => e.type === "expense")
    .reduce((s: number, e: FinanceEntry) => s + e.amount, 0)
  const balance = allIncome - allExpense

  const monthName = now.toLocaleString("default", { month: "long" })

  // Category breakdown for this month
  const categories = new Map<string, number>()
  thisMonth
    .filter((e: FinanceEntry) => e.type === "expense")
    .forEach((e: FinanceEntry) => {
      categories.set(e.category, (categories.get(e.category) ?? 0) + e.amount)
    })

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Finance</h1>
          <p className="text-sm text-muted-foreground">{monthName} {now.getFullYear()} · personal ledger</p>
        </div>
        <EntryForm />
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: `${monthName} income`, value: `₹${monthIncome.toLocaleString("en-IN")}`, positive: true },
          { label: `${monthName} expenses`, value: `₹${monthExpense.toLocaleString("en-IN")}` },
          { label: `${monthName} net`, value: `₹${Math.abs(monthNet).toLocaleString("en-IN")}`, positive: monthNet >= 0, showSign: true, net: monthNet },
          { label: "Running balance", value: `₹${Math.abs(balance).toLocaleString("en-IN")}`, positive: balance >= 0 },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4">
            <div className={`text-2xl font-bold ${s.positive ? "text-green-600 dark:text-green-400" : s.positive === false && s.net !== undefined && s.net < 0 ? "text-red-500" : ""}`}>
              {s.showSign && s.net !== undefined ? (s.net >= 0 ? "+" : "−") : ""}
              {s.value}
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {categories.size > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-medium mb-3">Expense breakdown · {monthName}</h3>
          <div className="space-y-2">
            {Array.from(categories.entries())
              .sort((a, b) => b[1] - a[1])
              .map(([cat, amount]) => {
                const pct = monthExpense > 0 ? (amount / monthExpense) * 100 : 0
                return (
                  <div key={cat} className="flex items-center gap-3">
                    <span className="w-24 text-xs text-muted-foreground capitalize">{cat}</span>
                    <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-foreground/60" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-24 text-right text-xs font-medium">₹{amount.toLocaleString("en-IN")}</span>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {allEntries.length > 0 && <FinanceChart entries={allEntries} />}

      <Ledger entries={allEntries} />
    </div>
  )
}

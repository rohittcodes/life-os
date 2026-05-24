import { createClient } from "@/lib/supabase/server"
import { ClientForm } from "@/components/freelance/client-form"
import { ClientList } from "@/components/freelance/client-list"
import type { FreelanceClient } from "@/lib/types"

export default async function FreelancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: clients = [] } = await supabase
    .from("freelance_clients")
    .select("*")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })

  const active = (clients ?? []).filter((c: FreelanceClient) => c.status === "active")
  const unpaid = (clients ?? []).filter((c: FreelanceClient) => ["active", "delivered"].includes(c.status) && (c.amount_agreed ?? 0) > (c.amount_paid ?? 0))
  const unpaidTotal = unpaid.reduce((sum: number, c: FreelanceClient) => sum + ((c.amount_agreed ?? 0) - (c.amount_paid ?? 0)), 0)

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]
  const thisMonthIncome = (clients ?? [])
    .filter((c: FreelanceClient) => c.status === "paid" && c.created_at >= monthStart)
    .reduce((sum: number, c: FreelanceClient) => sum + (c.amount_paid ?? 0), 0)

  const overdueDeadlines = (clients ?? []).filter(
    (c: FreelanceClient) => c.deadline && new Date(c.deadline) < new Date(new Date().toDateString()) && !["paid", "delivered"].includes(c.status)
  )

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Freelance</h1>
          <p className="text-sm text-muted-foreground">Clients, deadlines, and what you're owed</p>
        </div>
        <ClientForm />
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Active projects", value: active.length },
          { label: "Unpaid", value: `₹${unpaidTotal.toLocaleString("en-IN")}` },
          { label: "This month", value: `₹${thisMonthIncome.toLocaleString("en-IN")}` },
          { label: "Overdue", value: overdueDeadlines.length, warn: overdueDeadlines.length > 0 },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border bg-card p-4 ${s.warn ? "border-red-500/30" : "border-border"}`}>
            <div className={`text-2xl font-bold ${s.warn ? "text-red-500" : ""}`}>{s.value}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      <ClientList clients={clients ?? []} />
    </div>
  )
}

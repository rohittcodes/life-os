"use client"

import { useTransition } from "react"
import { updateClientStatus, markPaid } from "@/app/(app)/freelance/actions"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertTriangle } from "lucide-react"
import type { FreelanceClient, FreelanceStatus } from "@/lib/types"

const statusColors: Record<FreelanceStatus, string> = {
  negotiating: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  active: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  delivered: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  paid: "bg-green-500/10 text-green-600 dark:text-green-400",
  on_hold: "bg-muted text-muted-foreground",
}

const statuses: FreelanceStatus[] = ["negotiating", "active", "delivered", "paid", "on_hold"]

function isOverdue(deadline: string | null) {
  if (!deadline) return false
  return new Date(deadline) < new Date(new Date().toDateString())
}

export function ClientList({ clients }: { clients: FreelanceClient[] }) {
  const [, startTransition] = useTransition()

  if (clients.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
        No clients yet — add your first project
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {clients.map((client) => (
        <div key={client.id} className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium">{client.client_name}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[client.status as FreelanceStatus]}`}>
                  {client.status.replace("_", " ")}
                </span>
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground truncate">{client.project}</p>
              {client.deadline && (
                <p className={`mt-1 flex items-center gap-1 text-xs ${isOverdue(client.deadline) ? "text-red-500" : "text-muted-foreground"}`}>
                  {isOverdue(client.deadline) && <AlertTriangle className="h-3 w-3" />}
                  {isOverdue(client.deadline) ? "Overdue · " : "Due "}
                  {new Date(client.deadline).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              )}
            </div>
            <div className="text-right shrink-0">
              {client.amount_agreed && (
                <div className="text-sm font-medium">₹{client.amount_agreed.toLocaleString("en-IN")}</div>
              )}
              {client.amount_paid !== null && client.amount_paid > 0 && (
                <div className="text-xs text-muted-foreground">
                  ₹{client.amount_paid.toLocaleString("en-IN")} paid
                </div>
              )}
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Select
              value={client.status}
              onValueChange={(v) => startTransition(() => updateClientStatus(client.id, v))}
            >
              <SelectTrigger className="h-7 w-36 text-xs">
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
            {client.status !== "paid" && client.amount_agreed && (
              <button
                onClick={() => startTransition(() => markPaid(client.id, client.amount_agreed ?? 0))}
                className="rounded border border-green-500/30 bg-green-500/10 px-2 py-1 text-xs text-green-600 dark:text-green-400 hover:bg-green-500/20 transition-colors"
              >
                Mark paid
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

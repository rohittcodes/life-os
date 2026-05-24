"use client"

import { useTransition } from "react"
import { toggleSubscription, deleteSubscription } from "@/app/(app)/contacts/actions"
import type { Subscription } from "@/lib/types"

const catEmoji: Record<string, string> = {
  streaming: "📺", productivity: "⚡", cloud: "☁️", learning: "📚", health: "💪", finance: "💰", misc: "📦"
}

function toMonthly(sub: Subscription): number {
  if (sub.billing_cycle === "yearly") return sub.amount / 12
  if (sub.billing_cycle === "quarterly") return sub.amount / 3
  if (sub.billing_cycle === "weekly") return sub.amount * 4
  return sub.amount
}

function isDueSoon(date: string | null): boolean {
  if (!date) return false
  return new Date(date).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000
}

export function SubscriptionsList({ subscriptions }: { subscriptions: Subscription[] }) {
  const [, startTransition] = useTransition()

  if (subscriptions.length === 0) {
    return <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">No subscriptions tracked</div>
  }

  const active = subscriptions.filter((s) => s.active)
  const paused = subscriptions.filter((s) => !s.active)

  return (
    <div className="space-y-2">
      {active.map((sub) => (
        <div key={sub.id} className="group flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
          <span className="text-xl">{catEmoji[sub.category] ?? "📦"}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{sub.name}</span>
              {sub.next_billing_date && isDueSoon(sub.next_billing_date) && (
                <span className="text-xs text-orange-500">Due soon</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              ₹{sub.amount.toLocaleString("en-IN")} / {sub.billing_cycle}
              <span className="ml-2 opacity-60">≈ ₹{Math.round(toMonthly(sub)).toLocaleString("en-IN")}/mo</span>
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => startTransition(() => toggleSubscription(sub.id, false))} className="rounded-lg border border-border px-2 py-0.5 text-xs hover:bg-muted transition-colors">Pause</button>
            <button onClick={() => startTransition(() => deleteSubscription(sub.id))} className="text-muted-foreground hover:text-destructive text-xs">✕</button>
          </div>
        </div>
      ))}
      {paused.map((sub) => (
        <div key={sub.id} className="group flex items-center gap-3 rounded-xl border border-border/50 bg-card/50 px-4 py-3 opacity-50">
          <span className="text-xl">{catEmoji[sub.category] ?? "📦"}</span>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium">{sub.name}</span>
            <p className="text-xs text-muted-foreground">₹{sub.amount.toLocaleString("en-IN")} / {sub.billing_cycle} — paused</p>
          </div>
          <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => startTransition(() => toggleSubscription(sub.id, true))} className="rounded-lg border border-border px-2 py-0.5 text-xs hover:bg-muted transition-colors">Resume</button>
            <button onClick={() => startTransition(() => deleteSubscription(sub.id))} className="text-muted-foreground hover:text-destructive text-xs">✕</button>
          </div>
        </div>
      ))}
    </div>
  )
}

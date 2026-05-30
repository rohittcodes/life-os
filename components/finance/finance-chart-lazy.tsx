"use client"

import dynamic from "next/dynamic"
import type { FinanceEntry } from "@/lib/types"

const FinanceChartInner = dynamic(
  () => import("./finance-chart").then((m) => ({ default: m.FinanceChart })),
  { ssr: false, loading: () => <div className="h-48 w-full animate-pulse rounded-xl bg-muted" /> }
)

export function FinanceChart({ entries, currency }: { entries: FinanceEntry[]; currency?: string }) {
  return <FinanceChartInner entries={entries} currency={currency} />
}

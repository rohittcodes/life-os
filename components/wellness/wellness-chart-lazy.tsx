"use client"

import dynamic from "next/dynamic"
import type { WellnessLog } from "@/lib/types"

const WellnessChartInner = dynamic(
  () => import("./wellness-chart").then((m) => ({ default: m.WellnessChart })),
  { ssr: false, loading: () => <div className="h-48 w-full animate-pulse rounded-xl bg-muted" /> }
)

export function WellnessChart({ logs }: { logs: WellnessLog[] }) {
  return <WellnessChartInner logs={logs} />
}

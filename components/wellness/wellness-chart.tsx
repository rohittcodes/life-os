"use client"

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import type { WellnessLog } from "@/lib/types"

interface Props { logs: WellnessLog[] }

const moodEnergyConfig = {
  mood: { label: "Mood", color: "hsl(var(--chart-1))" },
  energy: { label: "Energy", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig

const sleepWaterConfig = {
  sleep: { label: "Sleep (h)", color: "hsl(var(--chart-3))" },
  water: { label: "Water (glasses)", color: "hsl(var(--chart-4))" },
} satisfies ChartConfig

export function WellnessChart({ logs }: Props) {
  const data = [...logs]
    .sort((a, b) => a.log_date.localeCompare(b.log_date))
    .slice(-14)
    .map((log) => ({
      label: new Date(log.log_date + "T12:00:00").toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      }),
      mood: log.mood,
      energy: log.energy,
      sleep: log.sleep_hours,
      water: log.water_glasses,
    }))

  if (data.length < 2) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground text-center py-8">
          Log at least 2 days to see trends
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-medium mb-1">Mood & Energy</h3>
        <p className="text-xs text-muted-foreground mb-4">Last 14 days · scale 1–5</p>
        <ChartContainer config={moodEnergyConfig} className="h-56 w-full">
          <AreaChart data={data} margin={{ left: 0, right: 0, top: 4 }}>
            <defs>
              <linearGradient id="fillMood" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-mood)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--color-mood)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="fillEnergy" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-energy)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--color-energy)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
            <YAxis
              domain={[1, 5]}
              ticks={[1, 2, 3, 4, 5]}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
              width={24}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Area
              type="monotone"
              dataKey="mood"
              stroke="var(--color-mood)"
              fill="url(#fillMood)"
              strokeWidth={2}
              dot={{ r: 3, fill: "var(--color-mood)" }}
              connectNulls
            />
            <Area
              type="monotone"
              dataKey="energy"
              stroke="var(--color-energy)"
              fill="url(#fillEnergy)"
              strokeWidth={2}
              dot={{ r: 3, fill: "var(--color-energy)" }}
              connectNulls
            />
          </AreaChart>
        </ChartContainer>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-medium mb-1">Sleep & Water</h3>
        <p className="text-xs text-muted-foreground mb-4">Last 14 days</p>
        <ChartContainer config={sleepWaterConfig} className="h-56 w-full">
          <AreaChart data={data} margin={{ left: 0, right: 0, top: 4 }}>
            <defs>
              <linearGradient id="fillSleep" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-sleep)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--color-sleep)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="fillWater" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-water)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--color-water)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} width={24} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Area
              type="monotone"
              dataKey="sleep"
              stroke="var(--color-sleep)"
              fill="url(#fillSleep)"
              strokeWidth={2}
              dot={{ r: 3, fill: "var(--color-sleep)" }}
              connectNulls
            />
            <Area
              type="monotone"
              dataKey="water"
              stroke="var(--color-water)"
              fill="url(#fillWater)"
              strokeWidth={2}
              dot={{ r: 3, fill: "var(--color-water)" }}
              connectNulls
            />
          </AreaChart>
        </ChartContainer>
      </div>
    </div>
  )
}

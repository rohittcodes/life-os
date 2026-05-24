"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell } from "recharts"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import type { TimeEntry, Project } from "@/lib/types"

interface Props {
  entries: TimeEntry[]
  projects: Project[]
}

const chartConfig = {
  hours: { label: "Hours", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
]

export function TimeChart({ entries, projects }: Props) {
  const projectMap = new Map(projects.map((p) => [p.id, p]))

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toISOString().split("T")[0]
  })

  const dailyData = days.map((date) => {
    const dayEntries = entries.filter((e) => e.started_at.startsWith(date) && e.duration_minutes)
    const total = dayEntries.reduce((s, e) => s + (e.duration_minutes ?? 0), 0)
    const label = new Date(date + "T12:00:00").toLocaleDateString("en-IN", { weekday: "short" })
    return { date, label, hours: +(total / 60).toFixed(1) }
  })

  const byProject = new Map<string, number>()
  entries.forEach((e) => {
    if (!e.duration_minutes) return
    const key = e.project_id ? (projectMap.get(e.project_id)?.name ?? "Unknown") : "No project"
    byProject.set(key, (byProject.get(key) ?? 0) + e.duration_minutes)
  })

  const projectData = Array.from(byProject.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, mins]) => ({ name, hours: +(mins / 60).toFixed(1) }))

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-medium mb-1">Daily focus hours</h3>
        <p className="text-xs text-muted-foreground mb-4">Last 7 days</p>
        <ChartContainer config={chartConfig} className="h-52 w-full">
          <BarChart data={dailyData} margin={{ left: 0, right: 0, top: 4 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => `${v}h`}
              width={32}
            />
            <ChartTooltip
              content={<ChartTooltipContent formatter={(v) => [`${v}h`, "Hours"]} />}
            />
            <Bar dataKey="hours" fill="var(--color-hours)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </div>

      {projectData.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-medium mb-1">Hours by project</h3>
          <p className="text-xs text-muted-foreground mb-4">Last 7 days breakdown</p>
          <ChartContainer config={chartConfig} className="h-52 w-full">
            <BarChart
              data={projectData}
              layout="vertical"
              margin={{ left: 0, right: 16, top: 4 }}
            >
              <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                type="number"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `${v}h`}
              />
              <YAxis
                dataKey="name"
                type="category"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11 }}
                width={100}
              />
              <ChartTooltip
                content={<ChartTooltipContent formatter={(v) => [`${v}h`, "Hours"]} />}
              />
              <Bar dataKey="hours" radius={[0, 4, 4, 0]}>
                {projectData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </div>
      )}
    </div>
  )
}

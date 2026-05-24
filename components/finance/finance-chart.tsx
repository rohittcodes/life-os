"use client"

import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import type { FinanceEntry } from "@/lib/types"

interface Props { entries: FinanceEntry[] }

const chartConfig = {
  income: { label: "Income", color: "hsl(var(--chart-1))" },
  expense: { label: "Expense", color: "hsl(var(--chart-2))" },
  net: { label: "Net Savings", color: "hsl(var(--chart-3))" },
} satisfies ChartConfig

export function FinanceChart({ entries }: Props) {
  const now = new Date()
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleString("default", { month: "short" }),
    }
  })

  const monthlyData = months.map(({ key, label }) => {
    const monthEntries = entries.filter((e) => e.entry_date.startsWith(key))
    const income = monthEntries.filter((e) => e.type === "income").reduce((s, e) => s + e.amount, 0)
    const expense = monthEntries.filter((e) => e.type === "expense").reduce((s, e) => s + e.amount, 0)
    return { label, income, expense, net: income - expense }
  })

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-medium mb-1">Income vs Expenses</h3>
        <p className="text-xs text-muted-foreground mb-4">Last 6 months</p>
        <ChartContainer config={chartConfig} className="h-64 w-full">
          <AreaChart data={monthlyData} margin={{ left: 0, right: 0, top: 4 }}>
            <defs>
              <linearGradient id="fillIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-income)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--color-income)" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="fillExpense" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-expense)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--color-expense)" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
              width={48}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => `₹${Number(value).toLocaleString("en-IN")}`}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Area
              type="monotone"
              dataKey="income"
              stroke="var(--color-income)"
              fill="url(#fillIncome)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="expense"
              stroke="var(--color-expense)"
              fill="url(#fillExpense)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-medium mb-1">Net Savings</h3>
        <p className="text-xs text-muted-foreground mb-4">Monthly surplus / deficit</p>
        <ChartContainer config={chartConfig} className="h-52 w-full">
          <BarChart data={monthlyData} margin={{ left: 0, right: 0, top: 4 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
              width={48}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => `₹${Number(value).toLocaleString("en-IN")}`}
                />
              }
            />
            <Bar dataKey="net" fill="var(--color-net)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </div>
    </div>
  )
}

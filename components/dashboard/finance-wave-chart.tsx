"use client"

import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from "recharts"
import { motion } from "motion/react"
import { TrendingUp } from "lucide-react"

interface DayFinance {
  label: string
  income: number
  expense: number
}

interface Props {
  data: DayFinance[]
  monthIncome: number
  monthExpense: number
}

export function FinanceWaveChart({ data, monthIncome, monthExpense }: Props) {
  const net = monthIncome - monthExpense
  const isPositive = net >= 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.25 }}
      className="rounded-xl border border-border bg-card p-5"
    >
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium">This month</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Income vs expenses</p>
        </div>
        <div className="flex items-center gap-1.5">
          <TrendingUp className={`h-3.5 w-3.5 ${isPositive ? "text-green-500" : "text-red-500"}`} />
          <span className={`text-sm font-semibold ${isPositive ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
            {isPositive ? "+" : "−"}₹{Math.abs(net / 1000).toFixed(0)}k
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={100}>
        <AreaChart data={data} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="grad-income" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="grad-expense" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="label" hide />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null
              return (
                <div className="rounded-lg border border-border bg-popover px-2.5 py-1.5 text-xs shadow-md">
                  <p className="mb-1 font-medium">{label}</p>
                  <p className="text-green-600 dark:text-green-400">+₹{(payload[0]?.value as number ?? 0).toLocaleString("en-IN")}</p>
                  <p className="text-orange-500">−₹{(payload[1]?.value as number ?? 0).toLocaleString("en-IN")}</p>
                </div>
              )
            }}
          />
          <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={1.5} fill="url(#grad-income)" dot={false} animationDuration={800} />
          <Area type="monotone" dataKey="expense" stroke="#f97316" strokeWidth={1.5} fill="url(#grad-expense)" dot={false} animationDuration={1000} />
        </AreaChart>
      </ResponsiveContainer>

      <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" />Income ₹{(monthIncome / 1000).toFixed(0)}k</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-orange-400" />Expenses ₹{(monthExpense / 1000).toFixed(0)}k</span>
      </div>
    </motion.div>
  )
}

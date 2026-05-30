"use client"

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, Tooltip,
} from "recharts"
import { motion } from "motion/react"
import { Dumbbell, BookOpen, Leaf, Flame } from "lucide-react"
import { cn } from "@/lib/utils"

interface DayData {
  label: string
  gym: number
  english: number
  diet: number
  total: number   // 0-3
}

interface HabitStreak {
  gym: number
  english: number
  diet: number
}

interface Props {
  weekData: DayData[]
  streaks: HabitStreak
}

const habits = [
  { key: "gym" as const,     label: "Gym",     icon: Dumbbell, color: "#3b82f6" },
  { key: "english" as const, label: "English", icon: BookOpen, color: "#8b5cf6" },
  { key: "diet" as const,    label: "Diet",    icon: Leaf,     color: "#10b981" },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload as DayData
  return (
    <div className="rounded-xl border border-border bg-popover px-3 py-2 text-xs shadow-lg">
      <p className="mb-1.5 font-medium">{label}</p>
      {habits.map((h) => (
        <div key={h.key} className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: h.color }} />
          <span className="text-muted-foreground">{h.label}</span>
          <span className="ml-auto font-medium">{d[h.key] ? "✓" : "—"}</span>
        </div>
      ))}
    </div>
  )
}

export function WeekActivityChart({ weekData, streaks }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15 }}
      className="rounded-xl border border-border bg-card p-5"
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium">7-day habits</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Daily completion this week</p>
        </div>
        {/* Per-habit streaks */}
        <div className="flex items-center gap-3">
          {habits.map((h) => {
            const s = streaks[h.key]
            const Icon = h.icon
            return (
              <div key={h.key} className="flex flex-col items-center gap-0.5">
                <div className="flex items-center gap-0.5">
                  <Icon className="h-3 w-3" style={{ color: h.color }} />
                  {s > 0 && <Flame className="h-2.5 w-2.5 text-orange-400" />}
                </div>
                <span className="text-[11px] font-semibold tabular-nums" style={{ color: s > 0 ? h.color : undefined }}>
                  {s > 0 ? `${s}d` : "—"}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Area chart */}
      <ResponsiveContainer width="100%" height={140}>
        <AreaChart data={weekData} margin={{ left: -24, right: 0, top: 4, bottom: 0 }}>
          <defs>
            {habits.map((h) => (
              <linearGradient key={h.key} id={`grad-${h.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={h.color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={h.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
          <YAxis hide domain={[0, 1]} />
          <Tooltip content={<CustomTooltip />} />
          {habits.map((h) => (
            <Area
              key={h.key}
              type="monotone"
              dataKey={h.key}
              stroke={h.color}
              strokeWidth={2}
              fill={`url(#grad-${h.key})`}
              dot={{ fill: h.color, r: 3, strokeWidth: 0 }}
              activeDot={{ r: 4, strokeWidth: 0 }}
              isAnimationActive
              animationDuration={800}
              animationEasing="ease-out"
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="mt-3 flex items-center gap-4">
        {habits.map((h) => (
          <div key={h.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: h.color }} />
            {h.label}
          </div>
        ))}
      </div>
    </motion.div>
  )
}
